// ─────────────────────────────────────────────────────────────
// 退款管理 · 类型定义
//
// 退款数据挂在订单行上（o.refund），列表行即「含退款的订单」，
// 与 mock-server GET /admin/refunds 返回 withUser(order) 的结构一致。
// ─────────────────────────────────────────────────────────────
import type { OrderRow } from '../order/types'

/** 列表行：带 refund 的订单（id/totalAmount/user 直接取订单字段） */
export type RefundRow = OrderRow

/** 审批弹窗入参（原型 openAudit(row) 里弹窗展示所需的全部字段） */
export interface AuditDialogParams {
  orderId: string
  nickname?: string
  phone?: string
  /** 订单总额（实际退款金额上限） */
  totalAmount: number
  /** 阶梯试算金额（默认退款额） */
  applyAmount: number
  /** 试算比例 0-1 */
  ratio: number
  /** 用户填写的退款原因 */
  reason?: string
}

/** 审批弹窗回传：批准带调整后的金额与备注，拒绝带必填理由 */
export interface AuditFormData {
  mode: 'approve' | 'reject'
  amount: number
  note: string
}
