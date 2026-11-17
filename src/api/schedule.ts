// ─────────────────────────────────────────────────────────────
// 档期接口层 —— 对接后端 drone-dispatch-server ScheduleController（/api/schedule）
//
// 已对接接口（管理端读登录即可、写仅 ADMIN，角色由 Service 层闸门控制）：
//   GET  /schedule/global             读全局默认时段 + 预约窗口
//   PUT  /schedule/global             保存全局设置（字段传哪个改哪个，范围 7-365）
//   GET  /schedule/month?year&month   按月查日历（每天含 openSlots 派生）
//   PUT  /schedule/days/:date/slots   配置单日时段（slots=null 恢复默认、[] 当日不接单）
//   PUT  /schedule/days/:date/closed  设置/取消休整日（note 可空）
// 另：GET /schedule/days/:date 单日本层暂不封装（页面 reload 走整月刷新，避免多余请求）；
//     GET /schedule/public 属 H5 匿名只读，不在管理后台封装。
//
// 后端 VO 与前端视图（src/views/schedule/types.ts）的差异统一在本文件适配收口：
//   1) booked：后端只给 bookedSlots（各时段计数），前端要当日总数 → 求和派生；
//   2) holiday / customHoliday：后端只有单个 note 字段（同时承载「节日说明」与「休整说明」），
//      故 note 非空即视为手动标注（customHoliday=true），holiday 优先取 note、否则回退内置法定节假日表；
//   3) overridden：后端无该字段，由 slotsOverridden || closed || note 非空 派生；
//   4) openSlots：后端已有，但前端满档判定用 booked>=limit，故不进视图类型（避免多一份可漂移真值）；
//   5) slots/null 语义与页面一致：null=恢复默认（回退全局）、[]=当日不接单。
//
// 已订保护（后端缺口，前端补）：后端 saveDaySlots 不校验「已订时段不可撤」，
// 批量弹窗又不展示各时段已订情况，若直接覆盖会把客户已买断的名额删掉。
// 故 planSlotUpdates 在提交前按当月已加载数据把已订时段并入提交集（复刻原型 mock 语义），
// 冲突时整批中止并提示。TODO(server): 建议后端在 saveDaySlots/setClosed 内补同等保护。
// ─────────────────────────────────────────────────────────────
import http from '@/utils/http'
import { BUILTIN_HOLIDAYS } from '@/views/schedule/constants'
import { DEFAULT_SLOTS, findOverlap, fmtSlot, normSlotId } from '@/views/schedule/slot'
import type {
  GlobalSchedule,
  SaveSlotsParams,
  SaveSlotsResult,
  ScheduleCell,
  ScheduleMonth,
  SlotId,
} from '@/views/schedule/types'

/* ═══ 后端 VO 的 JSON 形态（字段名与后端 record 一一对应，勿改名）═══ */

/** 后端单日档期单元格（ScheduleCellVO） */
export interface ScheduleCellDto {
  /** YYYY-MM-DD */
  date: string
  /** 当日实际时段（已回退全局默认），休整日为空数组 */
  slots: string[] | null
  /** 可预约时段（slots 过滤掉订满项），前端不消费 */
  openSlots?: string[] | null
  /** 各时段已订数，键为时段串 */
  bookedSlots: Record<string, number> | null
  /** 当日名额 = 时段数（休整日 0） */
  limit: number
  closed: boolean
  /** 当日时段是否被单独配置过 */
  slotsOverridden: boolean
  /** 休整 / 节日说明 */
  note: string | null
}

/** 后端月历视图（ScheduleMonthVO） */
export interface ScheduleMonthDto {
  days: ScheduleCellDto[] | null
  defaultSlots: string[] | null
  bookingWindowDays?: number | null
}

/** 后端全局档期设置（GlobalScheduleVO，与保存请求同构） */
export interface GlobalScheduleDto {
  defaultSlots: string[] | null
  bookingWindowDays: number | null
}

/** PUT /schedule/global 请求体（两字段可空，传哪个改哪个） */
export interface GlobalScheduleUpdatePayload {
  defaultSlots?: SlotId[]
  bookingWindowDays?: number
}

/** PUT /schedule/days/{date}/slots 请求体（slots=null 恢复默认，note 不传则后端保留原值） */
export interface DaySlotsPayload {
  slots: SlotId[] | null
  note?: string | null
}

/** PUT /schedule/days/{date}/closed 请求体 */
export interface DayClosedPayload {
  closed: boolean
  note?: string | null
}

/* ═══ 纯函数：DTO → 视图类型（单测覆盖派生与兜底）═══ */

/** 已订计数归一：只保留值为正整数的时段键，过滤脏数据与 0 项 */
function normalizeBookedSlots(
  raw: Record<string, number> | null | undefined,
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [slot, n] of Object.entries(raw ?? {})) {
    const count = Number(n)
    if (Number.isFinite(count) && count > 0) result[slot] = count
  }
  return result
}

