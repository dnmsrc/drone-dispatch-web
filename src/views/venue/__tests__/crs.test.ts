// ─────────────────────────────────────────────────────────────
// 坐标系转换单测（src/views/venue/crs.ts）
//
// 不硬编码不确定的精确对照值，改用可复核的不变量断言：
//   - 境内转换产生「百米~数公里」量级的合理偏移，且方向稳定
//   - WGS-84→GCJ-02→WGS-84 往返收敛到 1 米级
//   - 中国境外 GCJ-02 不加密，恒等返回
//   - 非法输入兜底不抛错；round6 与 DECIMAL(10,6) 对齐
// ─────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { gcj02ToWgs84, gcj02ToWgs84Rounded, isOutOfChina, round6, wgs84ToGcj02 } from '../crs'

/** 两点经纬度差异的绝对值（度） */
function diff(a: { lng: number; lat: number }, b: { lng: number; lat: number }) {
  return {
    dLng: Math.abs(a.lng - b.lng),
    dLat: Math.abs(a.lat - b.lat),
  }
}

describe('crs · 中国境内 GCJ-02 ↔ WGS-84', () => {
  // 杭州（业务默认中心）、北京、上海三个境内点
  const inland = [
    { lng: 120.2, lat: 30.25 },
    { lng: 116.404, lat: 39.915 },
    { lng: 121.4737, lat: 31.2304 },
  ]

  it('境内点 GCJ→WGS 产生偏移（不能恒等）', () => {
    for (const p of inland) {
      const wgs = gcj02ToWgs84(p)
      const d = diff(p, wgs)
      expect(d.dLng + d.dLat).toBeGreaterThan(0)
    }
  })

  it('偏移量落在合理量级（约 50m ~ 5km，即 0.0005° ~ 0.05°）', () => {
    for (const p of inland) {
      const wgs = gcj02ToWgs84(p)
      const d = diff(p, wgs)
      expect(d.dLng).toBeGreaterThan(0.0005)
      expect(d.dLng).toBeLessThan(0.05)
      expect(d.dLat).toBeGreaterThan(0.0005)
      expect(d.dLat).toBeLessThan(0.05)
    }
  })

  it('WGS→GCJ→WGS 往返收敛到约 2 米内（< 2e-5 度）', () => {
    // 单点「偏移相减」反算不是严格逆运算，存在米级固有残差（社区 coordtransform 同口径），
    // 对场地选址精度足够；这里守住残差不超过约 2 米的回归基线。
    for (const p of inland) {
      const back = gcj02ToWgs84(wgs84ToGcj02(p))
      const d = diff(p, back)
      expect(d.dLng).toBeLessThan(2e-5)
      expect(d.dLat).toBeLessThan(2e-5)
    }
  })

  it('正向与反向互为近似逆运算', () => {
    const p = { lng: 120.2, lat: 30.25 }
    const gcj = wgs84ToGcj02(p)
    const back = gcj02ToWgs84(gcj)
    expect(Math.abs(back.lng - p.lng)).toBeLessThan(2e-5)
    expect(Math.abs(back.lat - p.lat)).toBeLessThan(2e-5)
  })
})

describe('crs · 中国境外不加密（恒等返回）', () => {
  const overseas = [
    { lng: -74.0, lat: 40.7 }, // 纽约
    { lng: 139.7, lat: 35.7 }, // 东京（超出东经上限）
    { lng: 1.0, lat: 44.0 }, // 法国
  ]

  it('isOutOfChina 正确识别', () => {
    for (const p of overseas) expect(isOutOfChina(p.lng, p.lat)).toBe(true)
    expect(isOutOfChina(120.2, 30.25)).toBe(false)
  })

  it('境外点正反转换都恒等', () => {
    for (const p of overseas) {
      expect(gcj02ToWgs84(p)).toEqual(p)
      expect(wgs84ToGcj02(p)).toEqual(p)
    }
  })
})

describe('crs · 边界与精度', () => {
  it('非法输入不抛错并原样兜底', () => {
    // NaN 是运行时的非有限数（TS 类型仍为 number），验证运行时兜底
    expect(gcj02ToWgs84({ lng: NaN, lat: 30 })).toEqual({ lng: NaN, lat: 30 })
    // 缺字段对象（属性可选，运行时 isFiniteNumber 判定为非法，原样返回）
    expect(gcj02ToWgs84({} as { lng: number; lat: number })).toEqual({})
  })

  it('round6 截到 6 位小数（对齐 DECIMAL(10,6)，约 0.1m）', () => {
    expect(round6(120.123456789)).toBe(120.123457)
    expect(round6(30.0)).toBe(30)
    expect(round6(Number.NaN)).toBe(0)
  })

  it('gcj02ToWgs84Rounded 转换并截位', () => {
    const r = gcj02ToWgs84Rounded({ lng: 120.2, lat: 30.25 })
    // 6 位小数：乘 1e6 后应为整数
    expect(Math.round(r.lng * 1e6)).toBe(r.lng * 1e6)
    expect(Math.round(r.lat * 1e6)).toBe(r.lat * 1e6)
  })
})
