// ─────────────────────────────────────────────────────────────
// 评价管理 · 静态数据源
//
// 不单独维护评价种子，而是从 ../order/mock 的 orderStore 实时派生，
// 口径逐字复刻 mock-server 的 GET /admin/reviews：
//   1) 筛出所有带 review 的订单（review 非空）；
//   2) 按 review.createdAt 倒序（最新评价在前）；
//   3) 拍平成 ReviewRow：订单号 + 内嵌 user + 星级/内容/评价时间 + 架次/场景。
// 因此评价页与订单管理页数据同源：订单 mock 里的两条 REVIEWED 订单即此处全部评价，
// 接真接口后只替换 queryReviews 的数据调用，页面不改名。
// TODO(server): 接 /admin/reviews 后只替换本文件的数据调用。
// ─────────────────────────────────────────────────────────────
import { orderStore } from '../order/mock'
import type { ReviewRow } from './types'

/** 未知用户兜底（与 server withUser 的 nickname || '未知用户' 同语义） */
const FALLBACK_USER = { id: '', nickname: '未知用户', avatar: '', phone: '' }

/**
 * 拼装评价列表（等价 GET /admin/reviews）：
 * 仅保留带评价的订单，按评价时间倒序，拍平成列表行结构。
 */
function buildReviews(): ReviewRow[] {
  return orderStore.rows
    .filter((o) => o.review && o.review.createdAt)
    .sort((a, b) => (b.review!.createdAt ?? '').localeCompare(a.review!.createdAt ?? ''))
    .map((o) => ({
      orderId: o.id,
      user: o.user ?? FALLBACK_USER,
      stars: o.review!.stars ?? 0,
      content: o.review!.content ?? '',
      createdAt: o.review!.createdAt ?? '',
      droneCount: o.droneCount ?? 0,
      occasion: o.occasion ?? '',
    }))
}

/** 查询评价列表（静态页无入参；保留函数形态以便接真接口时平滑替换） */
export function queryReviews(): ReviewRow[] {
  return buildReviews()
}
