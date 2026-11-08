// ─────────────────────────────────────────────────────────────
// ProTable autoFit 计算内核单元测试
//
// calcAutoMaxHeight 是纯几何计算（可用高 = limit - top - bottomGap - pager，
// min 兜底）；findScrollParent / visibleBottomLimit / occupiedBelowToScroller
// 在 jsdom 里验证「找最近纵向滚动祖先」与「逐层累加分页区下方空间」的分支
// 判定（jsdom 中元素 rect 高恒为 0，链式 margin/padding 走内联样式可精确断言）。
// ─────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  belowSpaceToScroller,
  calcAutoMaxHeight,
  findScrollParent,
  occupiedBelowToScroller,
  visibleBottomLimit,
} from '../helpers'

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

describe('findScrollParent · 滚动容器定位', () => {
  it('无滚动祖先返回 null', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    expect(findScrollParent(el)).toBeNull()
    el.remove()
  })

  it('跳过 overflow:hidden，命中最近的 auto/scroll 祖先', () => {
    const scroller = document.createElement('div')
    scroller.style.overflowY = 'auto'
    const hidden = document.createElement('div')
    hidden.style.overflowY = 'hidden'
    const pager = document.createElement('div')
    scroller.appendChild(hidden)
    hidden.appendChild(pager)
    document.body.appendChild(scroller)
    expect(findScrollParent(pager)).toBe(scroller)
    scroller.remove()
  })
})

describe('occupiedBelowToScroller · 分页区下方全部占用', () => {
  /** 构造 consult 页同款链：pager(mt16) → proTable → card(mb16,pb16) → page(pb16) → scroller */
  function buildChain(): { pager: HTMLElement; scroller: HTMLElement; root: HTMLElement } {
    const scroller = document.createElement('div')
    scroller.style.overflowY = 'auto'
    const page = document.createElement('div')
    page.style.paddingBottom = '16px'
    const card = document.createElement('div')
    card.style.paddingBottom = '16px'
    card.style.marginBottom = '16px'
    const proTable = document.createElement('div')
    const pager = document.createElement('div')
    pager.style.marginTop = '16px'
    pager.style.marginBottom = '8px'
    proTable.appendChild(pager)
    card.appendChild(proTable)
    page.appendChild(card)
    scroller.appendChild(page)
    document.body.appendChild(scroller)
    return { pager, scroller, root: scroller }
  }

  it('累加分页 margin + 卡片 padding/margin + 页面 padding，到滚动容器 padding 为止', () => {
    // 16(mt) + 0(jsdom rect 高) + 8(mb) + 0(proTable 无样式) + 16+16(card) + 16(page pb) = 72
    const { pager, root } = buildChain()
    expect(occupiedBelowToScroller(pager)).toBe(72)
    root.remove()
  })

  it('滚动容器自身只算 padding-bottom，不再累加它的 margin', () => {
    const { pager, scroller, root } = buildChain()
    scroller.style.marginTop = '50px'
    scroller.style.marginBottom = '50px'
    scroller.style.paddingBottom = '4px'
    // 上面 72 里 page.pb 换成 scroller 之下：card/page 不变，scroller pb 额外 +4，margin 不计
    expect(occupiedBelowToScroller(pager)).toBe(76)
    root.remove()
  })

  it('无滚动祖先时以 body 为终点（body 自身 padding 不计入）', () => {
    const page = document.createElement('div')
    page.style.paddingBottom = '16px'
    const pager = document.createElement('div')
    pager.style.marginTop = '16px'
    page.appendChild(pager)
    document.body.appendChild(page)
    expect(occupiedBelowToScroller(pager)).toBe(32)
    page.remove()
  })
})

describe('belowSpaceToScroller · 元素下方剩余占用（不含本体）', () => {
  /** el(mb8)+sibA(mt10/mb10)+sibB(mt5) → card(pb16,mb16) → page(pb16) → scroller(pb4) */
  function buildWithSiblings(): { el: HTMLElement; root: HTMLElement } {
    const scroller = document.createElement('div')
    scroller.style.overflowY = 'auto'
    scroller.style.paddingBottom = '4px'
    const page = document.createElement('div')
    page.style.paddingBottom = '16px'
    const card = document.createElement('div')
    card.style.paddingBottom = '16px'
    card.style.marginBottom = '16px'
    const el = document.createElement('div')
    el.style.marginBottom = '8px'
    const sibA = document.createElement('div')
    sibA.style.marginTop = '10px'
    sibA.style.marginBottom = '10px'
    const sibB = document.createElement('div')
    sibB.style.marginTop = '5px'
    card.append(el, sibA, sibB)
    page.appendChild(card)
    scroller.appendChild(page)
    document.body.appendChild(scroller)
    return { el, root: scroller }
  }

  it('不含本体高度与 margin，逐个累加后续兄弟与祖先留白', () => {
    // 8(el mb) + 20(sibA mt+mb) + 5(sibB mt) + 32(card pb+mb) + 16(page pb) + 4(scroller pb) = 85
    const { el, root } = buildWithSiblings()
    expect(belowSpaceToScroller(el)).toBe(85)
    root.remove()
  })

  it('occupiedBelowToScroller = marginTop + 本体高(jsdom 为 0) + 下方占用', () => {
    const { el, root } = buildWithSiblings()
    el.style.marginTop = '16px'
    expect(occupiedBelowToScroller(el)).toBe(101)
    root.remove()
  })
})
