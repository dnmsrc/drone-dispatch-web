// ─────────────────────────────────────────────────────────────
// 退款管理 · 静态数据源
//
// 数据不另起炉灶：退款单本就挂在订单行 o.refund 上（mock-server 同构），
// 这里从 ../order/mock 的 orderStore 过滤派生，保证退款列表里的订单号
// 在订单管理页一定能查到；审批动作复用 order/mock 的 act*（改内存 store）。
// TODO(server): 接 /admin/refunds 系列接口后只替换本文件的查询/动作调用。
// ─────────────────────────────────────────────────────────────
import { actRefundApprove, actRefundReject, orderStore } from '../order/mock'
import type { RefundRow } from './types'

export { actRefundApprove, actRefundReject }

/** 页签（原型 refund/list.vue 同款四个 tab；无计数后缀） */
export const REFUND_TABS: ReadonlyArray<{ name: string; label: string }> = [
  { name: 'PENDING', label: '待审批' },
  { name: 'APPROVED', label: '已通过' },
  { name: 'REJECTED', label: '已拒绝' },
  { name: 'ALL', label: '全部' },
]

/** 等价 GET /admin/refunds?status=：过滤有退款单的订单并按申请时间倒序 */
export function queryRefunds(tab: string): RefundRow[] {
  let list = orderStore.rows.filter((o) => o.refund)
  if (tab !== 'ALL') list = list.filter((o) => o.refund?.status === tab)
  return [...list].sort((a, b) =>
    (b.refund?.createdAt ?? '').localeCompare(a.refund?.createdAt ?? ''),
  )
}
