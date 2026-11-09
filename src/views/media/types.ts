// ─────────────────────────────────────────────────────────────
// 回传媒体库 · 接口契约类型（对齐后端 order_media 表）
//
// 订单完成后操作员回传的现场照片 / 视频，按订单一对多存储。媒体库把分散在
// 各订单详情里的素材集中起来，支持跨订单检索与回溯：
//   GET /admin/order-media?keyword=&mediaType=&page=&size=
// 列表行由后端 JOIN orders/users 带出订单号、客户、表演日期等冗余展示字段。
// 当前页面为静态实现，mock.ts 从订单域 orderStore 的 media 拍平派生；
// TODO(server): 接真接口后仅替换 mock.ts 内的调用，页面不改名。
// ─────────────────────────────────────────────────────────────

/** 媒体类型（order_media.media_type） */
export type MediaType = 'PHOTO' | 'VIDEO'

/** 媒体库列表行（order_media + 订单/用户冗余字段） */
export interface MediaRow {
  /** 媒体唯一 id（演示用 订单-类型-序号 拼接） */
  id: string
  /** 关联订单号（后端为 order_id） */
  orderId: string
  /** 媒体类型：照片 / 视频 */
  mediaType: MediaType
  /** 素材地址（演示为 /api/media/... 种子串，展示时照片转占位 data URI） */
  url: string
  /** 同订单内排序 */
  sort: number
  /** 回传时间（取订单完成时间） */
  createdAt: string
  /** 冗余：客户昵称 */
  userNickname: string
  /** 冗余：客户手机号 */
  userPhone: string
  /** 冗余：表演日期 */
  performDate: string
}

/** 媒体库查询参数 */
export interface MediaQuery {
  keyword?: string
  mediaType?: MediaType | ''
}