/**
 * 后端单日单元格 → 前端 ScheduleCell。
 * 视图侧 field 全部在此派生：booked 求和、holiday 取 note 或内置节假日、customHoliday/overridden 组合。
 */
export function toScheduleCell(dto: ScheduleCellDto): ScheduleCell {
  const slots = normalizeSlots(dto.slots)
  const bookedSlots = normalizeBookedSlots(dto.bookedSlots)
  const booked = Object.values(bookedSlots).reduce((sum, n) => sum + n, 0)
  const note = (dto.note ?? '').trim()
  const closed = Boolean(dto.closed)
  const slotsOverridden = Boolean(dto.slotsOverridden)
  const limit = Number(dto.limit)

  return {
    date: dto.date,
    slots,
    booked,
    // 后端 limit 由 slots.size 派生；异常值回退时段数，保证「已订/名额」展示不炸
    limit: Number.isFinite(limit) && limit >= 0 ? limit : slots.length,
    closed,
    holiday: note || BUILTIN_HOLIDAYS[dto.date] || '',
    customHoliday: note.length > 0,
    bookedSlots,
    slotsOverridden,
    overridden: slotsOverridden || closed || note.length > 0,
  }
}

/** 规整一组时段：去空、规范化、排序（后端 SlotRules 也会规整，这里保证请求体干净） */
export function normalizeSlots(slots: readonly string[] | null | undefined): SlotId[] {
  return [...new Set((slots ?? []).map(normSlotId).filter((s): s is SlotId => Boolean(s)))].sort()
}

/** 后端月历视图 → 前端 ScheduleMonth（days 逐项适配，默认时段缺失时回退内置缺省） */
export function toScheduleMonth(dto: ScheduleMonthDto | null | undefined): ScheduleMonth {
  const defaultSlots =
    dto?.defaultSlots == null ? DEFAULT_SLOTS.slice() : normalizeSlots(dto.defaultSlots)
  return {
    days: (dto?.days ?? []).map(toScheduleCell),
    defaultSlots,
  }
}

/** 后端全局设置 → 前端 GlobalSchedule（时段非法/缺失回退默认，窗口非法回退 60） */
export function toGlobalSchedule(dto: GlobalScheduleDto | null | undefined): GlobalSchedule {
  const slots = normalizeSlots(dto?.defaultSlots)
  const window = Number(dto?.bookingWindowDays)
  return {
    defaultSlots: slots.length ? slots : DEFAULT_SLOTS.slice(),
    bookingWindowDays: Number.isFinite(window) && window > 0 ? window : 60,
  }
}

/** 页面全局设置表单 → PUT 请求体（弹窗已做范围/重叠校验，这里只做类型收口） */
export function toGlobalUpdatePayload(input: GlobalSchedule): GlobalScheduleUpdatePayload {
  return {
    defaultSlots: normalizeSlots(input.defaultSlots),
    bookingWindowDays: Number(input.bookingWindowDays),
  }
}

/* ═══ 纯函数：已订保护（对齐原型 mock 的 saveSlots 语义）═══ */

/** 单日要下发的时段变更；slots=null 表示恢复默认 */
export interface SlotPlanUpdate {
  date: string
  slots: SlotId[] | null
}

/** 已订保护与冲突检测结果 */
export interface SlotPlan {
  /** 因已有订单而被迫保留的时段（去重后的并集，供页面提示） */
  blocked: SlotId[]
  /** 逐日实际提交项（批量=多条，单日=一条） */
  updates: SlotPlanUpdate[]
  /** 保护合并后仍与其他时段重叠的日期（无法安全自动保留，整批中止） */
  conflicts: Array<{ date: string; pair: [SlotId, SlotId] }>
}

/**
 * 计算逐日时段提交计划（纯函数，单测覆盖）。
 *
 * 规则（与原型 mock.saveSlots 一致）：
 *   - slots=null：恢复默认，不展开保护，逐日下发 null；
 *   - 已订时段即便不在提交列表里也强制保留（客户已买断名额，不可单方面撤回），计入 blocked；
 *   - 某个时段的计数以传入 cell.bookedSlots 为准（页面按当月已加载数据构造）；
 *   - 未加载到 cell 的日期（跨月）不做保护，交由后端最终数据兜底。
 * 冲突：若保留已订时段后与新时段重叠（例如把 19-20 扩成 19-21），无法既保留又满足规则，
 * 记为 conflicts 由调用方中止并提示，避免半途写入。
 */
