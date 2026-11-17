// ─────────────────────────────────────────────────────────────
// 计价接口适配层单测（src/api/pricing.ts 的纯转换函数）
//
// 重点锁定后端通用行 VO（itemKey/itemLabel/itemValue/extra + 单数分组名）
// 与前端领域视图类型（drones/price/desc 等 + 复数分组）之间的契约，防止字段口径变更静默出错：
//   - 分组名：tier/duration/addon/pattern/refund ↔ tiers/durations/addons/patterns/refundRules
//   - 通用行按分组映射到领域字段（见各 toXxxRow）
//   - id number → string；itemValue DECIMAL（可空）→ number，空值兜底 0
//   - status 仅 0 为停用，其余（含异常值）按启用 1 兜底
//   - 分组总闸 enabled：仅明确 false 为关，字段缺失（老版本后端）fail-open 按全开兜底
//   - 反向请求体只带当前分组会编辑的键，未编辑字段不下发（后端按 null 保留原值）
// 网络类函数（getPricingRules / updateGroupSwitch 等）依赖 axios，不在此覆盖（由后端 curl 联调与页面冒烟验证）。
// ─────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  toAddonRow,
  toBackendGroup,
  toCustomPricing,
  toDurationRow,
  toGroupEnabled,
  toGroupRows,
  toPatternRow,
  toRefundRow,
  toRuleUpdatePayload,
  toTierRow,
  toViewGroup,
  type PricingGroupDto,
  type PricingRuleDto,
} from '../pricing'

/** 字段齐全的后端通用行 DTO（默认架次档位形态） */
function baseRuleDto(overrides: Partial<PricingRuleDto> = {}): PricingRuleDto {
  return {
    id: 101,
    groupCode: 'tier',
    itemKey: '100',
    itemLabel: '100 架',
    itemValue: 18800,
    extra: '适合小型告白',
    sort: 1,
    status: 1,
    ...overrides,
  }
}

describe('toTierRow · 架次档位适配', () => {
  it('完整字段：itemKey→drones、itemValue→price、extra→desc，id 转字符串', () => {
    expect(toTierRow(baseRuleDto())).toEqual({
      id: '101',
      drones: 100,
      price: 18800,
      desc: '适合小型告白',
      sort: 1,
      status: 1,
    })
  })

  it('itemLabel 不进入编辑模型（tier 的说明走 extra，不透出 label）', () => {
    const row = toTierRow(baseRuleDto())
    expect(row).not.toHaveProperty('label')
    expect(row).not.toHaveProperty('itemLabel')
  })

  it('itemValue 为 null 时价格兜底 0，itemKey 非数字时架次兜底 0', () => {
    const row = toTierRow(baseRuleDto({ itemValue: null, itemKey: 'bad' }))
    expect(row.price).toBe(0)
    expect(row.drones).toBe(0)
  })

  it('extra 为 null/undefined 时归一空串，保证表格 tooltip 不炸', () => {
    expect(toTierRow(baseRuleDto({ extra: null as unknown as string })).desc).toBe('')
  })
})

describe('toDurationRow · 表演时长适配', () => {
  it('完整字段：itemKey→minutes、itemValue→extra、itemLabel→label', () => {
    const dto = baseRuleDto({
      groupCode: 'duration',
      itemKey: '15',
      itemLabel: '15 分钟',
      itemValue: 6000,
      extra: '',
    })
    expect(toDurationRow(dto)).toEqual({
      id: '101',
      minutes: 15,
      extra: 6000,
      label: '15 分钟',
      sort: 1,
      status: 1,
    })
  })

  it('标准档加价为 0 时原样保留（页面据此显示「含在基础价内」）', () => {
    const row = toDurationRow(baseRuleDto({ groupCode: 'duration', itemKey: '10', itemValue: 0 }))
    expect(row.extra).toBe(0)
  })
})

describe('toAddonRow · 附加服务适配', () => {
  it('完整字段：itemKey→key、itemLabel→label、itemValue→price', () => {
    const dto = baseRuleDto({
      groupCode: 'addon',
      itemKey: 'music',
      itemLabel: '专属音乐编曲',
      itemValue: 1000,
      extra: '',
    })
    expect(toAddonRow(dto)).toEqual({
      id: '101',
      key: 'music',
      label: '专属音乐编曲',
      price: 1000,
      sort: 1,
      status: 1,
    })
  })

  it('itemValue 为 null 时加价兜底 0', () => {
    expect(toAddonRow(baseRuleDto({ groupCode: 'addon', itemValue: null })).price).toBe(0)
  })
})

