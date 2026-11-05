// ─────────────────────────────────────────────────────────────
// 弹窗上下文：内容组件可通过 inject 拿到"关闭/取消/loading"能力，
// 与 defineDialog 注入给组件的 props.dialog 是同一个对象。
// ─────────────────────────────────────────────────────────────
import { inject } from 'vue'
import type { InjectionKey } from 'vue'
import type { DialogContext } from './types'

/** 弹窗上下文注入键（内部使用，业务代码用 useDialogContext） */
export const DIALOG_CONTEXT_KEY: InjectionKey<DialogContext> = Symbol('proDialogContext')

/**
 * 在弹窗内容组件里获取上下文：
 *   const dialog = useDialogContext<Order>()
 *   dialog?.close(row)      // 关闭并回传结果
 *   dialog?.cancel()        // 关闭并标记取消
 * 不在弹窗内调用时返回 undefined。
 */
export function useDialogContext<T = unknown>(): DialogContext<T> | undefined {
  return inject(DIALOG_CONTEXT_KEY, undefined) as DialogContext<T> | undefined
}
