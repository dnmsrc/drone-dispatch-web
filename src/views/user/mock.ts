// ─────────────────────────────────────────────────────────────
// 用户管理 · 静态数据源
//
// 分两段拼出 /admin/users 的返回：
//   1) 用户基础档案（昵称/脱敏手机/性别/注册时间/头像种子）—— 对齐
//      mock-server seed.js 的 USERS 种子，本地静态维护；
//   2) 订单聚合字段（orderCount / totalSpent / lastOrderAt）—— 不写死，
//      运行时从 ../order/mock 的 orderStore 实时聚合，口径逐字复刻
//      server.js 的 GET /admin/users，保证与订单管理页数据同源、不打架。
// 列表按累计消费降序（同接口默认排序）。
// TODO(server): 接 /admin/users 后只替换 queryUsers 的数据调用，页面不改名。
// ─────────────────────────────────────────────────────────────
import { orderStore } from '../order/mock'
import type { Gender, UserRow } from './types'

/** 用户基础档案种子（字段与 seed.js USERS 完全一致；头像/注册时间在拼装时补） */
interface UserSeed {
  id: string
  nickname: string
  phone: string
  /** 性别：1 男 / 0 女 */
  gender: Gender
}

const USER_SEEDS: UserSeed[] = [
  { id: 'u1001', nickname: '追风的李先生', phone: '138****6601', gender: 1 },
  { id: 'u1002', nickname: '甜甜圈小姐', phone: '137****2209', gender: 0 },
  { id: 'u1003', nickname: '星辰大海', phone: '139****8832', gender: 1 },
  { id: 'u1004', nickname: 'Ann', phone: '186****3315', gender: 0 },
  { id: 'u1005', nickname: '老王不老王', phone: '150****7742', gender: 1 },
  { id: 'u1006', nickname: '一颗奶糖', phone: '159****1180', gender: 0 },
]

/** 注册时间：seed.js 统一取 90 天前（相对今天动态生成，演示站不过期） */
const REGISTER_DAYS_AGO = 90

/** 不计入累计消费的订单状态（取消 / 已退款，同 server.js 排除口径） */
const EXCLUDED_FROM_SPENT = ['CANCELLED', 'REFUNDED']

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

/**
 * 拼装用户列表（等价 GET /admin/users）：
 * 订单数取该用户全部订单；累计消费只算「已支付且未取消/退款」的订单；
 * 最近下单时间取其订单创建时间的最大值，无订单为空串。
 */
function buildUsers(): UserRow[] {
  return USER_SEEDS.map((seed) => {
    const orders = orderStore.rows.filter((o) => o.userId === seed.id)
    const paid = orders.filter((o) => o.paidAt && !EXCLUDED_FROM_SPENT.includes(o.status))
    const lastOrderAt = orders.length
      ? (orders
          .map((o) => o.createdAt ?? '')
          .sort()
          .pop() ?? '')
      : ''

    return {
      ...seed,
      avatar: `/api/media/avatar/${seed.id}`,
      createdAt: isoDaysAgo(REGISTER_DAYS_AGO),
      orderCount: orders.length,
      totalSpent: paid.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0),
      lastOrderAt,
    }
  }).sort((a, b) => b.totalSpent - a.totalSpent)
}

/** 查询用户列表（静态页无入参；保留函数形态以便接真接口时平滑替换） */
export function queryUsers(): UserRow[] {
  return buildUsers()
}
