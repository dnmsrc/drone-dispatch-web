// ─────────────────────────────────────────────────────────────
// 支付流水 · 接口契约类型（对齐后端 payments 表）
//
// 独立于订单：一单可多次支付尝试（失败重试产生多行）；合同分期由
// scheduleId 区分期次。两种支付方式：
//   ONLINE 在线支付（微信/支付宝，渠道回调自动成功）
//   OFFLINE 对公转账（客户上传银行回单，管理员人工核对后确认到账）
//   GET  /admin/payments                 列表（内嵌订单/期次摘要）
//   POST /admin/payments/:id/confirm     对公到账人工确认（PENDING → SUCCESS）
// 当前页面为静态实现，mock.ts 从订单/合同派生流水并用内存 store 维护；
// TODO(server): 接真接口后仅替换 mock.ts 内的调用，页面不改名。
// ─────────────────────────────────────────────────────────────

/** 支付方式 */
export type PayMethod = 'ONLINE' | 'OFFLINE'

/** 支付流水状态（payments.status） */
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CLOSED'

/** 列表行内嵌订单摘要 */
export interface PaymentOrderBrief {
  orderNo: string
  userNickname?: string
  userPhone?: string
  totalAmount?: number
}

/** 支付流水行 */
export interface PaymentRow {
  /** 流水 id（种子 p1…；新增为 p+时间戳） */
  id: string
  /** 关联订单号（后端为 order_id） */
  orderId: string
  /** 关联合同付款计划期次 id（一次性支付为空） */
  scheduleId: string | null
  /** 期次名称冗余（预付款 / 尾款 / 一次性付清），免去列表再联表 */
  stageName: string
  /** 支付方式：在线 / 对公 */
  payMethod: PayMethod | string
  /** 渠道：在线 WECHAT/ALIPAY；对公固定 OFFLINE */
  channel: string
  /** 渠道流水号（发起时可空；对公填银行回单号） */
  tradeNo: string
  /** 金额 */
  amount: number
  /** 流水状态 */
  status: PaymentStatus | string
  /** 失败原因（FAILED 时有值） */
  failReason: string
  /** 线下付款凭证/银行回单图片地址（对公转账必填） */
  voucherUrl: string
  /** 线下到账确认人（在线支付为空） */
  confirmBy: string
  /** 人工确认到账时间 */
  confirmedAt: string | null
  /** 支付完成时间 */
  paidAt: string | null
  /** 流水创建时间 */
  createdAt: string
  /** 内嵌订单摘要 */
  order: PaymentOrderBrief
}

/** 对公到账确认提交体（真接口可能附备注，演示版仅状态流转） */
export interface ConfirmPaymentForm {
  /** 核对备注（选填） */
  remark?: string
}
