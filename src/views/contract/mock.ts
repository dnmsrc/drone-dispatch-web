// ─────────────────────────────────────────────────────────────
// 电子合同 · 静态数据源（内存 CRUD，刷新页面即回滚到种子）
//
// 种子从订单域 orderStore 派生（合同与订单 1:1，订单创建即生成合同草稿），
// 复刻 contracts + contract_payment_schedule 两表的关系与状态机：
//   - 取消/待支付订单不生成有效合同；其余订单按下单时间生成合同，编号 HT+日期+序号
//   - 签署状态 DRAFT/PENDING_SIGN/SIGNED/VOID/TERMINATED/RESCHEDULED，动作驱动流转
//   - 每份合同默认两期 50%+50%（预付款/尾款），大额合同刻意保留尾款待付/逾期
//     两种形态用于演示期次状态；乙方信息为公司快照，甲方取订单联系人
// 结束态区分（法律/财务含义不同，业务依据见 termination.ts 头部）：
//   - VOID 作废：未生效或已生效但零付款，无资金动作
//   - TERMINATED 终止：已生效（常已收款），按责任方结算，联动订单生成退款单
//   - RESCHEDULED 改期：非终态，表演日期顺延，已付款不退还、节点继续有效
// 一期不对接电子签平台：上传已签 PDF 即把待签署合同置为已签署。
// 接真接口后只把各函数体换成 request 调用，函数签名与页面不改名。
// TODO(server): 接 /admin/contracts 系列接口后替换本文件实现。
// ─────────────────────────────────────────────────────────────
import { orderStore } from '@/views/order/mock'
import type { OrderRow } from '@/views/order/types'
import { splitInstallments } from './installment'
import { availableActions, quoteTermination } from './termination'
import type {
  ContractRow,
  ContractSignStatus,
  PaymentSchedule,
  RescheduleContractForm,
  ScheduleStatus,
  TerminateContractForm,
} from './types'

/* ═══ 乙方（本公司）快照 ═══ */
const PARTY_B = {
  name: '杭州承飞科技有限公司',
  creditCode: '91330108MA2H7XK51P',
}
const TEMPLATE_CODE = 'STANDARD_PERFORMANCE'
const TEMPLATE_VERSION = 'v1.0'
const PAYMENT_TERMS =
  '签约付 50% 预付款，演出前 7 天付清尾款（里程碑分期，客户主动付款，不做自动代扣）'

/* ═══ 日期工具 ═══ */
const pad = (n: number): string => String(n).padStart(2, '0')

