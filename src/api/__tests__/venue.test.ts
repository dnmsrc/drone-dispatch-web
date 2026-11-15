// ─────────────────────────────────────────────────────────────
// 场地接口适配层单测（src/api/venue.ts 的 toVenueRow / toWritePayload / toCreatePayload）
//
// 重点锁定后端 DTO → 前端 VenueRow 的契约差异，防止后端字段口径变更时静默出错：
//   - id：number → string
//   - enabled：1/0 → true/false
//   - lng/lat：null / 非有限值 → 0 兜底，保证页面 toFixed 不炸
//   - 审计字段不外泄到 VenueRow
// 以及写接口提交体 VenueForm → VenueWritePayload（POST 新增 / PUT 编辑共用）的口径：
//   - 下发 name/address/lng/lat/enabled 五字段，启用开关随表单真实提交
//     （后端写 DTO 已接收 enabled，boolean 由后端转 TINYINT 1/0 落库）
//   - 经纬度强制 Number 归一
// getVenues/createVenue/updateVenue/deleteVenue 依赖 axios 实例与网络，
// 不在此单测覆盖（由后端 curl 联调与页面级冒烟验证）。
// ─────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { toCreatePayload, toVenueRow, toWritePayload, type VenueDto } from '../venue'
import type { VenueForm } from '@/views/venue/types'

/** 构造一个字段齐全的后端 DTO，单项用例再按需覆盖 */
function baseDto(overrides: Partial<VenueDto> = {}): VenueDto {
  return {
    id: 7,
    name: '未来科技城中央公园',
    address: '杭州市余杭区文一西路 998 号',
    lng: 119.998,
    lat: 30.279,
    enabled: 1,
    createdAt: '2026-11-14T13:41:45.371',
    updatedAt: '2026-11-14T13:41:45.371',
    deleted: 0,
    deletedAt: null,
    ...overrides,
  }
}

describe('toVenueRow · 后端 Venue DTO 适配', () => {
  it('完整字段：id 转字符串、enabled=1 转 true，坐标原样保留', () => {
    const row = toVenueRow(baseDto())
    expect(row).toEqual({
      id: '7',
      name: '未来科技城中央公园',
      address: '杭州市余杭区文一西路 998 号',
      lng: 119.998,
      lat: 30.279,
      enabled: true,
    })
  })

  it('enabled=0 映射为 false（停用态，列表接口会返回停用项，页面据此渲染停用标签）', () => {
    const row = toVenueRow(baseDto({ enabled: 0 }))
    expect(row.enabled).toBe(false)
  })

  it('自增数字 id 安全转为字符串（场地表为自增主键，实际值远小于 MAX_SAFE_INTEGER）', () => {
    const row = toVenueRow(baseDto({ id: 123456 }))
    expect(row.id).toBe('123456')
    expect(typeof row.id).toBe('string')
  })

  it('id 为 0 等边界值时仍稳定转字符串，不出现 undefined', () => {
    const row = toVenueRow(baseDto({ id: 0 }))
    expect(row.id).toBe('0')
  })

  it('经纬度为 null 时兜底为 0，不向页面透出 null', () => {
    const row = toVenueRow(baseDto({ lng: null, lat: null }))
    expect(row.lng).toBe(0)
    expect(row.lat).toBe(0)
  })

  it('经纬度为非法数值（NaN 风险）时兜底为 0', () => {
    // 后端正常不会给 NaN，这里防御 JSON 异常/脏数据
    const row = toVenueRow(baseDto({ lng: Number.NaN, lat: Number.NaN }))
    expect(row.lng).toBe(0)
    expect(row.lat).toBe(0)
  })

  it('适配结果只含 VenueRow 六个字段，不泄漏审计/软删字段', () => {
    const row = toVenueRow(baseDto())
    expect(Object.keys(row).sort()).toEqual(
      ['address', 'enabled', 'id', 'lat', 'lng', 'name'].sort(),
    )
    expect(row).not.toHaveProperty('createdAt')
    expect(row).not.toHaveProperty('deleted')
    expect(row).not.toHaveProperty('deletedAt')
  })

  it('保留六位小数坐标精度，不做截断或四舍五入', () => {
    const row = toVenueRow(baseDto({ lng: 120.162727, lat: 30.19002 }))
    expect(row.lng).toBe(120.162727)
    expect(row.lat).toBe(30.19002)
  })
})

