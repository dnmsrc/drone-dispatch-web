// ─────────────────────────────────────────────────────────────
// 包裹器核心：wrapDialog
//
// 职责边界（三层分开，互不越界）：
//   包裹器 —— "机制"：挂载 / 卸载组件、注入运行时上下文、收集结果
//   组件   —— "表现与时机"：什么时候显示、长什么样、按钮点了之后怎么关
//   业务   —— 调一次 .open()，await 结果。不管弹窗怎么开、什么时候关
//
//   ── OrderDialog.dialog.ts（与 OrderDialog.vue 平行的位置）──
//   import { wrapDialog } from '@/components/pro'
//   import OrderDialog from './OrderDialog.vue'
//
//   export const orderDialog = wrapDialog(OrderDialog, { name: 'order' })
//
//   ── 业务代码（只有 open，没有 close / destroy）──
//   import { orderDialog } from './OrderDialog.dialog'
//   const data = await orderDialog.open({ id: 1 })
//   if (!data) return                    // null = 用户取消 / 点了 X
//
// 对外对象只暴露 name + open()：
//   close / destroy / isOpen 是包裹器内部句柄的能力（重复 open 时要销毁旧实例、
//   调试面板要验证包裹器行为），业务代码不需要也不应该控制弹窗生命周期。
//   调试 / 测试里确有必要时用 getDialogHandle()。
//
// 动作覆盖优先级（从高到低）：
//   ① 业务组件 defineExpose({ open, close })
//   ② wrapDialog 的 options.open / options.close
//   ③ 默认动作（visible 置 true/false + settle）
// ─────────────────────────────────────────────────────────────
import { ref } from 'vue'
import type { Component } from 'vue'
import { mountRunner } from './runner'
import type {
  DialogCallbackArg,
  DialogCallbacks,
  DialogController,
  DialogHandle,
  RunnerHooks,
  WrapDialogOptions,
} from './types'

/** 回调参数归一化：对象形态直接用，函数形态展开成 onOk / onCancel / onClose */
function normalizeCallbacks<R>(callbacks?: DialogCallbackArg<R>): DialogCallbacks<R> {
  if (!callbacks) return {}
  if (typeof callbacks === 'function') {
    return {
      onOk: (value) => callbacks(value),
      onCancel: () => callbacks(null),
      onClose: () => callbacks(null),
    }
  }
  return callbacks
}

/** 对外 controller → 内部句柄 的登记表（业务拿不到 close / destroy） */
const handles = new WeakMap<object, DialogHandle<unknown, unknown>>()

/**
 * 创建内部句柄：真正做挂载、收集结果、以及重复 open 时销毁旧实例。
 * @param component 业务弹窗组件（自己写 el-dialog，自己管 visible）
 * @param options 包裹器配置：名字 + 可选的默认动作覆盖 + 固定透传 props
 */
