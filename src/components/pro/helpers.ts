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
