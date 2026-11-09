// ─────────────────────────────────────────────────────────────
// 回传媒体库 · 静态数据源（内存派生，刷新页面即随订单种子重建）
//
// order_media 与订单一对多，媒体库把各订单详情里内嵌的 media.photos / videos
// 拍平成跨订单素材流，字段对齐后端 JOIN orders/users 的冗余展示口径：
//   - 只收录已完成（COMPLETED/REVIEWED，即有回传）订单的素材
//   - 照片在前、视频在后，同订单按 sort 排序，整体按回传时间倒序
//   - 关键词命中订单号 / 客户昵称 / 手机号；媒体类型可单独过滤
// 接真接口后只把 queryMedia 函数体换成 request 调用，签名与页面不改名。
// TODO(server): 接 GET /admin/order-media 后替换本文件实现。
// ─────────────────────────────────────────────────────────────
import { orderStore } from '@/views/order/mock'
import type { OrderRow } from '@/views/order/types'
import type { MediaQuery, MediaRow } from './types'

/** 把单个订单的 media 拍平成媒体行 */
function flatten(order: OrderRow): MediaRow[] {
  const out: MediaRow[] = []
  const base = {
    orderId: order.id,
    createdAt: order.completedAt ?? order.createdAt ?? '',
    userNickname: order.user?.nickname ?? '',
    userPhone: order.user?.phone ?? '',
    performDate: order.performDate ?? '',
  }
  ;(order.media?.photos ?? []).forEach((url, i) => {
    out.push({
      id: `${order.id}-PHOTO-${i + 1}`,
      ...base,
      mediaType: 'PHOTO',
      url,
      sort: i + 1,
    })
  })
  ;(order.media?.videos ?? []).forEach((url, i) => {
    out.push({
      id: `${order.id}-VIDEO-${i + 1}`,
      ...base,
      mediaType: 'VIDEO',
      url,
      sort: i + 1,
    })
  })
  return out
}

/** 全量素材（一次性拍平；演示数据量小，无需在模块级缓存） */
function allMedia(): MediaRow[] {
  return orderStore.rows
    .filter((o) => (o.media?.photos.length ?? 0) > 0 || (o.media?.videos.length ?? 0) > 0)
    .flatMap(flatten)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** 查询（等价 GET /admin/order-media?keyword=&mediaType=），返回过滤后的全量副本 */
export function queryMedia(q: MediaQuery = {}): MediaRow[] {
  let list = allMedia()
  if (q.mediaType) list = list.filter((m) => m.mediaType === q.mediaType)
  const kw = (q.keyword ?? '').trim()
  if (kw) {
    list = list.filter(
      (m) =>
        m.orderId.includes(kw) ||
        m.userNickname.includes(kw) ||
        m.userPhone.includes(kw) ||
        m.url.includes(kw),
    )
  }
  return JSON.parse(JSON.stringify(list)) as MediaRow[]
}

/** 素材统计（页头计数：照片/视频各多少） */
export function mediaStats(): { total: number; photos: number; videos: number } {
  const list = allMedia()
  return {
    total: list.length,
    photos: list.filter((m) => m.mediaType === 'PHOTO').length,
    videos: list.filter((m) => m.mediaType === 'VIDEO').length,
  }
}