function createHandle<P, R>(
  component: Component,
  options: WrapDialogOptions<P, R>,
): DialogHandle<P, R> {
  const name = options.name ?? 'dialog'

  /** 当前打开的实例；null 表示没有打开中的弹窗 */
  let mounted: ReturnType<typeof mountRunner> | null = null
  /** 是否打开（用 ref 保存，调试面板 computed 里读取会被追踪） */
  const openState = ref(false)
  /**
   * 打开序号：关闭动画还没播完就再次 open 时，旧实例的 settle / closed
   * 回调据此不会误清新实例的状态。
   */
  let seq = 0
  /**
   * 当前实例的 Promise resolver。
   * 重复 open / 程序化销毁时用它把上一份 Promise 以 null 结束，避免悬挂。
   */
  let pending: ((value: R | null) => void) | null = null

  /** 结束当前实例的 Promise（null = 取消 / 被顶掉 / 销毁） */
  function finishPending(value: R | null) {
    const resolve = pending
    pending = null
    if (resolve) resolve(value)
  }

  /** 打开弹窗，返回"组件自己关掉之后"的结果 */
  function open(params?: P, callbacks?: DialogCallbackArg<R>): Promise<R | null> {
    // 非浏览器环境直接返回，避免 SSR / 单测无 document 时报错
    if (typeof document === 'undefined') return Promise.resolve(null)

    const p = (params ?? {}) as P
    const cb = normalizeCallbacks(callbacks)
    const id = ++seq

    // 上一次还开着（或者刚关、Promise 还没结束）：先以 null 结束它，再销毁实例
    finishPending(null)
    if (mounted) {
      const previous = mounted
      mounted = null
      previous.destroy()
    }

    const hooks: RunnerHooks = {
      open: options.open as RunnerHooks['open'],
      close: options.close as RunnerHooks['close'],
    }

    return new Promise<R | null>((resolve) => {
      /** 结束本次 Promise，并避免误清后来者的 pending */
      const settleWith = (value: R | null) => {
        if (pending === resolve) pending = null
        resolve(value)
      }
      pending = resolve

      const handle = mountRunner({
        component,
        params: (p && typeof p === 'object' ? p : {}) as Record<string, unknown>,
        extraProps: options.props,
        hooks,
        onSettle: ({ action, value }) => {
          if (seq === id) {
            mounted = null
            openState.value = false
          }

          if (action === 'ok') {
            try {
              cb.onOk?.(value as R)
            } catch (error) {
              console.error(`[ProDialog] ${name}: onOk 回调执行出错`, error)
            }
            settleWith(value as R)
            return
          }

          try {
            if (action === 'cancel') cb.onCancel?.()
            else (cb.onClose ?? cb.onCancel)?.()
          } catch (error) {
            console.error(`[ProDialog] ${name}: 关闭回调执行出错`, error)
          }
          settleWith(null)
        },
        onClosed: () => {
          if (seq === id) {
            mounted = null
            openState.value = false
          }
        },
      })

      mounted = handle
      openState.value = true
    })
  }

  /** 程序化关闭（框架内部）：不传值视为取消，传值视为"确定并把值交回" */
  function close(result?: R): boolean {
    if (!mounted) return false
    mounted.close(result)
    return true
  }

  /** 立即销毁（框架内部，不等关闭动画） */
  function destroy(): boolean {
    // 让调用方的 Promise 正常结束，避免悬挂
    finishPending(null)
    if (!mounted) return false
    const handle = mounted
    mounted = null
    openState.value = false
    handle.destroy()
    return true
  }

  return {
    name,
    get isOpen() {
      return openState.value
    },
    open,
    close,
    destroy,
  }
}

/**
 * 定义一个弹窗：把业务弹窗组件包起来，导出只带 open() 的对象。
 *
 * @param component 业务弹窗组件（自己写 el-dialog，自己管 visible）
 * @param options 包裹器配置：名字 + 可选的默认动作覆盖 + 固定透传 props
 * @returns 业务侧的弹窗对象：只有 name 和 open()
 */
export function wrapDialog<P = Record<string, unknown>, R = unknown>(
  component: Component,
  options: WrapDialogOptions<P, R>,
): DialogController<P, R> {
  const handle = createHandle(component, options)

  // 业务侧只拿到 name + open：close / destroy / isOpen 属于包裹器内部机制，
  // 不交给调用方 —— 弹窗的生命周期由弹窗自己控制。
  const controller: DialogController<P, R> = Object.freeze({
    name: handle.name,
    open: (params?: P, callbacks?: DialogCallbackArg<R>) => handle.open(params, callbacks),
  })

  handles.set(controller, handle as DialogHandle<unknown, unknown>)
  return controller
}

/**
 * 取包裹器内部句柄（close / destroy / isOpen）。
 *
 * 只给框架自身和调试 / 测试页面用；业务代码不要拿它去控制弹窗 ——
 * 业务只需要 `await xxx.open()` 拿结果。
 *
 * @param controller wrapDialog / createFormDialog / confirmDialog 返回的对象
 */
export function getDialogHandle<P = Record<string, unknown>, R = unknown>(
  controller: DialogController<P, R>,
): DialogHandle<P, R> {
  const handle = handles.get(controller as object)
  if (!handle) {
    throw new Error(
      '[ProDialog] getDialogHandle() 只能传入 wrapDialog / createFormDialog / confirmDialog 返回的对象。',
    )
  }
  return handle as DialogHandle<P, R>
}
