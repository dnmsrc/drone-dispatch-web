// ─────────────────────────────────────────────────────────────
// 场地管理 · 静态数据源（内存 CRUD，刷新页面即回滚到种子）
//
// 种子逐字搬运 mock-server seed.js 的 VENUES（v1…v5，默认全启用）。
// 用可变数组 + 一组查询/增删改函数模拟 /admin/venues 的完整 CRUD，
// 口径对齐 server.js：
//   - 名称 / 地址必填，缺失抛错（页面表单已前置校验，这里做数据源兜底）
//   - 新增 id 取 'v' + 时间戳，经纬度 Number() 兜底，enabled !== false 即启用
//   - 编辑按字段合并，未传项保持原值；删除按 id 定位，找不到抛错
// 接真接口后只把各函数体换成 request 调用，函数签名与页面不改名。
// TODO(server): 接 /admin/venues 后替换本文件实现。
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

/** 列表查询（等价 GET /admin/venues，返回副本防止外部直接改 store） */
export function queryVenues(): VenueRow[] {
  return JSON.parse(JSON.stringify(venueStore.rows)) as VenueRow[]
}

/** 新增（等价 POST /admin/venues）：返回新场地 */
export function createVenue(form: VenueForm): VenueRow {
  if (!form.name?.trim() || !form.address?.trim()) {
    throw new Error('请填写场地名称与地址')
  }
  const venue: VenueRow = {
    id: `v${Date.now()}`,
    name: form.name,
    address: form.address,
    lng: Number(form.lng) || 0,
    lat: Number(form.lat) || 0,
    enabled: form.enabled !== false,
  }
  venueStore.rows.push(venue)
  return { ...venue }
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
