// ─────────────────────────────────────────────────────────────
// 字典接口适配层单测（src/api/dict.ts 的纯转换函数）
//
// 重点锁定后端 VO → 前端视图类型的契约差异，防止字段口径变更时静默出错：
//   - 改名：dictCode→type、dictName→name、itemKey→key、itemLabel→label
//   - systemFlag(1/0) → system(boolean)
//   - 字典项 id number → string
//   - itemValue DECIMAL（可能 null）→ number，空值兜底 0
//   - status 仅 0 为停用，其余（含异常值）按启用兜底
//   - 审计字段不外泄；详情的 items 数组逐项适配
// 网络类函数（getDictTypes 等）依赖 axios，不在此覆盖（由后端 curl 联调与页面冒烟验证）。
// ─────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  toDictDetail,
  toDictItem,
  toDictType,
  toItemPayload,
  toTypeCreatePayload,
  toTypeUpdatePayload,
  type DictItemDto,
  type DictTypeDetailDto,
  type DictTypeSummaryDto,
} from '../dict'
import type { DictItemForm, DictTypeForm } from '@/views/system/dict-types'

/** 字段齐全的字典项 DTO */
function baseItemDto(overrides: Partial<DictItemDto> = {}): DictItemDto {
  return {
    id: 101,
    itemKey: '100',
    itemLabel: '100 架',
    itemValue: 18800,
    extra: '适合小型告白',
    sort: 1,
    status: 1,
    ...overrides,
  }
}

/** 字段齐全的类型汇总 DTO */
function baseTypeDto(overrides: Partial<DictTypeSummaryDto> = {}): DictTypeSummaryDto {
  return {
    dictCode: 'drone_tier',
    dictName: '架次档位',
    remark: '下单可选规格',
    systemFlag: 1,
    sort: 1,
    itemCount: 5,
    enabledCount: 5,
    ...overrides,
  }
}

describe('toDictItem · 后端字典项 VO 适配', () => {
  it('完整字段：id 转字符串、key/label/value 改名映射，status=1 保留', () => {
    expect(toDictItem(baseItemDto())).toEqual({
      id: '101',
      key: '100',
      label: '100 架',
      value: 18800,
      extra: '适合小型告白',
      sort: 1,
      status: 1,
    })
  })

  it('status=0 映射为停用 0（停用态，页面据此渲染停用开关/标签）', () => {
    expect(toDictItem(baseItemDto({ status: 0 })).status).toBe(0)
  })

  it('itemValue 为 null 时兜底为 0，不向页面透出 null（保证 toFixed/百分比计算不炸）', () => {
    expect(toDictItem(baseItemDto({ itemValue: null })).value).toBe(0)
  })

  it('退款比例等小数值原样保留，不做截断', () => {
    const row = toDictItem(baseItemDto({ itemValue: 0.9 }))
    expect(row.value).toBe(0.9)
  })

  it('extra 为 null/undefined 时归一空串', () => {
    expect(toDictItem(baseItemDto({ extra: null as unknown as string })).extra).toBe('')
  })

  it('适配结果只含 DictItem 七个字段，不泄漏后端列名或审计字段', () => {
    const row = toDictItem(baseItemDto())
    expect(Object.keys(row).sort()).toEqual(
      ['extra', 'id', 'key', 'label', 'sort', 'status', 'value'].sort(),
    )
    expect(row).not.toHaveProperty('itemKey')
    expect(row).not.toHaveProperty('itemValue')
  })
})

