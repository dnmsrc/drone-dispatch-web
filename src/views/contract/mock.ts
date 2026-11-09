// ─────────────────────────────────────────────────────────────
// 电子合同 · 静态数据源（内存 CRUD，刷新页面即回滚到种子）
//
// 种子从订单域 orderStore 派生（合同与订单 1:1，订单创建即生成合同草稿），
// 复刻 contracts + contract_payment_schedule 两表的关系与状态机：
//   - 取消/待支付订单不生成有效合同；其余订单按下单时间生成合同，编号 HT+日期+序号
//   - 签署状态 DRAFT/PENDING_SIGN/SIGNED/VOID，动作驱动流转（见各 act*）
//   - 每份合同默认两期 50%+50%（预付款/尾款），大额合同刻意保留尾款待付/逾期
//     两种形态用于演示期次状态；乙方信息为公司快照，甲方取订单联系人
// 一期不对接电子签平台：上传已签 PDF 即把待签署合同置为已签署。
// 接真接口后只把各函数体换成 request 调用，函数签名与页面不改名。
// TODO(server): 接 /admin/contracts 系列接口后替换本文件实现。
// ─────────────────────────────────────────────────────────────
import { orderStore } from '@/views/order/mock'
import type { OrderRow } from '@/views/order/types'
import { splitInstallments } from './installment'
import type { ContractRow, ContractSignStatus, PaymentSchedule, ScheduleStatus } from './types'

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
    createdAt: created,
    updatedAt: created,
    order: {
      orderNo: order.id,
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

function touch(c: ContractRow): void {
  c.updatedAt = new Date().toISOString()
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

/** 作废合同：非作废态均可作废，原因必填（作废后付款计划保留为历史，不再收款） */
export function actVoid(id: string, reason: string): ContractRow {
  const c = findById(id)
  if (c.signStatus === 'VOID') throw new Error('合同已作废，无需重复操作')
  const r = reason.trim()
  if (!r) throw new Error('请填写作废原因')
  c.signStatus = 'VOID'
  c.voidReason = r
  touch(c)
  return clone(c)
}

/** 期次状态字典重导出（页面少引一处） */
export type { ScheduleStatus }
