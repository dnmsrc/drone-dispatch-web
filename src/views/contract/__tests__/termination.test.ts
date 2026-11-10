// ─────────────────────────────────────────────────────────────
// 合同终止/改期纯逻辑单测（src/views/contract/termination.ts）
//
// 守住三条业务红线：
//   1) 我方原因终止恒为全额退款、零扣除；
//   2) 客户原因按距演出天数阶梯试算，可退 + 扣除 = 已付；
//   3) 操作闸门：终态/已履行只读，未生效只能作废，执行中仅管理员可强制终止。
// ─────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  CUSTOMER_REFUND_RULES,
  availableActions,
  daysUntil,
  matchCustomerRule,
  quoteTermination,
} from '../termination'
import type { ContractRow, PaymentSchedule } from '../types'

/** 构造一份最小可用合同（只填闸门/试算依赖的字段） */
function makeContract(over: Partial<ContractRow> = {}): ContractRow {
  const schedules: PaymentSchedule[] = [
    {
      id: 'c1-s1',
      installmentNo: 1,
      stageName: '预付款',
      triggerEvent: '合同签署完成',
      dueDate: null,
      ratio: 0.5,
      planAmount: 10000,
      paidAmount: 10000,
      status: 'PAID',
      paidAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: 'c1-s2',
      installmentNo: 2,
      stageName: '尾款',
      triggerEvent: '演出前7天',
      dueDate: null,
      ratio: 0.5,
      planAmount: 10000,
      paidAmount: 0,
      status: 'PENDING',
      paidAt: null,
    },
  ]
  return {
    id: 'c1',
    contractNo: 'HT20261101-0001',
    orderId: 'D1',
    templateCode: 'T',
    templateVersion: 'v1',
    partyAName: '客户',
    partyAIdType: 'ID_CARD',
    partyAIdNo: '',
    partyAContact: '',
    partyAPhone: '',
    partyBName: '公司',
    partyBCreditCode: '',
    totalAmount: 20000,
    paymentTerms: '',
    signStatus: 'SIGNED',
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
    createdAt: '',
    updatedAt: '',
    order: { orderNo: 'D1', status: 'ACCEPTED', performDate: '' },
    schedules,
    ...over,
  }
}

/** 造一个距今天 N 天的演出日期字符串 YYYY-MM-DD */
function dateInDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

describe('contract/termination · daysUntil', () => {
  it('明天=1、今天=0、昨天=-1，非法日期返回 null', () => {
    expect(daysUntil(dateInDays(1))).toBe(1)
    expect(daysUntil(dateInDays(0))).toBe(0)
    expect(daysUntil(dateInDays(-1))).toBe(-1)
    expect(daysUntil(null)).toBeNull()
    expect(daysUntil('not-a-date')).toBeNull()
  })
})

describe('contract/termination · matchCustomerRule', () => {
  it('阶梯边界：>=7 天 90%，3~6 天 50%，<3 天 20%', () => {
    expect(matchCustomerRule(10).ratio).toBe(0.9)
    expect(matchCustomerRule(7).ratio).toBe(0.9)
    expect(matchCustomerRule(6).ratio).toBe(0.5)
    expect(matchCustomerRule(3).ratio).toBe(0.5)
    expect(matchCustomerRule(2).ratio).toBe(0.2)
    expect(matchCustomerRule(0).ratio).toBe(0.2)
    expect(matchCustomerRule(-5).ratio).toBe(0.2)
  })

  it('取不到演出日期时按最宽松档，避免误扣', () => {
    expect(matchCustomerRule(null).ratio).toBe(CUSTOMER_REFUND_RULES[0].ratio)
  })
})

