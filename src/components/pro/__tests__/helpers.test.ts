// ─────────────────────────────────────────────────────────────
// ProTable autoFit 计算内核单元测试
//
// calcAutoMaxHeight 是纯几何计算（可用高 = limit - top - bottomGap - pager，
// min 兜底）；visibleBottomLimit 在 jsdom 里验证「找最近纵向滚动祖先」的
// 分支判定（jsdom 中元素 rect 全 0：命中祖先分支必得 0，未命中返回 innerHeight）。
// ─────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { calcAutoMaxHeight, visibleBottomLimit } from '../helpers'

describe('calcAutoMaxHeight · 自适应高度标准', () => {
  it('空间充足：顶缘到底缘扣默认留白与分页条', () => {
    // 900(底缘) - 200(顶缘) - 24(bottomGap 默认) - 52(分页条) = 624
    expect(calcAutoMaxHeight({ top: 200, limit: 900, pagerHeight: 52 })).toBe(624)
  })

  it('无分页时不扣分页高度', () => {
    expect(calcAutoMaxHeight({ top: 100, limit: 700 })).toBe(576)
  })

  it('空间不足落到 min 兜底（此时允许页面整体滚动）', () => {
    expect(calcAutoMaxHeight({ top: 800, limit: 900 })).toBe(200)
  })

  it('bottomGap / min 可配置覆盖默认值', () => {
    expect(calcAutoMaxHeight({ top: 100, limit: 800, bottomGap: 8 })).toBe(692)
    expect(calcAutoMaxHeight({ top: 750, limit: 800, bottomGap: 8, min: 120 })).toBe(120)
  })

  it('容器已向下滚动（top 为负）时可用高相应增大', () => {
    expect(calcAutoMaxHeight({ top: -50, limit: 900 })).toBe(926)
  })

  it('向下取整，避免亚像素高度引发表格内部抖动', () => {
    expect(calcAutoMaxHeight({ top: 100.4, limit: 800 })).toBe(675)
  })

  it('异常量测（NaN）落到 min 而不是污染 maxHeight', () => {
    expect(calcAutoMaxHeight({ top: Number.NaN, limit: 900 })).toBe(200)
  })
})

describe('visibleBottomLimit · 滚动容器探测', () => {
  it('无滚动祖先时返回视口高', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    expect(visibleBottomLimit(el, window.innerHeight)).toBe(window.innerHeight)
    el.remove()
  })

  it('overflow-y:auto 的祖先生效（jsdom rect 为 0，命中即返回 0）', () => {
    const wrap = document.createElement('div')
    wrap.style.overflowY = 'auto'
    const el = document.createElement('div')
    wrap.appendChild(el)
    document.body.appendChild(wrap)
    expect(visibleBottomLimit(el, window.innerHeight)).toBe(0)
    wrap.remove()
  })

  it('overflow:hidden 不算滚动容器，继续向上找', () => {
    const hidden = document.createElement('div')
    hidden.style.overflowY = 'hidden'
    const scrollable = document.createElement('div')
    scrollable.style.overflowY = 'scroll'
    const el = document.createElement('div')
    scrollable.appendChild(hidden)
    hidden.appendChild(el)
    document.body.appendChild(scrollable)
    expect(visibleBottomLimit(el, window.innerHeight)).toBe(0)
    scrollable.remove()
  })

  it('祖先 overflow 为空（默认 visible）时按窗口处理', () => {
    const plain = document.createElement('div')
    const el = document.createElement('div')
    plain.appendChild(el)
    document.body.appendChild(plain)
    expect(visibleBottomLimit(el, window.innerHeight)).toBe(window.innerHeight)
    plain.remove()
  })
})
