// ─────────────────────────────────────────────────────────────
// 场地管理 · 接口契约类型（字段名与 mock-server /admin/venues 完全一致）
//
// 预设表演场地，用户下单时可直接选择。接口提供完整 CRUD：
//   GET    /admin/venues        列表（返回 { list: Venue[] }）
//   POST   /admin/venues        新增（body 无 id，服务端生成 v+时间戳）
//   PUT    /admin/venues/:id    编辑（按字段合并）
//   DELETE /admin/venues/:id    删除
// 写操作要求管理员角色；名称与地址必填，经纬度服务端 Number() 兜底。
// 当前页面为静态实现，mock.ts 用内存 store 模拟同一套 CRUD；
// TODO(server): 接真接口后仅替换 mock.ts 内的调用，页面与弹窗不改名。
// ─────────────────────────────────────────────────────────────

/** 场地列表行 / 详情（同一结构） */
export interface VenueRow {
  /** 场地 id（预设 v1…v5；新增为 v+时间戳） */
  id: string
  /** 场地名称（必填，最长 30 字） */
  name: string
  /** 详细地址（必填，最长 60 字） */
  address: string
  /** 经度（-180 ~ 180，保留 3 位小数） */
  lng: number
  /** 纬度（-90 ~ 90，保留 3 位小数） */
  lat: number
  /** 启用状态：true 启用 / false 停用 */
  enabled: boolean
}

/** 新增 / 编辑提交体（无 id；id 走 URL 路径参数） */
export interface VenueForm {
  name: string
  address: string
  lng: number
  lat: number
  enabled: boolean
}

/**
 * 地图选点组件（AMapPicker）的 v-model 值。
 * 坐标统一为 WGS-84（高德 GCJ-02 在组件内转换后输出），与落库口径一致。
 */
export interface VenueLocation {
  /** 场地名称（POI 选中时回填，可再人工修改） */
  name: string
  /** 详细地址（逆地理 / POI 回填，可再人工修改） */
  address: string
  /** 经度 WGS-84（-180 ~ 180，最多 6 位小数） */
  lng: number
  /** 纬度 WGS-84（-90 ~ 90，最多 6 位小数） */
  lat: number
}

/** 场地编辑弹窗 open 入参：row 为空表示新增，否则为编辑回填 */
export interface VenueEditParams {
  /** 编辑时传入的现有场地；新增时为 null / undefined */
  row?: VenueRow | null
}