function dateOf(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 由订单状态推导初始签署状态 */
function deriveSignStatus(order: OrderRow, seq: number): ContractSignStatus {
  switch (order.status) {
    case 'PENDING_PAY':
      return 'DRAFT'
    case 'PENDING_ACCEPT':
      // 待接单里每隔 3 单留一份待客户回签，其余已在线签约
      return seq % 3 === 0 ? 'PENDING_SIGN' : 'SIGNED'
    default:
      return 'SIGNED'
  }
}

/** 造一份演示甲方证件号（脱敏；真实系统加密存储） */
function maskIdNo(phone: string): string {
  const tail = (phone.replace(/\D/g, '') || '0000').slice(-4)
  return `330108199${tail.padStart(4, '0')}****`
}

/** 构造两期付款计划（默认 50%+50%），按签署/演示形态填期次状态 */
function buildSchedules(
  contract: ContractRow,
  order: OrderRow,
  signStatus: ContractSignStatus,
  demo: 'normal' | 'pending-tail' | 'overdue-tail',
): PaymentSchedule[] {
  const total = contract.totalAmount
  // 两期 50%+50%，拆分口径（含奇数金额尾差兜底）统一走纯函数 installment.ts
  const [split1, split2] = splitInstallments(total, 2)
  const plan1 = split1.planAmount
  const plan2 = split2.planAmount
  const signDate = dateOf(contract.createdAt)
  const tailDue = order.performDate ? addDays(order.performDate, -7) : null

  const mk = (
    no: number,
    stageName: string,
    triggerEvent: string,
    dueDate: string | null,
    planAmount: number,
    ratio: number,
  ): PaymentSchedule => ({
    id: `${contract.id}-s${no}`,
    installmentNo: no,
    stageName,
    triggerEvent,
    dueDate,
    ratio,
    planAmount,
    paidAmount: 0,
    status: 'PENDING',
    paidAt: null,
  })

  const s1 = mk(1, '预付款', '合同签署完成', signDate, plan1, split1.ratio)
  const s2 = mk(2, '尾款', '演出前7天', tailDue, plan2, split2.ratio)

  if (signStatus === 'SIGNED') {
    // 预付款一律已结清
    s1.status = 'PAID'
    s1.paidAmount = plan1
    s1.paidAt = order.paidAt || contract.createdAt
    if (demo === 'pending-tail') {
      // 大额分期进行中：尾款待付
      s2.status = 'PENDING'
    } else if (demo === 'overdue-tail') {
      // 尾款逾期（演示红色预警）
      s2.status = 'OVERDUE'
    } else {
      s2.status = 'PAID'
      s2.paidAmount = plan2
      s2.paidAt = order.paidAt || contract.createdAt
    }
  }
  return [s1, s2]
}

/** 从订单派生一份合同 */
function buildContract(order: OrderRow, seq: number, demo: PaymentDemo): ContractRow {
  const created = order.createdAt ?? new Date().toISOString()
  const signStatus = deriveSignStatus(order, seq)
  const id = `c${seq}`
  const contractNo = `HT${dateOf(created).replace(/-/g, '')}-${String(seq).padStart(4, '0')}`

  const contract: ContractRow = {
    id,
    contractNo,
    orderId: order.id,
    templateCode: TEMPLATE_CODE,
    templateVersion: TEMPLATE_VERSION,
    partyAName: order.user?.nickname || order.contact?.name || '客户',
    partyAIdType: 'ID_CARD',
    partyAIdNo: maskIdNo(order.contact?.phone ?? order.user?.phone ?? ''),
    partyAContact: order.contact?.name || order.user?.nickname || '',
    partyAPhone: order.contact?.phone || order.user?.phone || '',
    partyBName: PARTY_B.name,
    partyBCreditCode: PARTY_B.creditCode,
    totalAmount: order.totalAmount ?? 0,
    paymentTerms: PAYMENT_TERMS,
    signStatus,
    esignFlowId: '',
    sealId: '',
    signedPdfUrl: '',
    partyASignedAt: null,
    partyBSignedAt: null,
    signedAt: null,
    voidReason: '',
    terminateReason: '',
    terminateResponsibility: '',
    terminatedAt: null,
    refundNo: '',
    rescheduleReason: '',
    rescheduleResponsibility: '',
    originalPerformDate: null,
    rescheduledPerformDate: null,
    rescheduledAt: null,
    createdAt: created,
    updatedAt: created,
    order: {
      orderNo: order.id,
      status: order.status,
      userId: order.userId,
      userNickname: order.user?.nickname,
      userPhone: order.user?.phone,
      droneCount: order.droneCount,
      duration: order.duration,
      performDate: order.performDate,
      timeSlot: order.timeSlot,
      venueName: order.venue?.name,
    },
    schedules: [],
  }

  contract.schedules = buildSchedules(contract, order, signStatus, demo)

  if (signStatus === 'SIGNED') {
    // 已签：补签署时间与 PDF 存档（演示地址）
    const signedAt = order.paidAt || created
    contract.partyASignedAt = signedAt
    contract.partyBSignedAt = signedAt
    contract.signedAt = signedAt
    contract.signedPdfUrl = `/api/media/contract/${contractNo}.pdf`
  }
  return contract
}

/** 尾款演示形态：仅对大额已签合同保留待付/逾期，其余正常结清 */
type PaymentDemo = 'normal' | 'pending-tail' | 'overdue-tail'

/** 生成全量种子合同（取消/超时/待支付里未成立的订单跳过） */
function seedContracts(): ContractRow[] {
  const valid = orderStore.rows.filter(
    (o) => o.status !== 'CANCELLED' && !(o.status === 'PENDING_PAY' && !o.payChannel),
  )
  // 已签大额合同候选（用于安排尾款待付/逾期演示）
  const signedLargeIdx: number[] = []
  valid.forEach((o, i) => {
    if (deriveSignStatus(o, i + 1) === 'SIGNED' && (o.totalAmount ?? 0) >= 50000) {
      signedLargeIdx.push(i)
    }
  })
  const pendingTailIdx = signedLargeIdx.length ? signedLargeIdx[signedLargeIdx.length - 1] : -1
  const overdueTailIdx = signedLargeIdx.length > 1 ? signedLargeIdx[0] : -1

  return valid.map((order, i) => {
    const seq = i + 1
    let demo: PaymentDemo = 'normal'
    if (i === pendingTailIdx) demo = 'pending-tail'
    else if (i === overdueTailIdx) demo = 'overdue-tail'
    return buildContract(order, seq, demo)
  })
}

/** 可变副本：动作直接改内存，刷新页面回滚到种子 */
const contractStore: { rows: ContractRow[] } = {
  rows: seedContracts(),
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

/* ═══ 查询（等价 GET /admin/contracts?keyword=&signStatus=）═══ */
export interface ContractQuery {
  keyword?: string
  signStatus?: string
}

export function queryContracts(q: ContractQuery = {}): ContractRow[] {
  let list = contractStore.rows
  if (q.signStatus) list = list.filter((c) => c.signStatus === q.signStatus)
  const kw = (q.keyword ?? '').trim()
  if (kw) {
    list = list.filter(
      (c) =>
        c.contractNo.includes(kw) ||
        c.orderId.includes(kw) ||
        c.partyAName.includes(kw) ||
        c.partyAPhone.includes(kw),
    )
  }
  return clone(list).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/* ═══ 详情（等价 GET /admin/contracts/:id，返回独立副本）═══ */
export function getContract(id: string): ContractRow {
  const target = contractStore.rows.find((c) => c.id === id)
  if (!target) throw new Error('合同不存在')
  return clone(target)
}

/** 列表付款进度汇总（已付/总额 + 期次统计），供列表列渲染 */
export function paymentSummary(c: ContractRow): {
  paidAmount: number
  paidStages: number
  totalStages: number
  settled: boolean
} {
  const paidAmount = c.schedules.reduce((sum, s) => sum + s.paidAmount, 0)
  const paidStages = c.schedules.filter((s) => s.status === 'PAID').length
  return {
    paidAmount,
    paidStages,
    totalStages: c.schedules.length,
    settled: paidStages === c.schedules.length && c.schedules.length > 0,
  }
}

/* ═══ 状态流转动作 ═══ */

function findById(id: string): ContractRow {
  const target = contractStore.rows.find((c) => c.id === id)
  if (!target) throw new Error('合同不存在')
  return target
}

/** 找到合同关联的真实订单行（终止/改期要联动写它） */
function findOrder(contract: ContractRow): OrderRow {
  const order = orderStore.rows.find((o) => o.id === contract.orderId)
  if (!order) throw new Error('关联订单不存在，无法联动')
  return order
}

function touch(c: ContractRow): void {
  c.updatedAt = new Date().toISOString()
}

/** 订单时间轴追加（复用订单域同款结构，保证订单详情能看到合同侧动作） */
function pushOrderTimeline(order: OrderRow, text: string): void {
  order.timeline = order.timeline ?? []
  order.timeline.push({ time: new Date().toISOString(), text })
}

/** 生成演示退款单号（真接口由后端发号；此处沿用拒单 R+订单号后缀的口径） */
function buildRefundNo(order: OrderRow, suffix = 'C'): string {
  return `R${order.id.slice(1)}${suffix}`
}

/** 操作闸门：页面操作列显隐/禁用统一读这里，与 termination 纯函数同源 */
export function getAvailableActions(
  id: string,
  isAdmin: boolean,
): ReturnType<typeof availableActions> {
  return availableActions(findById(id), isAdmin)
}

/** 提交签署：DRAFT → PENDING_SIGN（发起后等待客户回签/盖章） */
export function actSubmitSign(id: string): ContractRow {
  const c = findById(id)
  if (c.signStatus !== 'DRAFT') throw new Error('仅草稿状态的合同可提交签署')
  c.signStatus = 'PENDING_SIGN'
  touch(c)
  return clone(c)
}

/** 上传已签 PDF：PENDING_SIGN → SIGNED（一期电子签过渡方案） */
export function actUploadPdf(id: string, pdfUrl: string): ContractRow {
  const c = findById(id)
  if (c.signStatus !== 'PENDING_SIGN') throw new Error('仅待签署的合同可上传签署件')
  const url = pdfUrl.trim()
  if (!url) throw new Error('请填写已签署合同 PDF 的地址')
  const now = new Date().toISOString()
  c.signStatus = 'SIGNED'
  c.signedPdfUrl = url
  c.partyASignedAt = now
  c.partyBSignedAt = now
  c.signedAt = now
  touch(c)
  return clone(c)
}

/**
 * 作废合同：仅限「未生效」或「已生效但零付款」的合同，无资金动作。
 * 已收款合同不再允许直接作废——必须走 actTerminate 做结算（见 termination 闸门）。
 */
export function actVoid(id: string, reason: string): ContractRow {
  const c = findById(id)
  const r = reason.trim()
  if (!r) throw new Error('请填写作废原因')
  if (c.signStatus === 'VOID') throw new Error('合同已作废，无需重复操作')
  if (c.signStatus === 'TERMINATED') throw new Error('合同已终止，不能作废')
  const paid = c.schedules.reduce((sum, s) => sum + s.paidAmount, 0)
  const effective = c.signStatus === 'SIGNED' || c.signStatus === 'RESCHEDULED'
  if (effective && paid > 0) {
    throw new Error('该合同已收款，不能直接作废，请改用「终止」并完成退款结算')
  }
  c.signStatus = 'VOID'
  c.voidReason = r
  touch(c)
  // 同步把关联订单置为已取消（无资金的作废不产生退款单）
  const order = findOrder(c)
  order.status = 'CANCELLED'
  order.cancelReason = `合同作废：${r}`
  pushOrderTimeline(order, `合同 ${c.contractNo} 作废：${r}`)
  return clone(c)
}

/**
 * 终止合同（已生效/已收款）：按责任方结算，联动订单与付款计划。
 *
 * 联动（真接口应为一个后端本地事务，此处 mock 同步写内存）：
 *   合同 → TERMINATED；订单 → REFUNDING；生成 PENDING 退款单（后续在退款管理审批）；
 *   未到期付款计划冻结为终止态，已付期次保留留痕；全程写时间轴。
 *
 * @param isAdmin 终止涉及退款决策，仅 ADMIN 可调用（页面按钮已按此显隐，这里二次兜底）
 */
export function actTerminate(
  id: string,
  form: TerminateContractForm,
  isAdmin: boolean,
): ContractRow {
  if (!isAdmin) throw new Error('仅管理员可终止已生效合同')
  const c = findById(id)
  const gate = availableActions(c, isAdmin)
  if (!gate.canTerminate) throw new Error(gate.blockedReason || '当前合同状态不可终止')

  const reason = form.reason.trim()
  if (!reason) throw new Error('请填写终止原因')
  if (form.responsibility !== 'CUSTOMER' && form.responsibility !== 'VENDOR') {
    throw new Error('请选择终止责任方')
  }

  // 以纯函数试算为准二次校验，防止前端传入被篡改的比例/金额
  const quote = quoteTermination(c, form.responsibility)
  if (quote.paidAmount <= 0) {
    // 零付款的生效合同应走作废，终止无退款对象
    throw new Error('该合同尚无付款，请直接使用「作废」')
  }
  const refundAmount = Math.min(
    Math.max(0, Math.round(form.refundAmount * 100) / 100),
    quote.paidAmount,
  )
  if (form.ratio !== quote.ratio) {
    // 比例以服务端试算为准（mock 内即纯函数结果），不一致直接纠正而非放行
    form.ratio = quote.ratio
  }

  const now = new Date().toISOString()
  const order = findOrder(c)

  // 1) 合同置终止，留痕责任方、原因、结算口径
  c.signStatus = 'TERMINATED'
  c.terminateResponsibility = form.responsibility
  c.terminateReason = reason
  c.terminatedAt = now
  touch(c)

  // 2) 付款计划：未到期期次冻结（不再催收），已付期次保留 PAID 作为退款基数凭证
  c.schedules.forEach((s) => {
    if (s.status !== 'PAID') {
      s.status = 'PENDING'
      s.triggerEvent = `合同终止，本期不再收款（${s.triggerEvent}）`
    }
  })

  // 3) 生成待审批退款单（挂到订单上，退款管理页即可检索/审批）
  const refundNo = buildRefundNo(order)
  c.refundNo = refundNo
  const fullReason =
    `合同终止（${form.responsibility === 'VENDOR' ? '我方原因' : '客户原因'}）：${reason}` +
    `｜${quote.ruleLabel}｜试算比例 ${Math.round(quote.ratio * 100)}%`
  order.refund = {
    reason: fullReason,
    ratio: quote.ratio,
    applyAmount: quote.refundAmount,
    status: 'PENDING',
    prevStatus: order.status,
    refundAmount,
    refundNo,
    createdAt: now,
  }
  order.status = 'REFUNDING'
  pushOrderTimeline(
    order,
    `合同 ${c.contractNo} 终止（${form.responsibility === 'VENDOR' ? '我方' : '客户'}原因），` +
      `已付 ¥${quote.paidAmount}，申请退款 ¥${refundAmount}，待退款审批`,
  )
  return clone(c)
}

/**
 * 改期：生效合同顺延表演日期，合同继续有效（置 RESCHEDULED 标记）。
 * 已付款不产生退款、付款节点按原节点继续有效（H5 条款 reschedule：已发生成本不变）。
 */
export function actReschedule(id: string, form: RescheduleContractForm): ContractRow {
  const c = findById(id)
  const gate = availableActions(c, true)
  if (!gate.canReschedule) throw new Error(gate.blockedReason || '当前合同状态不可改期')
  const reason = form.reason.trim()
  if (!reason) throw new Error('请填写改期说明')
  if (!form.newPerformDate) throw new Error('请选择新的表演日期')
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`
  if (form.newPerformDate < todayStr) throw new Error('新表演日期不能早于今天')
  if (form.newPerformDate === c.order.performDate)
    throw new Error('新日期与原表演日期相同，无需改期')

  const now = new Date().toISOString()
  const order = findOrder(c)

  // 首次改期留底原日期；多次改期保留最初的原始日期
  if (c.originalPerformDate === null) c.originalPerformDate = c.order.performDate ?? null
  c.rescheduledPerformDate = form.newPerformDate
  c.rescheduleReason = reason
  c.rescheduleResponsibility = form.responsibility
  c.rescheduledAt = now
  c.signStatus = 'RESCHEDULED'
  touch(c)

  // 同步订单表演日期（订单状态不变，款项节点继续有效）
  order.performDate = form.newPerformDate
  c.order.performDate = form.newPerformDate
  const reasonText = `${form.reasonType}｜${form.responsibility === 'VENDOR' ? '我方原因' : '客户原因'}：${reason}`
  pushOrderTimeline(
    order,
    `合同 ${c.contractNo} 改期：${c.originalPerformDate} → ${form.newPerformDate}（${reasonText}）`,
  )
  return clone(c)
}

/** 终止试算透传：页面弹窗打开时拿试算结果（不落库） */
export function previewTermination(
  id: string,
  responsibility: ContractRow['terminateResponsibility'],
): ReturnType<typeof quoteTermination> {
  return quoteTermination(findById(id), responsibility as 'CUSTOMER' | 'VENDOR')
}

/** 期次状态字典重导出（页面少引一处） */
export type { ScheduleStatus }
