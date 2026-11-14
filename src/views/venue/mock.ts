// ─────────────────────────────────────────────────────────────
// 场地管理 · 静态数据源（内存 CRUD，刷新页面即回滚到种子）
//
// 种子逐字搬运 mock-server seed.js 的 VENUES（v1…v5，默认全启用）。
// 用可变数组 + 一组查询/改删函数模拟 /admin/venues 的改删，
// 口径对齐 server.js：
//   - 编辑按字段合并，未传项保持原值；删除按 id 定位，找不到抛错
// 接真接口进度：列表 GET、新增 POST 已切到 @/api/venue，本文件不再提供新增；
//   编辑/删除后端接口尚未落地，仍在此用内存 store 过渡（刷新即回滚到后端数据）。
// TODO(server): 后端补齐编辑/删除接口后移除本文件，页面统一走 @/api/venue。
// ─────────────────────────────────────────────────────────────
import type { VenueForm, VenueRow } from './types'

/** 预设场地种子（seed.js VENUES 逐条一致） */
const SEED_VENUES: VenueRow[] = [
  {
    id: 'v1',
    name: '滨江世纪广场',
    address: '杭州市滨江区江南大道 100 号',
    lng: 120.212,
    lat: 30.208,
    enabled: true,
  },
  {
    id: 'v2',
    name: '奥体中心体育场',
    address: '杭州市萧山区博奥路 588 号',
    lng: 120.235,
    lat: 30.231,
    enabled: true,
  },
  {
    id: 'v3',
    name: '西湖文化广场',
    address: '杭州市拱墅区环城北路 47 号',
    lng: 120.165,
    lat: 30.277,
    enabled: true,
  },
  {
    id: 'v4',
    name: '钱江新城城市阳台',
    address: '杭州市上城区解放东路 58 号',
    lng: 120.214,
    lat: 30.246,
    enabled: true,
  },
  {
    id: 'v5',
    name: '未来科技城中央公园',
    address: '杭州市余杭区文一西路 998 号',
    lng: 119.998,
    lat: 30.279,
    enabled: true,
  },
]

/** 可变副本：增删改直接作用于内存，刷新页面回滚到种子 */
const venueStore: { rows: VenueRow[] } = {
  rows: JSON.parse(JSON.stringify(SEED_VENUES)) as VenueRow[],
}

/**
 * 用后端真实列表初始化本地 store（列表已接 GET /api/venues）。
 *
 * 后端目前只有读接口和新增接口、没有编辑/删除接口：为让真实场地在本页也能走通
 * 编辑/删除交互，每次拉到后端列表后用它覆盖本地 store，使后续 mock 写操作能按
 * 真实 id 命中。注意这些写操作仍只改内存、不持久化（刷新即回到后端数据），等后端
 * 编辑/删除接口落地后移除。
 */
export function seedVenuesFromRemote(rows: VenueRow[]): void {
  venueStore.rows = JSON.parse(JSON.stringify(rows)) as VenueRow[]
}

/** 列表查询（等价 GET /admin/venues，返回副本防止外部直接改 store） */
export function queryVenues(): VenueRow[] {
  return JSON.parse(JSON.stringify(venueStore.rows)) as VenueRow[]
}

/** 编辑（等价 PUT /admin/venues/:id）：按字段合并，返回更新后的场地 */
export function updateVenue(id: string, form: VenueForm): VenueRow {
  const target = venueStore.rows.find((x) => x.id === id)
  if (!target) throw new Error('场地不存在')
  // VenueForm 保证字段必填、经纬度为 number，无需 server(JS) 里的 ?? 兜底
  target.name = form.name
  target.address = form.address
  target.lng = Number(form.lng)
  target.lat = Number(form.lat)
  target.enabled = form.enabled
  return { ...target }
}

/** 删除（等价 DELETE /admin/venues/:id） */
export function deleteVenue(id: string): void {
  const idx = venueStore.rows.findIndex((x) => x.id === id)
  if (idx < 0) throw new Error('场地不存在')
  venueStore.rows.splice(idx, 1)
}
