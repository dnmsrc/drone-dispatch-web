// ─────────────────────────────────────────────────────────────
// 弹窗组件里获取包裹器提供的运行时上下文
//
//   const { visible, params, confirm, cancel, close } = useDialog<OrderParams, Order>()
//
//   confirm(row)                              // 确认：把 row 交回调用方（action = Confirm）
//   cancel()                                  // 取消（action = Cancel）
//   close(DialogAction.Timeout)               // 弹窗自己超时关闭
//   close(OrderDialogAction.SaveDraft, draft) // 业务自定义动作 + 数据
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
 * @typeParam P 本次 open 传入的参数类型
 * @typeParam R 确认时回传的业务数据类型
 * @typeParam A 业务自定义关闭动作（与 wrapDialog 的第三个类型参数保持一致）
 * @example
 * const { visible, params, confirm, cancel } = useDialog<OrderFormParams, OrderFormData>()
 */
export function useDialog<
  P = Record<string, unknown>,
  R = unknown,
  A extends string = never,
>(): DialogRuntime<P, R, A> {
  const runtime = inject(DIALOG_CONTEXT_KEY, null) as DialogRuntime<P, R, A> | null
  if (!runtime) {
    throw new Error(
      '[ProDialog] useDialog() 只能在弹窗组件里调用：请用 wrapDialog 把该组件包起来，再通过包裹器 .open() 打开。',
    )
  }
  return runtime
}