describe('contract/termination · quoteTermination', () => {
  it('我方原因：恒全额退款、零扣除，比例 100%', () => {
    const c = makeContract({
      order: { orderNo: 'D1', status: 'ACCEPTED', performDate: dateInDays(1) },
    })
    const q = quoteTermination(c, 'VENDOR')
    expect(q.ratio).toBe(1)
    expect(q.paidAmount).toBe(10000)
    expect(q.refundAmount).toBe(10000)
    expect(q.deductAmount).toBe(0)
  })

  it('客户原因：可退 + 扣除 = 已付，且按阶梯比例', () => {
    const c = makeContract({
      order: { orderNo: 'D1', status: 'ACCEPTED', performDate: dateInDays(1) },
    })
    const q = quoteTermination(c, 'CUSTOMER')
    // 明天演出 → 20% 档
    expect(q.ratio).toBe(0.2)
    expect(q.refundAmount).toBe(2000)
    expect(q.deductAmount).toBe(8000)
    expect(q.refundAmount + q.deductAmount).toBe(q.paidAmount)
  })

  it('客户原因远期（>7天）退 90%', () => {
    const c = makeContract({
      order: { orderNo: 'D1', status: 'ACCEPTED', performDate: dateInDays(20) },
    })
    const q = quoteTermination(c, 'CUSTOMER')
    expect(q.ratio).toBe(0.9)
    expect(q.refundAmount).toBe(9000)
  })

  it('零付款合同：试算可退/扣除均为 0', () => {
    const c = makeContract({
      schedules: [
        {
          id: 'x',
          installmentNo: 1,
          stageName: '预付款',
          triggerEvent: '',
          dueDate: null,
          ratio: 1,
          planAmount: 20000,
          paidAmount: 0,
          status: 'PENDING',
          paidAt: null,
        },
      ],
    })
    const q = quoteTermination(c, 'CUSTOMER')
    expect(q.paidAmount).toBe(0)
    expect(q.refundAmount).toBe(0)
  })
})

describe('contract/termination · availableActions', () => {
  it('终态合同（VOID/TERMINATED）只读，无任何可推进动作', () => {
    expect(availableActions(makeContract({ signStatus: 'VOID' }), true).readonly).toBe(true)
    const t = availableActions(makeContract({ signStatus: 'TERMINATED' }), true)
    expect(t.canVoid).toBe(false)
    expect(t.canTerminate).toBe(false)
    expect(t.canReschedule).toBe(false)
  })

  it('未生效草稿/待签：只能作废，不能终止/改期', () => {
    const draft = availableActions(makeContract({ signStatus: 'DRAFT' }), true)
    expect(draft.canVoid).toBe(true)
    expect(draft.canTerminate).toBe(false)
    expect(draft.canReschedule).toBe(false)
  })

  it('已履行完毕（COMPLETED/REVIEWED）：全部禁止并给出原因', () => {
    const done = availableActions(
      makeContract({ order: { orderNo: 'D1', status: 'COMPLETED', performDate: dateInDays(-2) } }),
      true,
    )
    expect(done.canTerminate).toBe(false)
    expect(done.canReschedule).toBe(false)
    expect(done.blockedReason).toContain('履行完毕')
  })

  it('执行中：普通操作员不可终止，管理员可兜底强制终止，且不能改期', () => {
    const c = makeContract({
      order: { orderNo: 'D1', status: 'IN_SERVICE', performDate: dateInDays(0) },
    })
    expect(availableActions(c, false).canTerminate).toBe(false)
    const admin = availableActions(c, true)
    expect(admin.canTerminate).toBe(true)
    expect(admin.terminateRequiresAdmin).toBe(true)
    expect(admin.canReschedule).toBe(false)
  })

  it('生效未到场、已收款：可终止/改期，不可作废；零付款则可作废', () => {
    const paid = makeContract({
      order: { orderNo: 'D1', status: 'ACCEPTED', performDate: dateInDays(5) },
    })
    const g = availableActions(paid, true)
    expect(g.canTerminate).toBe(true)
    expect(g.canReschedule).toBe(true)
    expect(g.canVoid).toBe(false)

    const unpaid = makeContract({
      order: { orderNo: 'D1', status: 'ACCEPTED', performDate: dateInDays(5) },
      schedules: [
        {
          id: 'x',
          installmentNo: 1,
          stageName: '预付款',
          triggerEvent: '',
          dueDate: null,
          ratio: 1,
          planAmount: 20000,
          paidAmount: 0,
          status: 'PENDING',
          paidAt: null,
        },
      ],
    })
    expect(availableActions(unpaid, true).canVoid).toBe(true)
  })
})
