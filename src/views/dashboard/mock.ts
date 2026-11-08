/**
 * 首页看板静态数据
 *
 * 数值取自原型 mock-server GET /api/admin/dashboard 的一次真实快照（种子库算出来的，
 * 不是拍脑袋填的）；趋势的日期列改为相对「本地今天」动态生成（recentDays），
 * 页面演示时曲线不会随时间推移变成一串 0。
 *
 * TODO(server): 后端接入后删除本文件，页面改为 http.get('/admin/dashboard')，
 * 数据结构保持不变（stats / trend / tierDist / latest 与接口返回一一对应）。
 */

export interface DashboardStats {
  /** 今日订单 */
  todayOrders: number
  /** 待接单 */
  pendingAccept: number
  /** 待执行（已接单 + 执行中） */
  toExecute: number
  /** 本月营收（分） */
  monthRevenue: number
  /** 退款待审批 */
  pendingRefunds: number
  /** 待接待咨询单 */
  pendingConsults: number
}

export interface TrendPoint {
  /** YYYY-MM-DD */
  date: string
  orders: number
  /** 营收（分） */
  revenue: number
}

export interface TierDatum {
  /** 档位名，如「300 架」 */
  name: string
  /** 该档位累计营收（分） */
  value: number
}

export interface LatestOrder {
  id: string
  /** 接口经 withUser 附带用户信息，可能缺失 */
  user?: { nickname?: string } | null
  totalAmount: number
  status: string
  performDate: string
  timeSlot: string
}

const pad = (n: number): string => String(n).padStart(2, '0')

/**
 * 以本地今天为最后一格，生成近 n 天 {date, orders, revenue} 序列；
 * orders / revenues 传固定样例数值（长度不足补 0）。
 */
function recentDays(days: number, orders: number[], revenues: number[]): TrendPoint[] {
  const out: TrendPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    const idx = days - 1 - i
    out.push({
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      orders: orders[idx] ?? 0,
      revenue: revenues[idx] ?? 0,
    })
  }
  return out
}

/** 统计卡片（快照当日：待接单 6 / 待执行 6 / 本月营收 ¥412,000 …） */
export const mockStats: DashboardStats = {
  todayOrders: 0,
  pendingAccept: 6,
  toExecute: 6,
  monthRevenue: 412000,
  pendingRefunds: 1,
  pendingConsults: 1,
}

/** 近 7 日趋势：数值为种子库快照量级样例，日期列动态 */
export const mockTrend: TrendPoint[] = recentDays(
  7,
  [3, 4, 5, 3, 2, 4, 5],
  [98000, 159400, 127200, 76600, 64000, 118000, 142600],
)

/** 架次营收分布（按档位累计营收，mock 会过滤 0 值档） */
export const mockTierDist: TierDatum[] = [
  { name: '100 架', value: 96000 },
  { name: '200 架', value: 189000 },
  { name: '300 架', value: 278800 },
  { name: '500 架', value: 164600 },
  { name: '1000 架', value: 123800 },
]

/** 最新 6 条订单（mock 按 createdAt 倒序取前 6，含各种状态用于展示状态标签配色） */
export const mockLatest: LatestOrder[] = [
  {
    id: 'D20261104-0004',
    user: { nickname: 'Ann' },
    totalAmount: 37800,
    status: 'PENDING_ACCEPT',
    performDate: '2026-11-10',
    timeSlot: '21:00-22:00',
  },
  {
    id: 'D20261104-0024',
    user: { nickname: '微信用户_8848' },
    totalAmount: 38800,
    status: 'REVIEWED',
    performDate: '2026-11-05',
    timeSlot: '19:00-20:00',
  },
  {
    id: 'D20261104-0023',
    user: { nickname: '微信用户_8848' },
    totalAmount: 38800,
    status: 'REFUNDED',
    performDate: '2026-11-13',
    timeSlot: '19:00-20:00',
  },
  {
    id: 'D20261103-0022',
    user: { nickname: '一颗奶糖' },
    totalAmount: 38800,
    status: 'PENDING_ACCEPT',
    performDate: '2026-11-07',
    timeSlot: '21:00-22:00',
  },
  {
    id: 'D20261103-0020',
    user: { nickname: '追风的李先生' },
    totalAmount: 18800,
    status: 'PENDING_ACCEPT',
    performDate: '2026-11-07',
    timeSlot: '19:00-20:00',
  },
  {
    id: 'D20261103-0002',
    user: { nickname: '甜甜圈小姐' },
    totalAmount: 18800,
    status: 'PENDING_ACCEPT',
    performDate: '2026-11-09',
    timeSlot: '19:00-20:00',
  },
]
