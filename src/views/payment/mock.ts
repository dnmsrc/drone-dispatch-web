// ─────────────────────────────────────────────────────────────
// 支付流水 · 静态数据源（内存 store，刷新页面即回滚到种子）
//
// 独立于订单：一单可多次支付尝试，分期由 scheduleId 区分。种子从订单与
// 合同付款计划派生，刻意覆盖双通道 × 四状态：
//   - 在线支付（微信/支付宝）：成功 / 失败 / 关闭（超时），渠道回调驱动
//   - 对公转账：客户上传银行回单，PENDING 待人工核对 → 确认到账 SUCCESS
// 人工确认是本页唯一写动作（actConfirm），模拟 POST /admin/payments/:id/confirm。
// 接真接口后只把各函数体换成 request 调用，函数签名与页面不改名。
// TODO(server): 接 /admin/payments 后替换本文件实现。
// ─────────────────────────────────────────────────────────────
import { orderStore } from '@/views/order/mock'
import { queryContracts } from '@/views/contract/mock'
import type { OrderRow } from '@/views/order/types'
import type { PaymentOrderBrief, PaymentRow } from './types'

const pad = (n: number): string => String(n).padStart(2, '0')

function dateOf(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function brief(order: OrderRow): PaymentOrderBrief {
  return {
    orderNo: order.id,
    userNickname: order.user?.nickname,
    userPhone: order.user?.phone,
    totalAmount: order.totalAmount,
  }
}

/** 在线流水渠道号（与订单 mock 规则同形：WX/ALI + 日期 + 序号） */
function onlineTradeNo(channel: string, iso: string, seq: number): string {
  const prefix = channel === 'WECHAT' ? 'WX' : 'ALI'
  return `${prefix}${dateOf(iso).replace(/-/g, '')}${String(100000 + seq)}`
}

/* ═══ 种子生成 ═══ */
function seedPayments(): PaymentRow[] {
  const list: PaymentRow[] = []
  let seq = 0
  const contracts = queryContracts()

  /* ── 一、在线支付流水（已支付/失败/超时关闭的订单）── */
  orderStore.rows.forEach((order) => {
    if (!order.payChannel) {
      // 待支付 / 取消：造一条 PENDING（待支付）或 CLOSED（超时关闭）流水
      if (order.status === 'CANCELLED') {
        seq += 1
        list.push({
          id: `p${seq}`,
          orderId: order.id,
          scheduleId: null,
          stageName: '一次性付清',
          payMethod: 'ONLINE',
          channel: 'WECHAT',
          tradeNo: '',
          amount: order.totalAmount ?? 0,
          status: 'CLOSED',
          failReason: '支付超时，订单自动取消',
          voucherUrl: '',
          confirmBy: '',
          confirmedAt: null,
          paidAt: null,
          createdAt: order.createdAt ?? '',
          order: brief(order),
        })
      }
      return
    }

    // 成功在线支付
    seq += 1
    list.push({
      id: `p${seq}`,
      orderId: order.id,
      scheduleId: null,
      stageName: '一次性付清',
      payMethod: 'ONLINE',
      channel: order.payChannel,
      tradeNo: order.payTradeNo || onlineTradeNo(order.payChannel, order.createdAt ?? '', seq),
      amount: order.totalAmount ?? 0,
      status: 'SUCCESS',
      failReason: '',
      voucherUrl: '',
      confirmBy: '',
      confirmedAt: null,
      paidAt: order.paidAt ?? null,
      createdAt: order.createdAt ?? '',
      order: brief(order),
    })

    // 每 6 单补一条失败重试流水（演示 FAILED：余额不足，随后成功重试）
    if (seq % 6 === 0) {
      list.push({
        id: `p${seq}-f`,
        orderId: order.id,
        scheduleId: null,
        stageName: '一次性付清',
        payMethod: 'ONLINE',
        channel: order.payChannel,
        tradeNo: '',
        amount: order.totalAmount ?? 0,
        status: 'FAILED',
        failReason: '渠道返回：账户余额不足',
        voucherUrl: '',
        confirmBy: '',
        confirmedAt: null,
        paidAt: null,
        createdAt: order.createdAt ?? '',
        order: brief(order),
      })
    }
  })

  /* ── 二、对公转账流水（取合同里已逾期、客户已传回单待核对的尾款期次）──
     待付（PENDING）期次客户尚未发起付款，不产生流水；只有 OVERDUE 且已上传
     银行回单的期次才进入「待人工确认到账」队列。 */
  contracts.forEach((contract) => {
    const order = orderStore.rows.find((o) => o.id === contract.orderId)
    if (!order) return
    contract.schedules
      .filter((s) => s.status === 'OVERDUE')
      .forEach((s) => {
        seq += 1
        list.push({
          id: `p${seq}`,
          orderId: order.id,
          scheduleId: s.id,
          stageName: s.stageName,
          payMethod: 'OFFLINE',
          channel: 'OFFLINE',
          tradeNo: `BK${dateOf(order.createdAt ?? '').replace(/-/g, '')}${seq}`,
          amount: s.planAmount,
          status: 'PENDING',
          failReason: '',
          voucherUrl: `/api/media/voucher/${order.id}-${s.installmentNo}.jpg`,
          confirmBy: '',
          confirmedAt: null,
          paidAt: null,
          createdAt: order.createdAt ?? '',
          order: brief(order),
        })
      })
  })

  // 按创建时间倒序（与列表接口排序一致）
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** 可变副本 */
const paymentStore: { rows: PaymentRow[] } = {
  rows: seedPayments(),
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

/* ═══ 查询（等价 GET /admin/payments?keyword=&payMethod=&status=）═══ */
export interface PaymentQuery {
  keyword?: string
  payMethod?: string
  status?: string
}

export function queryPayments(q: PaymentQuery = {}): PaymentRow[] {
  let list = paymentStore.rows
  if (q.payMethod) list = list.filter((p) => p.payMethod === q.payMethod)
  if (q.status) list = list.filter((p) => p.status === q.status)
  const kw = (q.keyword ?? '').trim()
  if (kw) {
    list = list.filter(
      (p) =>
        p.id.includes(kw) ||
        p.orderId.includes(kw) ||
        p.tradeNo.includes(kw) ||
        (p.order.userNickname ?? '').includes(kw) ||
        (p.order.userPhone ?? '').includes(kw),
    )
  }
  return clone(list)
}

/** 对公到账人工确认：仅 OFFLINE + PENDING 可确认（模拟 POST /admin/payments/:id/confirm） */
export function actConfirm(id: string, operator: string): PaymentRow {
  const target = paymentStore.rows.find((p) => p.id === id)
  if (!target) throw new Error('支付流水不存在')
  if (target.payMethod !== 'OFFLINE') throw new Error('仅对公转账需要人工确认到账')
  if (target.status !== 'PENDING') throw new Error('当前流水状态不可确认')
  const now = new Date().toISOString()
  target.status = 'SUCCESS'
  target.confirmBy = operator || 'admin'
  target.confirmedAt = now
  target.paidAt = now
  if (!target.tradeNo) target.tradeNo = `BK${Date.now()}`
  return clone(target)
}
