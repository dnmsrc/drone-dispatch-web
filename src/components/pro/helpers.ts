// ─────────────────────────────────────────────────────────────
// Pro* 组件共用的小工具（不依赖组件实例，纯函数）
// ─────────────────────────────────────────────────────────────
import type { FormFieldConfig } from './types'

/**
 * 字段默认值：
 *   - 显式配置 defaultValue 时用配置值（数组做浅拷贝，避免多实例共用同一数组）
 *   - 否则按控件类型推断：多值控件给 []（Element 对 null / undefined 数组值会报错）
 */
export function defaultValueOf(field: FormFieldConfig): unknown {
  if (field.defaultValue !== undefined) {
    return cloneValue(field.defaultValue)
  }
  const isArrayField =
    field.isRange === true ||
    ['checkbox', 'daterange', 'datetimerange'].includes(field.control ?? '') ||
    field.props?.multiple === true
  return isArrayField ? [] : undefined
}

/** 浅拷贝：数组 / 普通对象复制一层，其余原样返回 */
export function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return [...value]
  if (value && typeof value === 'object') return { ...(value as Record<string, unknown>) }
  return value
}

/** 查询条件的快照：去掉 undefined 后浅拷贝，避免外部持有组件内部引用 */
export function snapshotModel(model: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, val] of Object.entries(model)) {
    if (val === undefined) continue
    result[key] = cloneValue(val)
  }
  return result
}

/* ── autoFit 自适应高度（ProTable）────────────────────────── */

/** calcAutoMaxHeight 的入参：全部为已量测好的几何值，便于单测 */
export interface AutoFitMetrics {
  /** 表格顶缘相对视口的 y（getBoundingClientRect().top） */
  top: number
  /** 底部参考线：min(视口高, 最近滚动容器可见底缘) */
  limit: number
  /** 分页条本体高度（含其自身 margin，见 occupiedBelowToScroller；无分页传 0） */
  pagerHeight?: number
  /** 与底部参考线的留白，默认 24 */
  bottomGap?: number
  /** 可用高度下限，默认 200 */
  min?: number
}

/**
 * 自适应高度标准的计算内核：可用高 = limit - top - bottomGap - pagerHeight，
 * 不足 min 时取 min（此时允许页面整体滚动）。NaN/负 top（异常量测）同样落到 min。
 */
export function calcAutoMaxHeight(m: AutoFitMetrics): number {
  const bottomGap = m.bottomGap ?? 24
  const min = m.min ?? 200
  const avail = m.limit - m.top - bottomGap - (m.pagerHeight ?? 0)
  if (!Number.isFinite(avail)) return min
  return Math.max(min, Math.floor(avail))
}

/**
 * 找最近的纵向可滚动祖先（overflow-y auto/scroll/overlay）；没有返回 null。
 * 布局是 .app-main 内部滚动 + 窗口不滚两种世界都要覆盖，统一从这里取。
 */
export function findScrollParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement
  while (node && node !== document.body) {
    const style = getComputedStyle(node)
    if (/auto|scroll|overlay/.test(style.overflowY)) return node
    node = node.parentElement
  }
  return null
}

/**
 * 底部参考线 = min(视口高, 最近滚动容器可见底缘)；没有滚动祖先则用视口高。
 */
export function visibleBottomLimit(el: HTMLElement, innerHeight: number): number {
  const scroller = findScrollParent(el)
  if (!scroller) return innerHeight
  return Math.min(innerHeight, scroller.getBoundingClientRect().bottom)
}

/**
 * 「元素下方的全部剩余占用，直到最近滚动容器内容底缘」：
 *   el.marginBottom + 后续兄弟块（height + margin，逐个）
 *   + 逐级父层：padding-bottom，未到滚动容器再算该层 margin-top/bottom
 * 用途：算表格可用高必须扣净表格底缘以下的一切——分页条（margin-top 归入
 * 前一段：调用方传分页条时用「含本体」版本，见下）、卡片 padding/margin、
 * 页面 padding、以及演示页里排在表格后面的说明块。漏算任何一段，钳制阈值
 * 就虚高，固定高度的表格会把文档顶出页面滚动条（实测 consult 页漏 64px →
 * 8 行时页面滚动）。不含 el 自身高度与 margin-top；无滚动祖先时以 body 为
 * 终点（body 自身 padding 不计）。
 */
export function belowSpaceToScroller(el: HTMLElement): number {
  const stop = findScrollParent(el)
  let total = parseFloat(getComputedStyle(el).marginBottom) || 0
  let sibling = el.nextElementSibling
  while (sibling) {
    const s = getComputedStyle(sibling)
    total +=
      (parseFloat(s.marginTop) || 0) +
      sibling.getBoundingClientRect().height +
      (parseFloat(s.marginBottom) || 0)
    sibling = sibling.nextElementSibling
  }
  let node = el.parentElement
  while (node && node !== document.body && node !== document.documentElement) {
    const style = getComputedStyle(node)
    total += parseFloat(style.paddingBottom) || 0
    if (node === stop) break
    total += (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0)
    node = node.parentElement
  }
  return total
}

/**
 * 「从元素上外边距起，含本体高度，直到最近滚动容器内容底缘」的纵向总占用：
 * el.marginTop + height + belowSpaceToScroller(el)。给分页条用——分页区在
 * 表格之下的完整占用就是它（含 margin-top 的间隔、本体、其下全部留白）。
 */
export function occupiedBelowToScroller(el: HTMLElement): number {
  const style = getComputedStyle(el)
  return (
    (parseFloat(style.marginTop) || 0) +
    el.getBoundingClientRect().height +
    belowSpaceToScroller(el)
  )
}
