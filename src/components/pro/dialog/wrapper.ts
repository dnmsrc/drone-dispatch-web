// ─────────────────────────────────────────────────────────────
// 包裹器核心：defineDialog
//
// 把「弹窗组件 + 弹窗配置」包成一个对象，导出后业务侧只认这个对象：
//
//   // ① 配置文件 src/dialogs/order.dialog.ts
//   import OrderDialog from '@/views/order/OrderDialog.vue'
//   export const orderDialog = defineDialog({ name: 'order', component: OrderDialog, title: '订单详情' })
//
//   // ② 业务里
//   import { orderDialog } from '@/dialogs/order.dialog'
//   orderDialog.open({ id: 1 }, { onOk: (data) => { … }, onCancel: () => { … } })
//   orderDialog.close()    // 程序化关闭（视为取消）
//   orderDialog.destroy()  // 立即销毁
//
// 每次 open 都会重新挂载一个宿主，所以 params 每次都能不同；
// 同一包裹器重复 open 时，上一个实例会被静默销毁（它的 Promise 以 null 结束）。
// ─────────────────────────────────────────────────────────────
import { ref } from 'vue'
import type { VNodeChild } from 'vue'
import { mountDialog } from './mount'
import type {
  DialogCallbackArg,
  DialogCallbacks,
  DialogDefinition,
  DialogHostOptions,
  DialogValue,
  DialogWrapper,
} from './types'

/** 配置项是函数时按本次 params 计算，否则原样返回 */
function resolveValue<T, P>(value: DialogValue<T, P>, params: P): T {
  return typeof value === 'function' ? (value as (p: P) => T)(params) : value
}

/** 把定义解析成宿主需要的具体值 */
function resolveOptions<P>(
  definition: DialogDefinition<P>,
  params: P,
  callbacks: Pick<DialogCallbacks<unknown>, 'beforeOk'>,
): DialogHostOptions {
  const { fields, component, render, content, model, okValue, beforeOk } = definition
  const isFn = <T>(value: unknown): value is (p: P) => T => typeof value === 'function'

  return {
    // 外观：函数形态的参数都按本次 params 求值
    title: definition.title === undefined ? undefined : resolveValue(definition.title, params),
    description:
      definition.description === undefined ? undefined : resolveValue(definition.description, params),
    width: definition.width === undefined ? undefined : resolveValue(definition.width, params),
    top: definition.top,
    fullscreen: definition.fullscreen,
    modal: definition.modal,
    closeOnClickModal: definition.closeOnClickModal,
    closeOnPressEscape: definition.closeOnPressEscape,
    showClose: definition.showClose,
    draggable: definition.draggable,
    alignCenter: definition.alignCenter,
    zIndex: definition.zIndex,
    class: definition.class,
    showFooter: definition.showFooter,
    okText: definition.okText === undefined ? undefined : resolveValue(definition.okText, params),
    cancelText:
      definition.cancelText === undefined ? undefined : resolveValue(definition.cancelText, params),
    okType: definition.okType === undefined ? undefined : resolveValue(definition.okType, params),
    okButtonProps: definition.okButtonProps,
    cancelButtonProps: definition.cancelButtonProps,

    // 内容来源
    component,
    fields,
    render: render ? () => (render as (p: P) => VNodeChild)(params) : undefined,
    content: isFn<VNodeChild>(content)
      ? ((content as (p: P) => VNodeChild)(params) as string | VNodeChild)
      : (content as string | VNodeChild | undefined),
    props: definition.props,
    model: isFn<Record<string, unknown>>(model)
      ? (model as (p: P) => Record<string, unknown>)(params)
      : (model as Record<string, unknown> | undefined),
    // 非表单模式的"确定"返回值，默认 true
    okValue: okValue === undefined ? true : resolveValue(okValue, params),
    // 本次 open 的回调钩子优先于定义里的钩子
    beforeOk:
      callbacks.beforeOk ??
      (beforeOk ? () => (beforeOk as (p: P) => boolean | void | Promise<boolean | void>)(params) : undefined),

    // 表单布局
    labelWidth: definition.labelWidth,
    defaultSpan: definition.defaultSpan,
    gutter: definition.gutter,
    size: definition.size,
  }
}

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
 * 定义一个弹窗包裹器。
 * @param definition 弹窗的全部静态配置（名称、内容来源、外观、表单字段、钩子）
 */
export function defineDialog<P = Record<string, unknown>, R = unknown>(
  definition: DialogDefinition<P>,
): DialogWrapper<P, R> {
  const name = definition.name ?? 'dialog'

  /** 当前打开的句柄；null 表示没有打开中的实例 */
  let mounted: ReturnType<typeof mountDialog> | null = null
  /** 是否打开（用 ref 保存，computed 里读取会被追踪） */
  const openState = ref(false)
  /**
   * 打开序号：同一包裹器可能在关闭动画还没播完时又被打开，
   * 旧实例的 finish / closed 回调据此不会误清新实例的状态。
   */
  let seq = 0

  /** 打开弹窗 */
  function open(params?: P, callbacks?: DialogCallbackArg<R>): Promise<R | null> {
    // 非浏览器环境直接返回，避免 SSR / 单测无 document 时报错
    if (typeof document === 'undefined') return Promise.resolve(null)

    const p = (params ?? {}) as P
    const cb = normalizeCallbacks(callbacks)
    const options = resolveOptions(definition, p, cb)
    const id = ++seq

    // 上一个实例还开着：先销毁（它自己的 Promise 会以 null 结束）
    if (mounted) {
      const previous = mounted
      mounted = null
      previous.destroy()
    }

    return new Promise<R | null>((resolve) => {
      const handle = mountDialog({
        options,
        params: p && typeof p === 'object' ? (p as Record<string, unknown>) : {},
        onFinish: ({ action, value }) => {
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
    if (result === undefined) mounted.close('cancel', null)
    else mounted.close('ok', result)
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