describe('toDictType · 后端类型汇总 VO 适配', () => {
  it('完整字段：dictCode/dictName 改名，systemFlag=1 → system=true，sort 透传', () => {
    expect(toDictType(baseTypeDto())).toEqual({
      type: 'drone_tier',
      name: '架次档位',
      remark: '下单可选规格',
      system: true,
      sort: 1,
      itemCount: 5,
      enabledCount: 5,
    })
  })

  it('systemFlag=0 → system=false（自定义类型可整组删除）', () => {
    const t = toDictType(baseTypeDto({ dictCode: 'order_status', systemFlag: 0 }))
    expect(t.system).toBe(false)
    expect(t.type).toBe('order_status')
  })

  it('remark 为 null 时归一空串', () => {
    expect(toDictType(baseTypeDto({ remark: null as unknown as string })).remark).toBe('')
  })

  it('sort 缺失（旧数据/异常响应）时兜底为 0，不向页面透出 undefined', () => {
    const t = toDictType(baseTypeDto({ sort: undefined as unknown as number }))
    expect(t.sort).toBe(0)
  })
})

describe('toDictDetail · 类型详情（含字典项数组）适配', () => {
  it('汇总字段 + items 逐项适配，list 顺序保持', () => {
    const dto: DictTypeDetailDto = {
      ...baseTypeDto(),
      items: [
        baseItemDto({ id: 1, itemKey: '100', status: 1 }),
        baseItemDto({ id: 2, itemKey: '200', itemLabel: '200 架', status: 0 }),
      ],
    }
    const detail = toDictDetail(dto)
    expect(detail.type).toBe('drone_tier')
    expect(detail.system).toBe(true)
    expect(detail.list).toHaveLength(2)
    expect(detail.list[0]).toEqual({
      id: '1',
      key: '100',
      label: '100 架',
      value: 18800,
      extra: '适合小型告白',
      sort: 1,
      status: 1,
    })
    expect(detail.list[1].id).toBe('2')
    expect(detail.list[1].status).toBe(0)
  })

  it('items 为空数组时 list 也是空数组（新建自定义类型暂无字典项）', () => {
    const detail = toDictDetail({ ...baseTypeDto(), items: [] })
    expect(detail.list).toEqual([])
  })
})

describe('toTypeCreatePayload / toTypeUpdatePayload · 类型写请求体适配', () => {
  const form: DictTypeForm = { type: 'venue_type', name: '场地类型', remark: '备注', sort: 8 }

  it('新增：透出 dictCode/dictName/remark/sort 四字段，前端 type/name 改后端名', () => {
    expect(toTypeCreatePayload(form)).toEqual({
      dictCode: 'venue_type',
      dictName: '场地类型',
      remark: '备注',
      sort: 8,
    })
  })

  it('编辑：不含 dictCode（code 不可改，定位走 URL），含 dictName/remark/sort', () => {
    const payload = toTypeUpdatePayload(form)
    expect(Object.keys(payload).sort()).toEqual(['dictName', 'remark', 'sort'].sort())
    expect(payload).not.toHaveProperty('dictCode')
    expect(payload.dictName).toBe('场地类型')
    expect(payload.sort).toBe(8)
  })

  it('sort 为数字字符串时强制转 number（input-number 边界兜底）', () => {
    const payload = toTypeCreatePayload({ ...form, sort: '3' as unknown as number })
    expect(payload.sort).toBe(3)
    expect(typeof payload.sort).toBe('number')
  })
})

describe('toItemPayload · 字典项写请求体适配', () => {
  it('启用项：key/label/value 改后端名，status=1，数值强制 Number 归一', () => {
    const form: DictItemForm = {
      key: 'music',
      label: '专属音乐',
      value: 1000,
      extra: '',
      sort: 1,
      status: 1,
    }
    expect(toItemPayload(form)).toEqual({
      itemKey: 'music',
      itemLabel: '专属音乐',
      itemValue: 1000,
      extra: '',
      sort: 1,
      status: 1,
    })
  })

  it('停用项 status=0 如实下发；数字字符串也被转成 number', () => {
    const form: DictItemForm = {
      key: 'k',
      label: '标签',
      value: '12.5' as unknown as number,
      extra: 'x',
      sort: '2' as unknown as number,
      status: 0,
    }
    const payload = toItemPayload(form)
    expect(payload.status).toBe(0)
    expect(payload.itemValue).toBe(12.5)
    expect(payload.sort).toBe(2)
    expect(typeof payload.itemValue).toBe('number')
  })
})