export function planSlotUpdates(
  dates: readonly string[],
  slots: readonly SlotId[] | null,
  cellByDate: ReadonlyMap<string, ScheduleCell>,
): SlotPlan {
  const blocked: SlotId[] = []
  const updates: SlotPlanUpdate[] = []
  const conflicts: SlotPlan['conflicts'] = []

  for (const date of dates) {
    // 恢复默认：不清算已订时段（只是去掉单日覆盖，回退全局默认；后端按既有语义处理）
    if (slots === null) {
      updates.push({ date, slots: null })
      continue
    }

    const cell = cellByDate.get(date)
    const booked = cell ? Object.keys(cell.bookedSlots ?? {}) : []
    const wanted = new Set(normalizeSlots(slots))
    const effective = new Set<SlotId>(wanted)
    for (const slot of booked) {
      if (!wanted.has(slot)) {
        blocked.push(slot)
        effective.add(slot)
      }
    }

    const next = [...effective].sort()
    const overlap = findOverlap(next)
    if (overlap) {
      conflicts.push({ date, pair: overlap })
      continue
    }
    updates.push({ date, slots: next })
  }

  return { blocked: [...new Set(blocked)], updates, conflicts }
}

/* ═══ API ═══ */

/**
 * 读全局档期设置（GET /schedule/global，登录即可）。
 * http 层已剥离 Result 信封；后端缺失时自身给兜底，适配层再兜一层。
 */
export async function getGlobalSchedule(): Promise<GlobalSchedule> {
  const dto = await http.get<GlobalScheduleDto>('/schedule/global')
  return toGlobalSchedule(dto)
}

/**
 * 保存全局设置（PUT /schedule/global，仅 ADMIN）。
 * 两字段都下发（弹窗已校验非空/上限/重叠/窗口范围）；400（越界/重叠）由 http 拦截器弹错并 reject。
 */
export async function saveGlobalSchedule(input: GlobalSchedule): Promise<void> {
  await http.put<void>('/schedule/global', toGlobalUpdatePayload(input))
}

/**
 * 按月拉日历（GET /schedule/month?year&month，登录即可）。
 * month 形如 "YYYY-MM"（页面 el-date-picker 的 value-format 已固定该格式）。
 */
export async function queryMonth(month: string): Promise<ScheduleMonth> {
  const [year, monthNum] = month.split('-').map(Number)
  const dto = await http.get<ScheduleMonthDto>('/schedule/month', { year, month: monthNum })
  return toScheduleMonth(dto)
}

/**
 * 保存接单时段（批量/单日统一入口，仅 ADMIN）。
 *
 * 后端只有单日接口，故逐日 PUT；提交前按 planSlotUpdates 做已订保护：
 *   - 已订时段强制保留，返回 blocked 供页面提示；
 *   - 保护合并后产生重叠（该日已订时段与新区间冲突）→ 抛错整批中止，避免写一半。
 * slots=null 表示恢复默认，[] 表示当日不接单。
 */
export async function saveSlots(
  params: SaveSlotsParams,
  cellByDate: ReadonlyMap<string, ScheduleCell>,
): Promise<SaveSlotsResult> {
  const plan = planSlotUpdates(params.dates, params.slots, cellByDate)
  const conflict = plan.conflicts[0]
  if (conflict) {
    throw new Error(
      `${conflict.date}：新时段「${fmtSlot(conflict.pair[0])}」与已订时段「${fmtSlot(
        conflict.pair[1],
      )}」重叠，请避开已订时段再保存`,
    )
  }
  // 逐日串行下发：任一失败由 http 拦截器弹错并 reject，保留已成功的日期（与原型一致的分步语义）
  for (const update of plan.updates) {
    const payload: DaySlotsPayload = { slots: update.slots }
    await http.put<void>(`/schedule/days/${update.date}/slots`, payload)
  }
  return { blocked: plan.blocked }
}

/**
 * 只写单日说明（特殊日标注 / 取消标注），不动接单时段。
 *
 * 后端没有独立的 note 接口，但 PUT /schedule/days/{date}/closed 会用该行原有 slots 原样覆盖
 * （existing.getSlots() 保留），只改 closed 与 note，因此这里复用该端点而不会污染时段配置：
 *   - keepClosed 传当前日的 closed 原值，确保只写说明时休整状态不被翻转；
 *   - note='' 即取消标注（后端会 trim 后落库为空串）。
 * TODO(server): 待后端提供独立的单日备注接口后切换，去掉这层借用语义。
 */
export async function saveDayNote(date: string, note: string, keepClosed: boolean): Promise<void> {
  const payload: DayClosedPayload = { closed: keepClosed, note }
  await http.put<void>(`/schedule/days/${date}/closed`, payload)
}

/**
 * 设置 / 取消休整日（仅 ADMIN）。
 *
 * 已有订单的日子拒绝停工：这是原型的业务规则，后端 setClosed 目前不校验，
 * 故在此按页面已加载的 cell.booked 先行拦截（不发请求），保持页面提示语义。
 * 不传 note（null）→ 后端保留该行原有说明，避免把特殊日标注清掉。
 */
export async function setClosed(
  cell: ScheduleCell,
  closed: boolean,
): Promise<{ ok: boolean; reason?: string }> {
  if (closed && cell.booked > 0) {
    return { ok: false, reason: `该日已有 ${cell.booked} 单订单，不能设为休整日` }
  }
  await http.put<void>(`/schedule/days/${cell.date}/closed`, { closed } as DayClosedPayload)
  return { ok: true }
}
