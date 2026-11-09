// ─────────────────────────────────────────────────────────────
// 档期管理 · 静态数据与动作（UI 联调用）
//
// 数据不另起炉灶：已订情况直接从 ../order/mock 的 orderStore 派生——
// 订单的 performDate + timeSlot 决定某天某时段被占几单，保证档期页看到的
// 「已订 / 满档」与订单管理页严格一致。档期自身的配置（单独时段 / 休整日 /
// 手动特殊日）存于本文件 scheduleStore，动作直接改内存，刷新即回滚。
//
// TODO(server): 接 /admin/schedule 系列接口后只替换本文件的查询/动作调用。
// ─────────────────────────────────────────────────────────────
import { orderStore } from '../order/mock'
import { BUILTIN_HOLIDAYS } from './constants'
import { DEFAULT_SLOTS, daysInMonth, fmtDate } from './slot'
import type { SaveSlotsParams, SaveSlotsResult, ScheduleCell, SlotId } from './types'

/* ═══ 档期可写配置（真接口为持久化存储；静态版放内存）═══ */
interface DayConfig {
  /** 单独配置的时段；undefined 表示沿用默认；[] 表示当日不接单 */
  slots?: SlotId[]
  /** 休整日 */
  closed?: boolean
  /** 手动特殊日名称（空串表示已取消标注） */
  customHoliday?: string
}

/** key = YYYY-MM-DD，仅记录被单独改过的日子，未配置的日期走默认 */
const scheduleStore: Map<string, DayConfig> = new Map()

/** 默认接单时段（可被接口下发覆盖；静态版恒定） */
let defaultSlots: SlotId[] = DEFAULT_SLOTS.slice()

/* ═══ 从订单派生预订情况 ═══ */
/** 计入档期占用的订单状态（已取消 / 已退款 / 已完成的历史单不再占未来名额） */
const BOOKING_STATUSES = new Set(['PENDING_ACCEPT', 'ACCEPTED', 'IN_SERVICE', 'REFUNDING'])

interface BookingAgg {
  /** 时段 → 订单数 */
  bySlot: Map<string, number>
  total: number
}

/** 聚合某日预订：date → { 各时段计数, 当日总订单数 } */
function buildBookingIndex(): Map<string, BookingAgg> {
  const index = new Map<string, BookingAgg>()
  for (const o of orderStore.rows) {
    if (!o.performDate || !o.timeSlot || !BOOKING_STATUSES.has(o.status)) continue
    const agg = index.get(o.performDate) ?? { bySlot: new Map<string, number>(), total: 0 }
    agg.bySlot.set(o.timeSlot, (agg.bySlot.get(o.timeSlot) ?? 0) + 1)
    agg.total += 1
    index.set(o.performDate, agg)
  }
  return index
}

/* ═══ 月历查询（等价 GET /admin/schedule?month=YYYY-MM）═══ */
export function queryMonth(month: string): { days: ScheduleCell[]; defaultSlots: SlotId[] } {
  const [y, m] = month.split('-').map(Number)
  const total = daysInMonth(y, m)
  const bookings = buildBookingIndex()
  const days: ScheduleCell[] = []

  for (let d = 1; d <= total; d++) {
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const cfg = scheduleStore.get(date)
    const booking = bookings.get(date)
    const bookedSlots: Record<string, number> = {}
    let booked = 0
    if (booking) {
      booked = booking.total
      for (const [slot, n] of booking.bySlot) bookedSlots[slot] = n
    }

    const closed = cfg?.closed ?? false
    const slotsOverridden = cfg?.slots !== undefined
    // 当日生效时段：休整日强制空；否则单独配置优先，未配置走默认
    const slots = closed ? [] : (cfg?.slots ?? defaultSlots).slice()
    const holiday = cfg?.customHoliday ?? BUILTIN_HOLIDAYS[date] ?? ''
    const customHoliday = Boolean(cfg?.customHoliday)

    days.push({
      date,
      slots,
      booked,
      limit: slots.length,
      closed,
      holiday,
      customHoliday,
      bookedSlots,
      slotsOverridden,
      overridden: slotsOverridden || closed || customHoliday,
    })
  }
  return { days, defaultSlots: defaultSlots.slice() }
}

/* ═══ 动作 ═══ */

/** 取或初始化某天的配置 */
function ensureConfig(date: string): DayConfig {
  const cfg = scheduleStore.get(date) ?? {}
  scheduleStore.set(date, cfg)
  return cfg
}

/**
 * 保存接单时段（等价 POST /admin/schedule/slots）。
 * - slots 为 null：恢复默认（清除单独配置）
 * - 空数组：当日不接单
 * - 已订时段不允许删除：留在返回 blocked 里，且不写入删除
 * 返回受订单保护而未变更的时段。
 */
export function saveSlots(params: SaveSlotsParams): SaveSlotsResult {
  const blocked: SlotId[] = []
  const bookings = buildBookingIndex()

  for (const date of params.dates) {
    const cfg = ensureConfig(date)

    // 恢复默认
    if (params.slots === null) {
      delete cfg.slots
      continue
    }

    const booking = bookings.get(date)
    const wanted = new Set(params.slots)
    // 已订时段即便不在提交列表里也强制保留（客户已买断名额，不可单方面撤回）
    const protectedSlots = booking ? [...booking.bySlot.keys()] : []
    const effective = new Set<SlotId>(params.slots)
    for (const s of protectedSlots) {
      if (!wanted.has(s)) {
        blocked.push(s)
        effective.add(s)
      }
    }
    cfg.slots = [...effective].sort()
    // 配了时段即视为营业，避免休整/配置并存的矛盾态
    if (effective.size > 0) cfg.closed = false
  }
  return { blocked: [...new Set(blocked)] }
}

/** 标注 / 取消特殊日（等价 POST /admin/schedule/holiday；name 空串为取消） */
export function saveHoliday(date: string, name: string): void {
  const cfg = ensureConfig(date)
  if (name) cfg.customHoliday = name
  else delete cfg.customHoliday
}

/** 设置 / 恢复休整日（等价 POST /admin/schedule/close）。已有订单的日子拒绝停工 */
export function setClosed(date: string, closed: boolean): { ok: boolean; reason?: string } {
  if (closed) {
    const booking = buildBookingIndex().get(date)
    if (booking && booking.total > 0) {
      return { ok: false, reason: `该日已有 ${booking.total} 单订单，不能设为休整日` }
    }
  }
  const cfg = ensureConfig(date)
  cfg.closed = closed
  return { ok: true }
}

/** 供测试/演示重置内存态 */
export function resetScheduleStore(): void {
  scheduleStore.clear()
  defaultSlots = DEFAULT_SLOTS.slice()
}

/** 今天 YYYY-MM-DD（透传 format，避免页面重复取） */
export function today(): string {
  return fmtDate(new Date())
}
