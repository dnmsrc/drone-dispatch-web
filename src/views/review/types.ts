// ─────────────────────────────────────────────────────────────
// 评价管理 · 接口契约类型（字段名与 mock-server GET /admin/reviews 完全一致）
//
// 该接口从 db.orders 里筛出带 review 的已评价订单，按评价时间倒序，
// 每条拍平成「订单号 + 内嵌用户 + 星级/内容/时间 + 架次/场景」：
//   orderId    订单号
//   user       下单用户（withUser 同款：id/nickname/avatar/phone）
//   stars      星级 1-5
//   content    评价正文（最长 200 字）
//   createdAt  评价时间（ISO）
//   droneCount 投入架次
//   occasion   表演场景（可能为空串，展示兜底「—」）
// 当前页面为静态实现，mock.ts 从订单 mock 实时派生同结构数据；
// TODO(server): 接真接口后本文件即响应类型来源，页面代码不改名。
// ─────────────────────────────────────────────────────────────
import type { OrderUser } from '../order/types'

/** 评价列表行（/admin/reviews 返回项） */
export interface ReviewRow {
  /** 订单号（来源订单 id） */
  orderId: string
  /** 下单用户（与订单列表内嵌 user 同源） */
  user: OrderUser
  /** 星级 1-5 */
  stars: number
  /** 评价正文 */
  content: string
  /** 评价时间（ISO） */
  createdAt: string
  /** 投入架次（架） */
  droneCount: number
  /** 表演场景；无场景为空串，列表展示「—」 */
  occasion: string
}
