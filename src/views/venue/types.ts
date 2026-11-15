// ─────────────────────────────────────────────────────────────
// 场地管理 · 视图层契约类型（与后端 /api/venues 的 DTO 差异统一在 @/api/venue 适配收口）
//
// 预设表演场地，用户下单时可直接选择。后端提供完整 CRUD：
//   GET    /api/venues        列表（全部未删除：仅过滤 deleted=1，含 enabled=0 停用项）
//   POST   /api/venues        新增（body 无 id，数据库自增主键，enabled 随表单提交）
//   PUT    /api/venues/:id    编辑业务字段含启用状态（id 走路径，enabled 随表单提交）
//   DELETE /api/venues/:id    软删除（deleted 置 1，数据保留）
// 写操作要求管理员角色；场地名称必填，详细地址选填（空串落库），经纬度由地图选点保证。
// ─────────────────────────────────────────────────────────────

/** 场地列表行 / 详情（同一结构） */
export interface VenueRow {
  /** 场地 id（后端自增 BIGINT，适配层 String() 转为字符串） */
  id: string
  /** 场地名称（必填，最长 30 字） */
  name: string
  /** 详细地址（选填，可留空；最长 60 字，空值以空串落库） */
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
