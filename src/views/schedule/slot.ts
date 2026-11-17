// ─────────────────────────────────────────────────────────────
// 档期 · 时段与日期纯逻辑（基线：原型 admin/src/utils/slot.js + schedule/index.vue 内联函数）
//
// 一个「时段」= 一个整点区间，形如 "19:00-20:00"；分钟固定 00，只能配整点。
// 纯函数无副作用，单测见 src/views/schedule/__tests__/slot.test.ts。
// ─────────────────────────────────────────────────────────────
import type { SlotId } from './types'

const SLOT_RE = /^([01]\d|2[0-3]):00-(([01]\d|2[0-3]|24):00)$/

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 默认接单时段（批量配置弹窗初始值） */
export const DEFAULT_SLOTS: SlotId[] = ['19:00-20:00', '20:00-21:00', '21:00-22:00']

/** 时段选择器整点选项：00:00 ~ 23:00，步长 1 小时 */
export const HOUR_OPTIONS: string[] = Array.from({ length: 24 }, (_, i) => `${pad2(i)}:00`)

/** 规整单个时段 id；非法（含结束不晚于开始）返回空串 */
export function normSlotId(s: unknown): string {
  if (typeof s !== 'string') return ''
  const raw = s.trim()
  if (SLOT_RE.test(raw)) return raw.slice(6) > raw.slice(0, 5) ? raw : ''
  // 容错：历史脏数据 "19-20:00"（漏了 :00）顺手修正
  const bad = raw.match(/^([01]\d|2[0-3])-(([01]\d|2[0-3]):00)$/)
  if (bad) return `${bad[1]}:00-${bad[2]}`
  return ''
}

/** "19:00-20:00" → "19:00 – 20:00" */
export function fmtSlot(s: string): string {
  const id = normSlotId(s)
  return id ? `${id.slice(0, 5)} – ${id.slice(6)}` : ''
}

/** 窄位置用："19-20" */
export function shortSlot(s: string): string {
  const id = normSlotId(s)
  return id ? `${id.slice(0, 2)}-${id.slice(6, 8)}` : ''
}

/** 时段 → 起止分钟数，便于比较重叠 */
export function slotRange(id: string): [number, number] {
  const [a, b] = String(id).split('-')
  const toMin = (t: string): number => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  return [toMin(a), toMin(b)]
}

/**
 * 找出列表中第一对重叠时段；无重叠返回 null。
 * 口径（原型三次修正）：完全相同 / 部分相交算重叠；首尾相接（19-20 vs 20-21）合法。
 * 排序后只比相邻段：不相邻两段若相交，中间段必与其中之一相交。
 */
export function findOverlap(list: SlotId[]): [SlotId, SlotId] | null {
  const arr = [...new Set(list.filter(Boolean))].sort()
  for (let i = 1; i < arr.length; i++) {
    const [a1, a2] = slotRange(arr[i - 1])
    const [b1, b2] = slotRange(arr[i])
    if (Math.max(a1, b1) < Math.min(a2, b2)) return [arr[i - 1], arr[i]]
  }
  return null
}

/** 单日时段上限（原型 addSlotFor 边界） */
export const MAX_SLOTS_PER_DAY = 12

/* ── 日期工具（原型 schedule 内联，集中以便复用与测试）── */

/** 今天/任意 Date → YYYY-MM-DD（本地时区） */
export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 今天 YYYY-MM-DD（本地时区；页面用它判「过去日期」，避免各处 new Date 重复） */
export function today(): string {
  return fmtDate(new Date())
}

/** YYYY-MM-DD 的下一天（处理跨月/跨年） */
export function nextDayStr(dateStr: string): string {
  const [y, m, day] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, day + 1)
  return fmtDate(dt)
}

/** 星期几：0=周日 … 6=周六（原生 getDay 口径） */
export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

/** 月历首行前置空白天数：周一为一周起点（getDay 周日=0 → 偏移 6） */
export function monthLeadOffset(year: number, month1: number): number {
  return (new Date(year, month1 - 1, 1).getDay() + 6) % 7
}

/** 某月天数 */
export function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate()
}

/**
 * 把已选日期列表合并成连续区间预览（原型 selectedPreview）。
 * 最多显示前 3 段，超出追加「等 N 天」；单日原样、区间用 "from ~ to"。
 */
export function previewRanges(dates: Iterable<string>): string {
  const list = [...dates].sort()
  if (!list.length) return '—'
  const ranges: Array<{ from: string; to: string }> = []
  for (const d of list) {
    const last = ranges[ranges.length - 1]
    if (last && nextDayStr(last.to) === d) last.to = d
    else ranges.push({ from: d, to: d })
  }
  const parts = ranges.slice(0, 3).map((r) => (r.from === r.to ? r.from : `${r.from} ~ ${r.to}`))
  const more = ranges.length > 3 ? ` 等 ${list.length} 天` : ''
  return parts.join('、') + more
}