describe('toCreatePayload · 新增表单 → 后端请求体适配', () => {
  /** 构造一个字段齐全的弹窗表单 */
  function baseForm(overrides: Partial<VenueForm> = {}): VenueForm {
    return {
      name: '联调测试场地',
      address: '杭州市滨江区联调路 88 号',
      lng: 120.162727,
      lat: 30.19002,
      enabled: true,
      ...overrides,
    }
  }

  it('正常表单：五字段原样透出，enabled=true 随表单下发，保留六位小数坐标', () => {
    const payload = toCreatePayload(baseForm())
    expect(payload).toEqual({
      name: '联调测试场地',
      address: '杭州市滨江区联调路 88 号',
      lng: 120.162727,
      lat: 30.19002,
      enabled: true,
    })
  })

  it('请求体含 name/address/lng/lat/enabled 五个键，开关关闭时 enabled=false 真实下发', () => {
    const payload = toCreatePayload(baseForm({ enabled: false }))
    expect(Object.keys(payload).sort()).toEqual(['address', 'enabled', 'lat', 'lng', 'name'].sort())
    expect(payload.enabled).toBe(false)
    // 弹窗里关闭启用开关，必须如实提交给后端（后端据此落库停用态）
    expect(payload.lng).toBe(120.162727)
  })

  it('经纬度强制 Number 归一：数字字符串也能转成 number', () => {
    const payload = toCreatePayload(
      baseForm({ lng: '120.162727' as unknown as number, lat: '30.19002' as unknown as number }),
    )
    expect(payload.lng).toBe(120.162727)
    expect(payload.lat).toBe(30.19002)
    expect(typeof payload.lng).toBe('number')
    expect(typeof payload.lat).toBe('number')
  })

  it('name/address 原样保留（trim 已在弹窗 confirm 前完成，适配层不二次处理）', () => {
    const payload = toCreatePayload(baseForm({ name: '  带空格名称  ' }))
    expect(payload.name).toBe('  带空格名称  ')
  })

  it('详细地址选填：空串原样透出，不报错也不伪造占位（空串由后端归一落库）', () => {
    const payload = toCreatePayload(baseForm({ address: '' }))
    expect(payload.address).toBe('')
    // 名称与经纬度仍完整
    expect(payload.name).toBe('联调测试场地')
    expect(payload.lng).toBe(120.162727)
    expect(payload.lat).toBe(30.19002)
  })
})

describe('toWritePayload · 编辑/新增写接口共用适配（PUT 与 POST 同构）', () => {
  function baseForm(overrides: Partial<VenueForm> = {}): VenueForm {
    return {
      name: '编辑联调场地',
      address: '杭州市西湖区文三路 100 号',
      lng: 120.13,
      lat: 30.28,
      enabled: true,
      ...overrides,
    }
  }

  it('编辑表单：透出含 enabled 的五字段，开关关闭时 enabled=false 真实下发（后端 PUT 接收启用态）', () => {
    const payload = toWritePayload(baseForm({ enabled: false }))
    expect(Object.keys(payload).sort()).toEqual(['address', 'enabled', 'lat', 'lng', 'name'].sort())
    expect(payload.enabled).toBe(false)
  })

  it('启用开关的 true/false 如实反映到请求体：后端据此切换启用状态', () => {
    const enabled = toWritePayload(baseForm({ enabled: true }))
    const disabled = toWritePayload(baseForm({ enabled: false }))
    expect(enabled.enabled).toBe(true)
    expect(disabled.enabled).toBe(false)
    // 除 enabled 外其余字段保持一致，差异只来自开关
    expect({ ...enabled, enabled: undefined }).toEqual({ ...disabled, enabled: undefined })
  })

  it('经纬度强制 Number 归一，与新增口径完全一致', () => {
    const payload = toWritePayload(
      baseForm({ lng: '120.13' as unknown as number, lat: '30.28' as unknown as number }),
    )
    expect(payload.lng).toBe(120.13)
    expect(payload.lat).toBe(30.28)
    expect(typeof payload.lng).toBe('number')
    expect(typeof payload.lat).toBe('number')
  })

  it('toCreatePayload 与 toWritePayload 输出同构（新增/编辑共用一套适配，避免两处分叉）', () => {
    const form = baseForm({ address: '' })
    expect(toCreatePayload(form)).toEqual(toWritePayload(form))
  })
})
