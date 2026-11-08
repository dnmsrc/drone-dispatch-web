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
  /** 分页条已占的高度（无分页传 0） */
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
 * 找最近的纵向可滚动祖先（overflow-y auto/scroll/overlay），返回它的底缘；
 * 没有则返回视口高。布局是 .app-main 内部滚动 + 窗口不滚两种世界都能覆盖。
 */
export function visibleBottomLimit(el: HTMLElement, innerHeight: number): number {
  let node = el.parentElement
  while (node && node !== document.body) {
    const style = getComputedStyle(node)
    if (/auto|scroll|overlay/.test(style.overflowY)) {
      return Math.min(innerHeight, node.getBoundingClientRect().bottom)
    }
    node = node.parentElement
  }
  return innerHeight
}
