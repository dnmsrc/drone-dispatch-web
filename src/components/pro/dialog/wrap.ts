// ─────────────────────────────────────────────────────────────
// 包裹器核心：wrapDialog
//
// 把一个「正常的业务弹窗组件」包成带基本动作的句柄：
//
//   ── OrderDialog.dialog.ts（与 OrderDialog.vue 平行的位置）──
//   import { wrapDialog } from '@/components/pro'
//   import OrderDialog from './OrderDialog.vue'
//
//   export const orderDialog = wrapDialog(OrderDialog, { name: 'order' })
//
//   ── 业务代码 ──
//   import { orderDialog } from './OrderDialog.dialog'
//   const data = await orderDialog.open({ id: 1 }, { onOk: (d) => save(d) })
//   orderDialog.close()          // 程序化关闭（= 取消）
//   orderDialog.close(row)       // 程序化关闭并把 row 当"确定结果"交回
//   orderDialog.destroy()        // 立即销毁
//   orderDialog.isOpen           // 是否打开（computed 里可响应）
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

/**
 * 定义一个弹窗句柄：把业务弹窗组件包起来，导出带 open / close / destroy 的对象。
 * @param component 业务弹窗组件（自己写 el-dialog，自己管 visible）
 * @param options 包裹器配置：名字 + 可选的默认动作覆盖 + 固定透传 props
 */
export function wrapDialog<P = Record<string, unknown>, R = unknown>(
  component: Component,
  options: WrapDialogOptions<P, R>,
): DialogController<P, R> {
  const name = options.name ?? 'dialog'

  /** 当前打开的实例；null 表示没有打开中的弹窗 */
  let mounted: ReturnType<typeof mountRunner> | null = null
  /** 是否打开（用 ref 保存，computed 里读取会被追踪） */
  const openState = ref(false)
  /**
   * 打开序号：关闭动画还没播完就再次 open 时，旧实例的 settle / closed
   * 回调据此不会误清新实例的状态。
   */
  let seq = 0

  /** 打开弹窗 */
  function open(params?: P, callbacks?: DialogCallbackArg<R>): Promise<R | null> {
    // 非浏览器环境直接返回，避免 SSR / 单测无 document 时报错
    if (typeof document === 'undefined') return Promise.resolve(null)

    const p = (params ?? {}) as P
    const cb = normalizeCallbacks(callbacks)
    const id = ++seq

    // 上一个实例还开着：先销毁（它自己的 Promise 会以 null 结束）
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
            resolve(value as R)
            return
          }

          try {
            if (action === 'cancel') cb.onCancel?.()
            else (cb.onClose ?? cb.onCancel)?.()
          } catch (error) {
            console.error(`[ProDialog] ${name}: 关闭回调执行出错`, error)
          }
          resolve(null)
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

  /** 程序化关闭：不传值视为取消，传值视为"确定并把值交回" */
  function close(result?: R): boolean {
    if (!mounted) return false
    mounted.close(result)
    return true
  }

  /** 立即销毁（不等关闭动画） */
  function destroy(): boolean {
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

