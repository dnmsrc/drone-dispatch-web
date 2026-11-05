// ─────────────────────────────────────────────────────────────
// 组件测试场 · 演示数据
// 与真实业务字段保持一致的假数据（无人机派单场景），仅用于展示组件效果。
// 接入服务端后，测试场仍然保留这套数据，不依赖后端。
// ─────────────────────────────────────────────────────────────
import type { OptionItem } from '@/components/pro'

/** 订单状态（与原型 admin 的状态字典一致） */
export const ORDER_STATUS_OPTIONS: OptionItem[] = [
  { label: '待接单', value: 'pending' },
  { label: '已接单', value: 'accepted' },
  { label: '执行中', value: 'performing' },
  { label: '待付款', value: 'unpaid' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
  { label: '已退款', value: 'refunded' },
]

/** 表演时段 */
export const TIME_SLOT_OPTIONS: OptionItem[] = [
  { label: '18:00-18:30', value: '18:00' },
  { label: '19:00-19:30', value: '19:00' },
  { label: '20:00-20:30', value: '20:00' },
  { label: '21:00-21:30', value: '21:00' },
]

/** 场地（含分组，用于演示 select 分组选项） */
export const VENUE_OPTIONS: OptionItem[] = [
  { label: '滨江公园', value: '滨江公园', group: '市区' },
  { label: '星海广场', value: '星海广场', group: '市区' },
  { label: '东湖绿道', value: '东湖绿道', group: '郊区' },
  { label: '光谷广场', value: '光谷广场', group: '郊区' },
]

/** 订单行（表格演示用） */
export interface MockOrder {
  id: string
  nickname: string
  phone: string
  venue: string
  performDate: string
  timeSlot: string
  drones: number
  amount: number
  status: string
  createdAt: string
}

export const mockOrders: MockOrder[] = [
  {
    id: 'DD202511050001',
    nickname: '小北',
    phone: '138****2048',
    venue: '滨江公园',
    performDate: '2025-11-08',
    timeSlot: '19:00',
    drones: 120,
    amount: 16800,
    status: 'pending',
    createdAt: '2025-11-05 09:12',
  },
  {
    id: 'DD202511050002',
    nickname: '阿梨',
    phone: '139****7710',
    venue: '星海广场',
    performDate: '2025-11-09',
    timeSlot: '20:00',
    drones: 200,
    amount: 26800,
    status: 'accepted',
    createdAt: '2025-11-05 10:03',
  },
  {
    id: 'DD202511040003',
    nickname: '老周',
    phone: '137****1188',
    venue: '东湖绿道',
    performDate: '2025-11-07',
    timeSlot: '18:00',
    drones: 60,
    amount: 8800,
    status: 'performing',
    createdAt: '2025-11-04 16:40',
  },
  {
    id: 'DD202511040004',
    nickname: 'Kiki',
    phone: '135****3390',
    venue: '光谷广场',
    performDate: '2025-11-10',
    timeSlot: '21:00',
    drones: 300,
    amount: 39800,
    status: 'unpaid',
    createdAt: '2025-11-04 15:22',
  },
  {
    id: 'DD202511030005',
    nickname: '橙子',
    phone: '186****6621',
    venue: '星海广场',
    performDate: '2025-11-06',
    timeSlot: '19:00',
    drones: 150,
    amount: 21800,
    status: 'completed',
    createdAt: '2025-11-03 11:05',
  },
  {
    id: 'DD202511020006',
    nickname: '大壮',
    phone: '150****0092',
    venue: '滨江公园',
    performDate: '2025-11-05',
    timeSlot: '20:00',
    drones: 80,
    amount: 11800,
    status: 'cancelled',
    createdAt: '2025-11-02 18:31',
  },
  {
    id: 'DD202511020007',
    nickname: '木木',
    phone: '188****4455',
    venue: '东湖绿道',
    performDate: '2025-11-05',
    timeSlot: '18:00',
    drones: 100,
    amount: 14800,
    status: 'refunded',
    createdAt: '2025-11-02 09:47',
  },
  {
    id: 'DD202511010008',
    nickname: '阿泰',
    phone: '177****8823',
    venue: '光谷广场',
    performDate: '2025-11-04',
    timeSlot: '21:00',
    drones: 220,
    amount: 28800,
    status: 'completed',
    createdAt: '2025-11-01 20:16',
  },
]

/** 状态 → 文字 / 标签色（表格 render 演示用） */
export const ORDER_STATUS_MAP: Record<string, { text: string; type: 'primary' | 'success' | 'warning' | 'danger' | 'info' }> = {
  pending: { text: '待接单', type: 'warning' },
  accepted: { text: '已接单', type: 'primary' },
  performing: { text: '执行中', type: 'primary' },
  unpaid: { text: '待付款', type: 'warning' },
  completed: { text: '已完成', type: 'success' },
  cancelled: { text: '已取消', type: 'info' },
  refunded: { text: '已退款', type: 'danger' },
}

/** 金额格式化（¥1,6800.00 → 千分位） */
export function formatMoney(value: number): string {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}
