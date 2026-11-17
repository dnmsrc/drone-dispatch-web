// ─────────────────────────────────────────────────────────────
// 档期管理 · 类型定义（对齐原型 schedule/index.vue 的 cell 结构）
// ─────────────────────────────────────────────────────────────

/** 时段 id：整点区间 "19:00-20:00"，分钟固定 00，一段 = 一个可接单名额 */
export type SlotId = string

/** 月历里的一天（GET /admin/schedule?month= 返回的 days 元素） */
export interface ScheduleCell {
  /** YYYY-MM-DD */
  date: string
  /** 当日可接单时段（休整日为空数组） */
  slots: SlotId[]
  /** 已订订单数 */
  booked: number
  /** 当日名额上限（= 时段数；休整日为 0） */
  limit: number
  /** 休整日：全部时段停接 */
  closed: boolean
  /** 法定节假日名称（如 国庆节），手动特殊日也走该字段 */
  holiday: string
  /** 是否为管理员手动标注的特殊日（区别于内置法定节假日） */
  customHoliday: boolean
  /** 各时段已订单数：{ "19:00-20:00": 1 }，已订时段不可删除 */
  bookedSlots: Record<string, number>
  /** 当日时段是否被单独配置过（区别于沿用默认时段） */
  slotsOverridden: boolean
  /** 当日整体是否被单独设置过（含时段/休整等，供标记 * 用） */
  overridden: boolean
}

/** GET /admin/schedule 响应 */
export interface ScheduleMonth {
  /** 该月每一天（含前后置空由前端按周偏移拼） */
  days: ScheduleCell[]
  /** 当前默认接单时段（批量配置弹窗的初始值） */
  defaultSlots: SlotId[]
}

/** 保存接单时段入参（POST /admin/schedule/slots） */
export interface SaveSlotsParams {
  dates: string[]
  /** null 表示恢复默认；空数组表示当日不接单 */
  slots: SlotId[] | null
  mode: 'single' | 'bulk'
}

/** 保存接单时段响应：因已有订单而保持不变的时段 */
export interface SaveSlotsResult {
  blocked: SlotId[]
}

/** 单日详情弹窗需要的编辑态（打开时由 cell 派生） */
export interface DayEditState {
  slotsInput: SlotId[]
  holidayInput: string
}

/**
 * 全局档期设置（GET/PUT /api/schedule/global）。
 * defaultSlots 为全局默认可接单时段（单日未覆盖时沿用）；
 * bookingWindowDays 为预约窗口天数（用户最多可预约未来 N 天），范围 7-365。
 */
export interface GlobalSchedule {
  defaultSlots: SlotId[]
  bookingWindowDays: number
}
