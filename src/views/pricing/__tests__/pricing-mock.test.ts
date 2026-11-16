// ─────────────────────────────────────────────────────────────
// 计价管理 mock 业务规则单测（src/views/pricing/mock.ts）
//
// 覆盖：全量查询（含停用项、按 sort 升序）、单项启停/行内编辑（id/sort 不被覆盖）、
// 未知分组/不存在 id 抛错、定制标量范围校验（0-100000）、内存态重置。
// 与原型 mock-server/server.js 的 /admin/pricing 系列路由同口径。
// ─────────────────────────────────────────────────────────────
import { beforeEach, describe, expect, it } from 'vitest'
import { getPricing, resetPricingStore, saveCustomScalars, saveGroup, saveItem } from '../mock'

beforeEach(() => {
  resetPricingStore()
})

describe('pricing/mock · getPricing', () => {
  it('返回五个分组 + custom，且各分组按 sort 升序', () => {
    const d = getPricing()
    expect(d.tiers).toHaveLength(5)
    expect(d.durations).toHaveLength(3)
    expect(d.addons).toHaveLength(4)
    expect(d.patterns).toHaveLength(6)
    expect(d.refundRules).toHaveLength(4)
    expect(d.custom).toEqual({ customTextPrice: 2000, customLogoPrice: 5000 })
    for (const g of ['tiers', 'durations', 'addons', 'patterns', 'refundRules'] as const) {
      const sorts = d[g].map((x) => x.sort)
      expect([...sorts].sort((a, b) => a - b)).toEqual(sorts)
    }
  })

  it('返回的是副本，外部改动不污染内存态', () => {
    const d1 = getPricing()
    d1.tiers[0].price = 1
    const d2 = getPricing()
    expect(d2.tiers[0].price).not.toBe(1)
  })
})

describe('pricing/mock · saveItem 单项启停/编辑', () => {
  it('启停：只改命中项 status，停用后仍在全量视图里（含停用项）', () => {
    const target = getPricing().tiers[0]
    saveItem('tiers', target.id, { status: 0 })
    const after = getPricing()
    const row = after.tiers.find((x) => x.id === target.id)
    expect(row?.status).toBe(0)
    expect(after.tiers).toHaveLength(5)
  })

  it('行内编辑：业务字段更新，但 id/sort 不被入参覆盖', () => {
    const target = getPricing().tiers[0]
    saveItem('tiers', target.id, { price: 999, desc: '新场景', id: 'hacked', sort: 999 })
    const row = getPricing().tiers.find((x) => x.id === target.id)
    expect(row?.price).toBe(999)
    expect(row?.desc).toBe('新场景')
    expect(row?.id).toBe(target.id)
    expect(row?.sort).toBe(target.sort)
  })

  it('未知分组抛错', () => {
    expect(() => saveItem('unknown' as never, 'x', { status: 0 })).toThrow('未知的计价规则分区')
  })

  it('不存在的 id 抛错（对齐服务端 40400）', () => {
    expect(() => saveItem('tiers', 'not-exist', { price: 1 })).toThrow('计价规则项不存在')
  })
})

describe('pricing/mock · saveGroup 整组保存', () => {
  it('服务端补 sort、归一 status（非 0 即 1）', () => {
    saveGroup('addons', [
      { id: 'a1', key: 'k1', label: '服务一', price: 100, status: 0 },
      { id: 'a2', key: 'k2', label: '服务二', price: 200, status: 1 },
      { id: 'a3', key: 'k3', label: '服务三', price: 300 },
    ])
    const rows = getPricing().addons
    expect(rows.map((x) => x.sort)).toEqual([1, 2, 3])
    expect(rows.map((x) => x.status)).toEqual([0, 1, 1])
  })

  it('入参非数组抛错', () => {
    // 显式绕过类型，验证运行期校验
    expect(() => saveGroup('tiers', {} as unknown as unknown[])).toThrow('规则项参数错误')
  })
})

describe('pricing/mock · saveCustomScalars 定制标量', () => {
  it('只更新传入字段，范围 0-100000 合法', () => {
    const c = saveCustomScalars({ customTextPrice: 3000 })
    expect(c.customTextPrice).toBe(3000)
    expect(c.customLogoPrice).toBe(5000)
  })

  it('越界（负数 / 超上限）抛错且不写入', () => {
    expect(() => saveCustomScalars({ customTextPrice: -1 })).toThrow()
    expect(() => saveCustomScalars({ customLogoPrice: 100001 })).toThrow()
    expect(getPricing().custom).toEqual({ customTextPrice: 2000, customLogoPrice: 5000 })
  })
})