describe('toPatternRow · 预设图案适配（不带价）', () => {
  it('只映射 key/label，结果不含任何价格字段', () => {
    const dto = baseRuleDto({
      groupCode: 'pattern',
      itemKey: 'heart',
      itemLabel: '爱心',
      itemValue: 0,
      extra: '',
    })
    const row = toPatternRow(dto)
    expect(row).toEqual({ id: '101', key: 'heart', label: '爱心', sort: 1, status: 1 })
    expect(row).not.toHaveProperty('price')
    expect(row).not.toHaveProperty('itemValue')
  })
})

describe('toRefundRow · 退款阶梯适配', () => {
  it('完整字段：itemKey→minHours、itemValue→ratio、itemLabel→label，比例小数原样保留', () => {
    const dto = baseRuleDto({
      groupCode: 'refund',
      itemKey: '168',
      itemLabel: '距表演 7 天以上，退 90%',
      itemValue: 0.9,
      extra: '',
    })
    expect(toRefundRow(dto)).toEqual({
      id: '101',
      minHours: 168,
      ratio: 0.9,
      label: '距表演 7 天以上，退 90%',
      sort: 1,
      status: 1,
    })
  })

  it('不可退款档比例 0 原样保留（页面据此显示红色「不可退款」）', () => {
    const row = toRefundRow(
      baseRuleDto({ groupCode: 'refund', itemKey: '0', itemValue: 0, itemLabel: '不可退款' }),
    )
    expect(row.ratio).toBe(0)
    expect(row.minHours).toBe(0)
  })
})

describe('status 归一 · 仅明确 0 为停用', () => {
  it('status=0 映射为停用 0', () => {
    expect(toTierRow(baseRuleDto({ status: 0 })).status).toBe(0)
  })

  it('status=1 保留启用', () => {
    expect(toTierRow(baseRuleDto({ status: 1 })).status).toBe(1)
  })

  it('异常值（2/undefined）按启用 1 兜底，不向页面透出非法状态', () => {
    expect(toTierRow(baseRuleDto({ status: 2 })).status).toBe(1)
    expect(toTierRow(baseRuleDto({ status: undefined as unknown as number })).status).toBe(1)
  })
})

describe('toGroupRows · 按后端 groupCode 分发适配', () => {
  it('tier 组逐项走 toTierRow，保持顺序', () => {
    const rows = toGroupRows('tier', [
      baseRuleDto({ id: 1, itemKey: '100' }),
      baseRuleDto({ id: 2, itemKey: '200' }),
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ id: '1', drones: 100 })
    expect(rows[1]).toMatchObject({ id: '2', drones: 200 })
  })

  it('未知分组返回空数组（聚合层据此忽略，不抛错）', () => {
    expect(toGroupRows('unknown', [baseRuleDto()])).toEqual([])
  })

  it('items 为 null/undefined 时兜底空数组', () => {
    expect(toGroupRows('tier', null as unknown as PricingRuleDto[])).toEqual([])
  })
})

describe('toCustomPricing · 定制收费适配', () => {
  it('完整字段原样映射', () => {
    expect(toCustomPricing({ customTextPrice: 2000, customLogoPrice: 5000 })).toEqual({
      customTextPrice: 2000,
      customLogoPrice: 5000,
    })
  })

  it('null/undefined 入参与字段空值均兜底 0，不向页面透出 null', () => {
    expect(toCustomPricing(null)).toEqual({ customTextPrice: 0, customLogoPrice: 0 })
    expect(toCustomPricing({ customTextPrice: null, customLogoPrice: null })).toEqual({
      customTextPrice: 0,
      customLogoPrice: 0,
    })
  })
})

