// ─────────────────────────────────────────────────────────────
// 咨询受理 · 静态数据（UI 联调用）
//
// 样本取自 mock-server(:8099) 真实快照（C…-0002/0003/0004 三条原样保留），
// 并按同一契约扩展至六种状态全覆盖，保证页签、操作按钮、详情抽屉各分支可视。
// 日期相对「今天」动态生成（同首页趋势图思路），演示站放多久都不会过期。
// TODO(server): 接 http.get('/admin/consults') 后整体替换本文件，页面代码不动。
// ─────────────────────────────────────────────────────────────
import type { ConsultDetail, ConsultNeed, ConsultReason, ConsultRow } from './types'

const DAY = 86_400_000
const HOUR = 3_600_000

/** 距今 n 天的本地时间戳 */
function d(n: number): number {
  return Date.now() - n * DAY
}

/** 距今 n 小时的 ISO 串（时间轴按分钟级错开，避免并列同刻） */
function isoH(n: number): string {
  return new Date(Date.now() - n * HOUR).toISOString()
}

/** 距今 n 天的表演日期（YYYY-MM-DD，未来为负 n） */
function perfDate(n: number): string {
  const dt = new Date(Date.now() + -n * DAY)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

/** 咨询单号：日期段随提交日、流水段固定，贴近 mock-server 的 C{yyyyMMdd}-{seq} 规则 */
function consultId(daysAgo: number, seq: number): string {
  const dt = new Date(d(daysAgo))
  const p = (x: number) => String(x).padStart(2, '0')
  return `C${dt.getFullYear()}${p(dt.getMonth() + 1)}${p(dt.getDate())}-${p(seq)}`
}

const OPERATOR = '调度操作员'

/** 判定 checks 采样（原型 mock-server checks 为空数组；正式版补两种异常项让抽屉该区块可见） */
const CHECK_SURVEY = [
  {
    key: 'SURVEY',
    label: '空域实测数据',
    result: 'PENDING',
    detail: '该场地无净空实测记录，需实地勘察后复核',
  },
] as const
const CHECK_CROWD = [
  {
    key: 'CROWD',
    label: '大型活动安全许可',
    result: 'FAIL',
    detail: '观众预计超过 1000 人，须由属地公安核发安全许可',
  },
] as const

const NEED_SMALL = {
  droneCount: 60,
  duration: 8,
  contentMode: 'template',
  screens: 'low',
  dimension: '2D',
  motion: 'static',
  matrix: 1,
  addons: [],
  audience: 300,
} satisfies ConsultNeed

export const mockRows = [
  {
    id: consultId(0, 7),
    status: 'PENDING',
    statusText: '待客服接待',
    submittedAt: isoH(5),
    updatedAt: isoH(5),
    performDate: perfDate(-5),
    timeSlot: '19:30-20:30',
    note: '',
    user: { id: 'u1011', nickname: '阿枣科技', phone: '186****2317' },
    venue: { name: '武林夜市码头', type: 'manual', address: '杭州市拱墅区武林门街市 A 区沿河步道' },
    need: NEED_SMALL,
    judgment: { conclusion: 'MANUAL', conclusionText: '夜间限飞时段调整，需人工复核' },
    reasons: [
      {
        key: 'AIRSPACE',
        label: '夜间限飞时段',
        why: '19:30 后属限制空域，需向区航管部门报备后方可执行',
      },
    ] satisfies ConsultReason[],
    quote: { total: 15800, lo: 14220, hi: 18170 },
  },
  {
    // ↑ mock-server 快照 C20261103-0001 原样（单号日期段动态化）
    id: consultId(5, 2),
    status: 'PENDING',
    statusText: '待客服接待',
    submittedAt: isoH(120),
    updatedAt: isoH(120),
    performDate: perfDate(-4),
    timeSlot: '20:00-21:00',
    note: '现场有 10kV 架空线，已联系物业确认',
    user: { id: 'u1001', nickname: '追风的李先生', phone: '138****6601' },
    venue: {
      id: 'v1',
      name: '滨江世纪广场',
      type: 'preset',
      address: '杭州市滨江区江南大道 100 号',
    },
    need: {
      droneCount: 200,
      duration: 10,
      contentMode: 'template',
      screens: 'mid',
      dimension: '2D',
      motion: 'static',
      matrix: 1,
      addons: [],
      audience: 600,
    } satisfies ConsultNeed,
    judgment: {
      conclusion: 'SURVEY',
      conclusionText: '无实测数据，需实地勘察（判定结论以现场勘察为准）',
      checks: [...CHECK_SURVEY],
    },
    reasons: [
      {
        key: 'SURVEY',
        label: '无实测数据，需实地勘察',
        why: '判定结论以现场勘察为准，勘察前不能出正式报价',
      },
    ],
    quote: { total: 38000, lo: 34200, hi: 43700 },
  },
  {
    // ↑ mock-server 快照 C20261102-0002 原样
    id: consultId(6, 3),
    status: 'RECEIVED',
    statusText: '客服已接待·拟方案',
    submittedAt: isoH(144),
    updatedAt: isoH(129),
    receivedAt: isoH(129),
    receivedBy: OPERATOR,
    performDate: perfDate(-3),
    timeSlot: '19:00-20:00',
    note: '',
    user: { id: 'u1002', nickname: 'Ann', phone: '137****8842' },
    venue: {
      id: 'v2',
      name: '奥体中心体育场',
      type: 'preset',
      address: '杭州市拱墅区西牛岗路 1 号',
    },
    need: {
      droneCount: 500,
      duration: 12,
      contentMode: 'matrix',
      screens: 'mid',
      dimension: '3D',
      motion: 'dynamic',
      matrix: 2,
      addons: ['music', 'aerial'],
      audience: 2000,
    } satisfies ConsultNeed,
    judgment: { conclusion: 'FIRST', conclusionText: '初次活动，须做官方可行性评估', checks: [] },
    reasons: [
      {
        key: 'FIRST_TIME',
        label: '该场地首次承办飞行表演',
        why: '需向属地管理部门提交可行性评估材料，周期约 5 个工作日',
      },
    ],
    quote: { total: 52000, lo: 46800, hi: 59800 },
  },
  {
    id: consultId(2, 4),
    status: 'RECEIVED',
    statusText: '客服已接待·拟方案',
    submittedAt: isoH(49),
    updatedAt: isoH(37),
    receivedAt: isoH(37),
    receivedBy: OPERATOR,
    performDate: perfDate(-12),
    timeSlot: '20:30-21:00',
    note: '希望突出企业 LOGO 主视觉',
    user: { id: 'u1004', nickname: '星辰糖', phone: '151****0093' },
    venue: { name: '印象城南岸', type: 'map', address: '杭州市萧山区闻涛路 1818 号' },
    need: {
      droneCount: 100,
      duration: 8,
      contentMode: 'deep',
      screens: 'high',
      dimension: '3D',
      motion: 'dynamic',
      matrix: 1,
      addons: ['music'],
      audience: 800,
    } satisfies ConsultNeed,
    judgment: {
      conclusion: 'OK_WITH_CONDITIONS',
      conclusionText: '可执行，需完成空域报备',
      checks: [],
    },
    reasons: [
      {
        key: 'DEEP定制',
        label: '深度定制画面数量多',
        why: '9 个以上画面需专属编排，交付周期至少 10 天',
      },
    ],
    quote: { total: 26000, lo: 23400, hi: 29900 },
  },
  {
    // ↑ mock-server 快照 C20261101-0003 原样（dispatch 结构照抄真实返回）
    id: consultId(7, 5),
    status: 'DISPATCHED',
    statusText: '已派单·待你确认',
    submittedAt: isoH(168),
    updatedAt: isoH(144),
    receivedAt: isoH(153),
    receivedBy: OPERATOR,
    performDate: perfDate(-1),
    timeSlot: '21:00-22:00',
    note: '',
    user: { id: 'u1006', nickname: '一颗奶糖', phone: '159****1180' },
    venue: {
      id: 'v3',
      name: '西湖文化广场',
      type: 'preset',
      address: '杭州市拱墅区环城北路 47 号',
    },
    need: {
      droneCount: 400,
      duration: 10,
      contentMode: 'template',
      screens: 'mid',
      dimension: '2D',
      motion: 'static',
      matrix: 1,
      addons: [],
      audience: 1200,
    } satisfies ConsultNeed,
    judgment: {
      conclusion: 'CROWD',
      conclusionText: '1000 人以上，须办大型群众性活动安全许可',
      checks: [...CHECK_CROWD],
    },
    reasons: [
      {
        key: 'CROWD',
        label: '1000 人以上大型群众性活动',
        why: '需安全许可证，承办者应在活动日 20 日前向公安机关申请',
      },
    ],
    quote: { total: 68000, lo: 61200, hi: 78200 },
    dispatch: {
      id: consultId(6, 1002).replace('C', 'D'),
      createdBy: OPERATOR,
      createdAt: isoH(144),
      status: 'PENDING_CONFIRM',
      confirmedAt: '',
      confirmedBy: '',
      quoteRange: [64600, 74800],
      terms: {
        approvalOwner: '承飞方（乙方）负责空域申请与备案',
        approvalFailLiability: '明确约定：乙方未按时取得批复 → 乙方全责退还已付费用',
        subcontractApproved: '是（甲方书面同意）',
        depositNature: '预付款（未约定定金条款，不适用定金罚则）',
        insuranceAmount: 1000000,
        scaleBasis: '投入规模（实际投入的机队数）；同时升空峰值由编舞决定，不作为计价与验收口径',
      },
      note: '已电话告知用户安全许可办理时限',
    },
  },
  {
    id: consultId(12, 6),
    status: 'CONFIRMED',
    statusText: '方案已确认',
    submittedAt: isoH(288),
    updatedAt: isoH(192),
    receivedAt: isoH(282),
    receivedBy: OPERATOR,
    performDate: perfDate(6),
    timeSlot: '20:00-20:30',
    note: '求浪漫，预算 2 万左右',
    user: { id: 'u1003', nickname: '小满', phone: '189****5521' },
    venue: {
      id: 'v1',
      name: '滨江世纪广场',
      type: 'preset',
      address: '杭州市滨江区江南大道 100 号',
    },
    need: {
      droneCount: 120,
      duration: 8,
      contentMode: 'template',
      screens: 'low',
      dimension: '2D',
      motion: 'static',
      matrix: 1,
      addons: ['music'],
      audience: 200,
    } satisfies ConsultNeed,
    judgment: { conclusion: 'OK', conclusionText: '条件齐备，可直接安排', checks: [] },
    reasons: [],
    quote: { total: 19800, lo: 17820, hi: 22770 },
    dispatch: {
      id: consultId(11, 1001).replace('C', 'D'),
      createdBy: OPERATOR,
      createdAt: isoH(240),
      status: 'CONFIRMED',
      confirmedAt: isoH(192),
      confirmedBy: '小满',
      quoteRange: [18800, 21600],
      terms: {
        approvalOwner: '承飞方（乙方）负责空域申请与备案',
        approvalFailLiability: '乙方未取得批复 → 全额退款并改期一次',
        subcontractApproved: '是（甲方书面同意）',
        depositNature: '定金（适用定金罚则）',
        insuranceAmount: 1000000,
        scaleBasis: '投入规模（实际投入的机队数）',
      },
      mustFill: [
        {
          key: 'approvalOwner',
          label: '审批义务承担主体',
          value: '承飞方（乙方）负责空域申请与备案',
          required: true,
          note: '',
        },
        {
          key: 'approvalFailLiability',
          label: '审批失败责任划分',
          value: '乙方未取得批复 → 全额退款并改期一次',
          required: true,
          note: '约定不明 → 双方共同承担、互不支付违约金或赔偿利息（(2025)鄂01民终396号）',
        },
        {
          key: 'subcontractApproved',
          label: '转包是否经甲方书面同意',
          value: '是（甲方书面同意）',
          required: true,
          note: '未经书面同意的转包费用可能不被认定为共同履约成本',
        },
        {
          key: 'depositNature',
          label: '签约节点是定金还是预付款',
          value: '定金（适用定金罚则）',
          required: true,
          note: '仅写“首付/预付”而未约定定金性质的，法院按预付款处理，不适用双倍返还',
        },
        {
          key: 'insuranceAmount',
          label: '责任保险保额',
          value: 1000000,
          required: true,
          note: '第三方责任险建议不低于 100 万，缺失时项目地文旅窗口可能不予受理',
        },
        {
          key: 'scaleBasis',
          label: '计价与验收按投入规模还是峰值',
          value: null,
          required: true,
          note: '未明确验收口径 → 投入规模与升空峰值之争可能拖垮结算（(2021)辽01民终12999号）',
        },
      ],
      note: '求爱场景，已提醒用户保留鲜花布置时间',
    },
  },
  {
    id: consultId(9, 7),
    status: 'REJECTED',
    statusText: '已驳回',
    submittedAt: isoH(216),
    updatedAt: isoH(204),
    receivedAt: isoH(210),
    receivedBy: OPERATOR,
    performDate: perfDate(-8),
    timeSlot: '21:00-21:30',
    note: '',
    user: { id: 'u1007', nickname: '夜航船', phone: '152****7788' },
    venue: { name: '运河古镇上空', type: 'manual', address: '杭州市临平区运河北岸历史街区' },
    need: {
      droneCount: 80,
      duration: 6,
      contentMode: 'template',
      screens: 'low',
      dimension: '2D',
      motion: 'static',
      matrix: 1,
      addons: [],
      audience: 400,
    } satisfies ConsultNeed,
    judgment: { conclusion: 'NO_FLY', conclusionText: '场地处于禁飞区，无法执行', checks: [] },
    reasons: [
      {
        key: 'NO_FLY',
        label: '禁飞区',
        why: '场地划入永久禁飞区，任何飞行表演均需调址',
      },
    ],
    quote: { total: 12000, lo: 10800, hi: 13800 },
    reject: {
      reason: '场地处于禁飞区，暂无法安排飞行表演，可选周边开阔场地重新选址',
      by: OPERATOR,
      at: isoH(204),
    },
  },
  {
    id: consultId(15, 8),
    status: 'ABANDONED',
    statusText: '已废弃',
    submittedAt: isoH(360),
    updatedAt: isoH(24),
    performDate: perfDate(-14),
    timeSlot: '19:00-19:30',
    note: '先问个价，档期还没定',
    user: { id: 'u1009', nickname: '路人甲', phone: '150****3366' },
    venue: {
      id: 'v3',
      name: '西湖文化广场',
      type: 'preset',
      address: '杭州市拱墅区环城北路 47 号',
    },
    need: {
      droneCount: 30,
      duration: 5,
      contentMode: 'template',
      screens: 'low',
      dimension: '2D',
      motion: 'static',
      matrix: 1,
      addons: [],
      audience: 150,
    } satisfies ConsultNeed,
    judgment: { conclusion: 'OK', conclusionText: '条件齐备，可直接安排', checks: [] },
    reasons: [],
    quote: { total: 9800, lo: 8820, hi: 11270 },
  },
] as const satisfies readonly ConsultRow[]

/** 详情扩展：列表行之外的 timeline / supersede / dispatch.note（按 id 关联，openDetail 时合并） */
interface DetailExt {
  supersede?: Record<string, unknown>
  timeline?: { at?: string; by?: string; text?: string }[]
}

const detailExt: Record<string, DetailExt> = {
  [mockRows[0].id]: {
    supersede: { mode: 'NEW_CONSULT' },
    timeline: [{ at: isoH(5), by: '用户', text: '提交咨询单，等待客服接待' }],
  },
  [mockRows[1].id]: {
    supersede: { mode: 'NEW_CONSULT' },
    timeline: [{ at: isoH(120), by: '用户', text: '提交咨询单，等待客服接待' }],
  },
  [mockRows[2].id]: {
    supersede: { mode: 'NEW_CONSULT' },
    timeline: [
      { at: isoH(144), by: '用户', text: '提交咨询单，等待客服接待' },
      { at: isoH(129), by: OPERATOR, text: '客服已接待，正在拟定方案与报价区间' },
    ],
  },
  [mockRows[3].id]: {
    supersede: { mode: 'NEW_CONSULT' },
    timeline: [
      { at: isoH(49), by: '用户', text: '提交咨询单，等待客服接待' },
      { at: isoH(37), by: OPERATOR, text: '客服已接待，正在拟定方案与报价区间' },
    ],
  },
  [mockRows[4].id]: {
    supersede: { mode: 'NEW_CONSULT' },
    timeline: [
      { at: isoH(168), by: '用户', text: '提交咨询单，等待客服接待' },
      { at: isoH(153), by: OPERATOR, text: '客服已接待，正在拟定方案与报价区间' },
      {
        at: isoH(144),
        by: OPERATOR,
        text: `客服已创建派单 ${mockRows[4].dispatch?.id ?? ''}，报价区间 ¥64,600 - ¥74,800，等待用户确认`,
      },
    ],
  },
  [mockRows[5].id]: {
    // mustFill 六项已填五项，「计价与验收口径」留白 —— 演示抽屉红色「未填写」警示分支
    supersede: { mode: 'NEW_CONSULT' },
    timeline: [
      { at: isoH(288), by: '用户', text: '提交咨询单，等待客服接待' },
      { at: isoH(282), by: OPERATOR, text: '客服已接待，正在拟定方案与报价区间' },
      {
        at: isoH(240),
        by: OPERATOR,
        text: '客服已创建派单，报价区间 ¥18,800 - ¥21,600，等待用户确认',
      },
      { at: isoH(192), by: '用户', text: '用户已确认方案，转入订单流程' },
    ],
  },
  [mockRows[6].id]: {
    supersede: { mode: 'NEW_CONSULT' },
    timeline: [
      { at: isoH(216), by: '用户', text: '提交咨询单，等待客服接待' },
      { at: isoH(210), by: OPERATOR, text: '客服已接待，正在拟定方案与报价区间' },
      { at: isoH(204), by: OPERATOR, text: '客服已驳回：场地处于禁飞区，暂无法安排飞行表演' },
    ],
  },
  [mockRows[7].id]: {
    supersede: { mode: 'MANUAL_CLOSE' },
    timeline: [
      { at: isoH(360), by: '用户', text: '提交咨询单，等待客服接待' },
      { at: isoH(24), by: OPERATOR, text: '超时未接待，系统自动废弃' },
    ],
  },
}

/** 静态动作后的可变副本（接待/驳回/派单直接改内存，刷新页面即回滚） */
export const consultStore: { rows: ConsultRow[] } = {
  rows: mockRows.map((r) => ({ ...r })),
}

/** 各状态计数（每次 load 重算，页签数字与表格永远一致） */
export function deriveCounts(rows: ConsultRow[]): Record<string, number> {
  const counts: Record<string, number> = {
    PENDING: 0,
    RECEIVED: 0,
    DISPATCHED: 0,
    CONFIRMED: 0,
    REJECTED: 0,
    ABANDONED: 0,
  }
  for (const r of rows) {
    if (counts[r.status] !== undefined) counts[r.status] += 1
  }
  return counts
}

/** 行内追加一条时间轴记录（模拟接口写入） */
function pushTimeline(row: ConsultRow, text: string, by = OPERATOR): void {
  const ext = detailExt[row.id] ?? {}
  const tl = (ext.timeline ?? []).slice()
  tl.push({ at: new Date().toISOString(), by, text })
  detailExt[row.id] = { ...ext, timeline: tl }
}

/** 详情合并：列表行 + timeline/supersede 扩展（等价 GET /admin/consults/:id 的 data.consult） */
export function buildDetail(row: ConsultRow): ConsultDetail {
  const ext = detailExt[row.id] ?? {}
  return { ...row, ...ext } as ConsultDetail
}

/* ═══ 静态动作（真接口为 POST /admin/consults/:id/{receive,reject,dispatch}）═══ */

export interface DispatchPayload {
  quoteLo: number
  quoteHi: number
  terms: Record<string, string | number>
  note: string
}

/** 接待：PENDING → RECEIVED */
export function actReceive(row: ConsultRow): void {
  row.status = 'RECEIVED'
  row.statusText = '客服已接待·拟方案'
  row.receivedAt = new Date().toISOString()
  row.receivedBy = OPERATOR
  row.updatedAt = row.receivedAt
  pushTimeline(row, '客服已接待，正在拟定方案与报价区间')
}

/** 驳回：RECEIVED → REJECTED，驳回原因用户可见 */
export function actReject(row: ConsultRow, reason: string): void {
  const at = new Date().toISOString()
  row.status = 'REJECTED'
  row.statusText = '已驳回'
  row.reject = { reason, by: OPERATOR, at }
  row.updatedAt = at
  pushTimeline(row, `客服已驳回：${reason}`)
}

/** 创建派单：RECEIVED → DISPATCHED，等待用户在 H5 确认 */
export function actDispatch(row: ConsultRow, payload: DispatchPayload): void {
  const at = new Date().toISOString()
  row.status = 'DISPATCHED'
  row.statusText = '已派单·待你确认'
  row.dispatch = {
    id: `D${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(
      new Date().getDate(),
    ).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    createdBy: OPERATOR,
    createdAt: at,
    status: 'PENDING_CONFIRM',
    confirmedAt: '',
    confirmedBy: '',
    quoteRange: [payload.quoteLo, payload.quoteHi],
    terms: { ...payload.terms },
    // 不传 mustFill：走 constants 里的 terms 兜底渲染，顺带验证该分支
    note: payload.note,
  }
  row.updatedAt = at
  pushTimeline(
    row,
    `客服已创建派单，报价区间 ¥${payload.quoteLo.toLocaleString('zh-CN')} - ¥${payload.quoteHi.toLocaleString('zh-CN')}，等待用户确认`,
  )
}
