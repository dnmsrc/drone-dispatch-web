// ─────────────────────────────────────────────────────────────
// 弹窗组件里获取包裹器提供的运行时上下文
//
//   const { visible, params, close, cancel } = useDialog<OrderParams, Order>()
//
//   close(row)    // 关闭并把 row 交回调用方（= 点确定）
//   cancel()      // 关闭并标记取消（调用方拿到 null）
//
// 必须在「被 wrapDialog 包裹的组件」里调用；不在弹窗内会抛错，方便尽早发现用法错误。
// ─────────────────────────────────────────────────────────────
import { inject } from 'vue'
import type { InjectionKey } from 'vue'
import type { DialogRuntime } from './types'

/** 运行时上下文注入键（内部使用，业务用 useDialog） */
export const DIALOG_CONTEXT_KEY: InjectionKey<DialogRuntime> = Symbol('proDialogRuntime')

/**
 * 在弹窗组件里拿到包裹器的运行时上下文。
 * @example
 * const { visible, params, close } = useDialog<OrderFormParams, OrderFormData>()
 */
export function useDialog<P = Record<string, unknown>, R = unknown>(): DialogRuntime<P, R> {
  const runtime = inject(DIALOG_CONTEXT_KEY, null) as DialogRuntime<P, R> | null
  if (!runtime) {
    throw new Error(
      '[ProDialog] useDialog() 只能在弹窗组件里调用：请用 wrapDialog 把该组件包起来，再通过包裹器 .open() 打开。',
    )
  }
  return runtime
}