describe('toRuleUpdatePayload · 视图编辑模型 → 后端请求体', () => {
  it('启停场景：只带 status，布尔归一为 1/0', () => {
    expect(toRuleUpdatePayload('tiers', { status: false })).toEqual({ status: 0 })
    expect(toRuleUpdatePayload('addons', { status: true })).toEqual({ status: 1 })
  })

  it('tier 编辑：drones→itemKey(字符串)、price→itemValue、desc→extra，不带 itemLabel', () => {
    const payload = toRuleUpdatePayload('tiers', {
      drones: 200,
      price: 28800,
      desc: '适合婚礼',
      status: true,
    })
    expect(payload).toEqual({
      itemKey: '200',
      itemValue: 28800,
      extra: '适合婚礼',
      status: 1,
    })
    expect(payload).not.toHaveProperty('itemLabel')
  })

  it('duration 编辑：minutes→itemKey、label→itemLabel、extra(加价)→itemValue', () => {
    expect(
      toRuleUpdatePayload('durations', { minutes: 20, label: '20 分钟', extra: 12000 }),
    ).toEqual({ itemKey: '20', itemLabel: '20 分钟', itemValue: 12000 })
  })

  it('addon 编辑：key→itemKey、label→itemLabel、price→itemValue', () => {
    expect(toRuleUpdatePayload('addons', { key: 'music', label: '音乐', price: 1000 })).toEqual({
      itemKey: 'music',
      itemLabel: '音乐',
      itemValue: 1000,
    })
  })

  it('pattern 编辑：只带 itemKey/itemLabel，不带任何价格键', () => {
    const payload = toRuleUpdatePayload('patterns', { key: 'heart', label: '爱心' })
    expect(payload).toEqual({ itemKey: 'heart', itemLabel: '爱心' })
    expect(payload).not.toHaveProperty('itemValue')
  })

  it('refund 编辑：minHours→itemKey、ratio→itemValue、label→itemLabel', () => {
    expect(
      toRuleUpdatePayload('refundRules', { minHours: 72, ratio: 0.5, label: '退 50%' }),
    ).toEqual({ itemKey: '72', itemValue: 0.5, itemLabel: '退 50%' })
  })

  it('未编辑的字段不带键（后端按 null 保留原值，避免误清同源字段）', () => {
    // 只改 tier 价格：不应下发 itemKey/extra，后端保留原架次与场景
    const payload = toRuleUpdatePayload('tiers', { price: 999 })
    expect(payload).toEqual({ itemValue: 999 })
    expect(payload).not.toHaveProperty('itemKey')
    expect(payload).not.toHaveProperty('extra')
  })

  it('数字字符串经 Number 归一后，itemKey 仍转回字符串下发', () => {
    const payload = toRuleUpdatePayload('tiers', { drones: '300' as unknown as number })
    expect(payload.itemKey).toBe('300')
    expect(typeof payload.itemKey).toBe('string')
  })
})

describe('toGroupEnabled · 分组总闸适配', () => {
  /** 构造仅含 groupCode/enabled 的最小分组 DTO */
  function groupDto(groupCode: string, enabled?: boolean): PricingGroupDto {
    return { groupCode, enabled, items: [] }
  }

  it('各组 enabled 按后端单数分组名映射到前端复数分组', () => {
    const result = toGroupEnabled([
      groupDto('tier', true),
      groupDto('duration', false),
      groupDto('addon', true),
      groupDto('pattern', false),
      groupDto('refund', true),
    ])
    expect(result).toEqual({
      tiers: true,
      durations: false,
      addons: true,
      patterns: false,
      refundRules: true,
    })
  })

  it('enabled 字段缺失（老版本后端）时 fail-open 按全开兜底', () => {
    const result = toGroupEnabled([groupDto('tier'), groupDto('addon')])
    expect(result.tiers).toBe(true)
    expect(result.addons).toBe(true)
    // 后端未返回的分组也保持全开
    expect(result.patterns).toBe(true)
    expect(result.refundRules).toBe(true)
  })

  it('仅明确 false 为关；true、undefined 都按启用处理', () => {
    expect(toGroupEnabled([groupDto('tier', false)]).tiers).toBe(false)
    expect(toGroupEnabled([groupDto('tier', true)]).tiers).toBe(true)
    expect(toGroupEnabled([groupDto('tier', undefined)]).tiers).toBe(true)
  })

  it('null/undefined 入参与未知分组：返回全开骨架且不抛错', () => {
    const allOn = {
      tiers: true,
      durations: true,
      addons: true,
      patterns: true,
      refundRules: true,
    }
    expect(toGroupEnabled(null)).toEqual(allOn)
    expect(toGroupEnabled(undefined)).toEqual(allOn)
    expect(toGroupEnabled([groupDto('unknown', false)])).toEqual(allOn)
  })
})

describe('分组名双向映射', () => {
  it('toViewGroup：后端单数分组 → 前端复数分组，未知分组为 null', () => {
    expect(toViewGroup('tier')).toBe('tiers')
    expect(toViewGroup('duration')).toBe('durations')
    expect(toViewGroup('addon')).toBe('addons')
    expect(toViewGroup('pattern')).toBe('patterns')
    expect(toViewGroup('refund')).toBe('refundRules')
    expect(toViewGroup('nope')).toBeNull()
  })

  it('toBackendGroup：前端复数分组 → 后端 groupCode', () => {
    expect(toBackendGroup('tiers')).toBe('tier')
    expect(toBackendGroup('durations')).toBe('duration')
    expect(toBackendGroup('addons')).toBe('addon')
    expect(toBackendGroup('patterns')).toBe('pattern')
    expect(toBackendGroup('refundRules')).toBe('refund')
  })
})
