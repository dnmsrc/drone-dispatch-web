// ─────────────────────────────────────────────────────────────
// 订单管理 · 接口契约类型（字段名与 mock-server /admin/orders 完全一致）
//
// 当前页面为静态实现，mock.ts 按这些结构造数；
// TODO(server): 接真接口后本文件即响应类型来源，页面代码不改名。
// ─────────────────────────────────────────────────────────────

export interface OrderUser {
  id?: string
  nickname?: string
  phone?: string
  avatar?: string
}

/** 场地：preset 预设 / map 地图选点 / manual 手动输入 */
export interface OrderVenue {
  id?: string
  name?: string
  type?: 'preset' | 'map' | 'manual' | string
  address?: string
  lng?: number
  lat?: number
}

/** 现场联系人（下单时填写，与账号手机号可能不同） */
export interface OrderContact {
  name?: string
  phone?: string
}

/** 价格明细行：label + 金额（订单快照，改价不影响历史订单） */
export interface PriceItem {
  label: string
  amount: number
}

/** 用户评价（REVIEWED 状态才有） */
export interface OrderReview {
  stars?: number
  content?: string
  createdAt?: string
}

/** 退款单：PENDING 待审批 / APPROVED 已通过（拒单全额退也走此结构） */
export interface OrderRefund {
  reason?: string
  /** 退款比例 0-1 */
  ratio?: number
  applyAmount?: number
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | string
  /** 发起前订单状态（退款被拒时回滚依据） */
  prevStatus?: string
  auditBy?: string
  auditNote?: string
  refundAmount?: number
  refundNo?: string
  createdAt?: string
  auditedAt?: string
}

/** 现场回传媒体（photos/videos 为 /api/media/... 种子串，展示时转占位图） */
export interface OrderMedia {
  photos: string[]
  videos: string[]
}

/** 状态时间轴条目（订单用 time/text，注意与咨询单的 at/by 字段名不同） */
export interface OrderTimelineItem {
  time?: string
  text?: string
}

/** 列表行 = 详情对象（mock-server 列表与详情返回同一完整结构，user 由 withUser 内嵌） */
export interface OrderRow {
  id: string
  userId?: string
  status: string
  droneCount?: number
  duration?: number
  patternPreset?: string[]
  customText?: string
  customLogo?: string
  addons?: string[]
  occasion?: string
  performDate?: string
  timeSlot?: string
  venue?: OrderVenue
  contact?: OrderContact
  priceDetail?: PriceItem[]
  totalAmount?: number
  payChannel?: string
  payTradeNo?: string
  paidAt?: string
  acceptedBy?: string
  acceptedAt?: string
  startedAt?: string
  completedAt?: string
  media?: OrderMedia
  review?: OrderReview | null
  refund?: OrderRefund | null
  cancelReason?: string
  timeline?: OrderTimelineItem[]
  createdAt?: string
  expireAt?: string
  /** 列表接口内嵌的用户信息 */
  user?: OrderUser
}

/* ═══ 完成订单弹窗（CompleteDialog）═══ */

/** open() 入参：订单号 + 已回传媒体（再次打开时回填） */
export interface CompleteDialogParams {
  orderId: string
  photos?: string[]
  videos?: string[]
}

/** 确认时回传的数据（POST /admin/orders/:id/complete 请求体） */
export interface CompleteFormData {
  photos: string[]
  videos: string[]
}

/** 弹窗内的照片编辑行缓冲（url 可清空编辑，提交时收集非空行） */
export interface PhotoRow {
  url: string
}
