// ─────────────────────────────────────────────────────────────
// 咨询受理 · 接口契约类型（字段名与 mock-server / docs/consult-workflow.md 一致）
//
// 当前页面为静态实现，mock.ts 按这些结构造数；
// TODO(server): 接真接口后本文件即响应类型来源，页面代码不改名。
// ─────────────────────────────────────────────────────────────

export interface ConsultUser {
  id?: string
  nickname?: string
  phone?: string
  avatar?: string
}

/** 场地：preset 预设 / map 地图选点 / manual 手动输入 */
export interface ConsultVenue {
  id?: string
  name?: string
  type?: 'preset' | 'map' | 'manual' | string
  address?: string
  lng?: number
  lat?: number
}

/** H5 问卷提交的规模与内容需求 */
export interface ConsultNeed {
  droneCount?: number
  duration?: number
  contentMode?: 'template' | 'deep' | 'matrix' | string
  screens?: 'low' | 'mid' | 'high' | string
  dimension?: string
  motion?: 'static' | 'dynamic' | string
  matrix?: number
  addons?: string[]
  audience?: number
}

/** 自动判定项结果：PASS 通过 / FAIL 不通过 / PENDING 待人工核实 */
export interface JudgmentCheck {
  key?: string
  label?: string
  result?: 'PASS' | 'FAIL' | 'PENDING' | string
  detail?: string
}

export interface ConsultJudgment {
  conclusion?: string
  conclusionText?: string
  checks?: JudgmentCheck[]
}

/** 报价区间：lo/hi 为给用户看的浮动区间，total 为系统预估合计 */
export interface ConsultQuote {
  total?: number
  lo?: number
  hi?: number
  fee?: Record<string, unknown>
}

/** 转人工原因（H5 判定命中项） */
export interface ConsultReason {
  key?: string
  label?: string
  why?: string
}

export interface TimelineItem {
  at?: string
  by?: string
  text?: string
}

/** 派单六项必填的派生展示行（后端派生优先，缺省时前端按 terms 兜底） */
export interface MustFillItem {
  key: string
  label?: string
  value?: string | number | null
  required?: boolean
  note?: string
}

export interface ConsultDispatch {
  id?: string
  createdBy?: string
  createdAt?: string
  status?: 'PENDING_CONFIRM' | 'CONFIRMED' | string
  confirmedAt?: string
  confirmedBy?: string
  quoteRange?: [number, number]
  terms?: Record<string, string | number>
  mustFill?: MustFillItem[]
  note?: string
}

export interface ConsultReject {
  reason?: string
  by?: string
  at?: string
}

/** 列表行（列表接口返回结构，user/venue/judgment/quote 均内嵌） */
export interface ConsultRow {
  id: string
  status: string
  /** 用户态状态文案（el-tag title 用） */
  statusText?: string
  submittedAt?: string
  updatedAt?: string
  receivedAt?: string
  receivedBy?: string
  performDate?: string
  timeSlot?: string
  note?: string
  user?: ConsultUser
  venue?: ConsultVenue
  need?: ConsultNeed
  judgment?: ConsultJudgment
  quote?: ConsultQuote
  reasons?: ConsultReason[]
  dispatch?: ConsultDispatch | null
  reject?: ConsultReject | null
}

/** 详情接口 data.consult 结构：在列表行之上追加时间轴 */
export interface ConsultDetail extends ConsultRow {
  timeline?: TimelineItem[]
  supersede?: Record<string, unknown>
}

/* ═══ 创建派单弹窗（DispatchDialog）═══ */

/** open() 入参：咨询单快照 + 用户预估区间预填上下限 */
export interface DispatchDialogParams {
  consultId: string
  nickname?: string
  phone?: string
  venueName?: string
  performDate?: string
  timeSlot?: string
  /** 用户预估区间文案（quoteText 结果），表单副标题展示 */
  quoteHint?: string
  quoteLo?: number
  quoteHi?: number
}

/** 确认时回传的数据（POST /admin/consults/:id/dispatch 请求体） */
export interface DispatchFormData {
  quoteLo: number
  quoteHi: number
  terms: Record<string, string | number>
  note: string
}
