// ─────────────────────────────────────────────────────────────
// 包裹器核心：wrapDialog
//
// 职责边界（三层分开，互不越界）：
//   包裹器 —— "机制"：挂载 / 卸载组件、注入运行时上下文、收集结果。
//             只提供 confirm / cancel / close 这些「方法」，不提供按钮写法。
//   组件   —— "表现与时机"：什么时候显示、长什么样、按钮有几个、点了之后怎么关。
//   业务   —— 调一次 .open()，await 结果。不管弹窗怎么开、什么时候关，也不传按钮。
//
//   ── OrderDialog.dialog.ts（与 OrderDialog.vue 平行的位置）──
//   import { wrapDialog } from '@/components/pro'
//   import OrderDialog from './OrderDialog.vue'
//
//   // options.props 是中间层默认值（组件 withDefaults 最低，open 入参最高）
//   export const orderDialog = wrapDialog(OrderDialog, { name: 'order', props: { title: '订单' } })
//
//   ── 业务代码（只有 open，没有 close / destroy）──
//   import { orderDialog } from './OrderDialog.dialog'
//   const result = await orderDialog.open({ id: 1 })
//   if (result.action !== DialogAction.Confirm) return   // 用枚举判断，不判 null
//
//   ── 要自定义按钮：写一个自己的弹窗组件，按钮写在组件里，点击调 useDialog() 的方法 ──
//   const { visible, confirm, cancel, close } = useDialog<Params, Data, MyAction>()
//   <el-button @click="close(MyAction.Later, when)">稍后处理</el-button>
//   <el-button type="primary" @click="confirm(data)">确定</el-button>
//
// open() 的结果永远是 { action, data }：
//   confirm(data) → { action: Confirm, data }        // 带业务数据
//   cancel()      → { action: Cancel,  data: null }  // 用户点了取消
//   点 X / ESC    → { action: Close,   data: null }  // 用户没做决定
//   倒计时到点    → { action: Timeout, data }        // 弹窗自己关的，可顺带带回数据
//   业务自定义动作 → { action: 业务枚举, data }       // 比如「稍后提醒」+ 提醒时间
//   被新 open 顶掉 → { action: Replace, data: null }
//   程序化销毁    → { action: Destroy, data: null }
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
import { DialogAction } from './types'
import type {
  DialogCallbackArg,
  DialogCallbacks,
  DialogController,
  DialogDismissAction,
  DialogHandle,
  DialogResult,
  DialogResultDismissed,
  RunnerHooks,
  WrapDialogOptions,
} from './types'

/** 用户没做任何决定就结束的结果对象（取消 / 关闭 / 顶掉 / 销毁；不含超时） */
type NullDismissAction = Exclude<DialogDismissAction, DialogAction.Timeout>

function dismissed(action: NullDismissAction): DialogResultDismissed {
  return { action, data: null }
}

/** 回调参数归一化：对象形态直接用，函数形态展开成 onResult */
function normalizeCallbacks<TData, TAction extends string>(
  callbacks?: DialogCallbackArg<TData, TAction>,
): DialogCallbacks<TData, TAction> {
  if (!callbacks) return {}
  if (typeof callbacks === 'function') return { onResult: callbacks }
  return callbacks
}

/** 对外 controller → 内部句柄 的登记表（业务拿不到 close / destroy） */
const handles = new WeakMap<object, DialogHandle<unknown, unknown>>()

/**
 * 创建内部句柄：真正做挂载、收集结果、以及重复 open 时销毁旧实例。
 * @param component 业务弹窗组件（自己写 el-dialog，自己管 visible、自己写按钮）
 * @param options 包裹器配置：名字 + 可选的默认动作覆盖 + 固定透传 props
 */
function createHandle<
  P,
  R,
  A extends string = never,
>(
  component: Component,
  options: WrapDialogOptions<P, R, A>,
): DialogHandle<P, R, A> {
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
   * 重复 open / 程序化销毁时用它把上一份 Promise 以 Replace / Destroy 结束，
   * 避免悬挂（调用方会收到明确的 action，而不是收到一个"没结果"的 null）。
   */
  let pending: ((result: DialogResult<R, A>) => void) | null = null

  /** 结束当前实例的 Promise（顶掉 / 销毁：用户没做任何决定，data 必为 null） */
  function finishPending(action: NullDismissAction) {
    const resolve = pending
    pending = null
    if (resolve) resolve(dismissed(action) as DialogResult<R, A>)
  }

  /** 回调执行统一兜底：单个回调出错不影响其它回调与 Promise 结算 */
  function runCallback(label: string, fn: () => void) {
    try {
      fn()
    } catch (error) {
      console.error(`[ProDialog] ${name}: ${label} 回调执行出错`, error)
    }
  }

  /** 打开弹窗，返回"组件自己关掉之后"的「动作 + 数据」 */
  function open(
    params?: P,
    callbacks?: DialogCallbackArg<R, A>,
  ): Promise<DialogResult<R, A>> {
    // 非浏览器环境直接返回，避免 SSR / 单测无 document 时报错
    if (typeof document === 'undefined') return Promise.resolve(dismissed(DialogAction.Destroy))

    const p = (params ?? {}) as P
    const cb = normalizeCallbacks(callbacks)
    const id = ++seq

    // 上一次还开着（或者刚关、Promise 还没结束）：先以 Replace 结束它，再销毁实例
    finishPending(DialogAction.Replace)
    if (mounted) {
      const previous = mounted
      mounted = null
      previous.destroy()
    }

    const hooks: RunnerHooks = {
      open: options.open as RunnerHooks['open'],
      close: options.close as RunnerHooks['close'],
    }

    return new Promise<DialogResult<R, A>>((resolve) => {
      /** 结束本次 Promise，并避免误清后来者的 pending */
      const settleWith = (result: DialogResult<R, A>) => {
        if (pending === resolve) pending = null
        resolve(result)
      }
      pending = resolve

      const handle = mountRunner({
        component,
        params: (p && typeof p === 'object' ? p : {}) as Record<string, unknown>,
        extraProps: options.props,
        hooks,
        onSettle: ({ action, data }) => {
          if (seq === id) {
            mounted = null
            openState.value = false
          }

          // 组装结果：判断语义只看 action 枚举，data 是否有值由动作性质决定
          //   Confirm        —— 确认，一定带业务数据
          //   Timeout        —— 弹窗自己倒计时关闭，组件可顺带带回数据（也可没有）
          //   业务自定义动作 —— 比如「稍后提醒」，语义和数据都由业务定义
          //   其余框架动作    —— 取消 / 关闭 / 被顶掉 / 销毁，一律 data = null
          const isBuiltin = (value: string): value is DialogDismissAction =>
            (Object.values(DialogAction) as string[]).includes(value)

          let result: DialogResult<R, A>
          if (action === DialogAction.Confirm) {
            result = { action: DialogAction.Confirm, data: data as R }
          } else if (action === DialogAction.Timeout) {
            result = {
              action: DialogAction.Timeout,
              data: (data === undefined ? null : data) as R | null,
            }
          } else if (isBuiltin(action)) {
            result = dismissed(action as NullDismissAction) as DialogResult<R, A>
          } else {
            // 业务自定义动作（A 泛型经条件类型展开，这里结构与 DialogResultCustom 一致）
            result = {
              action: action as A,
              data: (data === undefined ? null : data) as R | null,
            } as DialogResult<R, A>
          }

          // 回调分发：onResult 任何动作都调；其余按动作类型精确分发
          runCallback('onResult', () => cb.onResult?.(result))
          if (action === DialogAction.Confirm) {
            runCallback('onConfirm', () => cb.onConfirm?.(data as R))
          } else if (action === DialogAction.Cancel) {
            runCallback('onCancel', () => cb.onCancel?.())
          } else if (action === DialogAction.Close) {
            runCallback('onClose', () => cb.onClose?.())
          } else if (action === DialogAction.Timeout) {
            runCallback('onTimeout', () => cb.onTimeout?.())
          } else if (isBuiltin(action)) {
            runCallback('onDismissed', () =>
              cb.onDismissed?.(result as DialogResultDismissed),
            )
          }
          // 业务自定义动作只有 onResult 会收到（按 action 分支处理，不套内置回调）

          settleWith(result)
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

  /** 程序化关闭（框架内部）：默认按「取消」结束，也可指定动作 */
  function close(action: DialogAction | A = DialogAction.Cancel, data?: R | null): boolean {
    if (!mounted) return false
    mounted.close(action, data ?? null)
    return true
  }

  /** 立即销毁（框架内部，不等关闭动画） */
  function destroy(): boolean {
    // 让调用方的 Promise 以 Destroy 结束，避免悬挂
    finishPending(DialogAction.Destroy)
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
 * @param component 业务弹窗组件（自己写 el-dialog，自己管 visible、自己写按钮）
 * @param options 包裹器配置：名字 + 可选的默认动作覆盖 + 固定透传 props
 * @typeParam P 参数类型（open 传进去、组件里 props 拿到）
 * @typeParam R 业务数据类型（确认时回传）
 * @typeParam A 业务自定义关闭动作（一般直接传业务枚举类型，如 `OrderDialogAction`）
 * @returns 业务侧的弹窗对象：只有 name 和 open()
 */
export function wrapDialog<
  P = Record<string, unknown>,
  R = unknown,
  A extends string = never,
>(
  component: Component,
  options: WrapDialogOptions<P, R, A>,
): DialogController<P, R, A> {
  const handle = createHandle(component, options)

  // 业务侧只拿到 name + open：close / destroy / isOpen 属于包裹器内部机制，
  // 不交给调用方 —— 弹窗的生命周期由弹窗自己控制。
  const controller: DialogController<P, R, A> = Object.freeze({
    name: handle.name,
    open: (params?: P, callbacks?: DialogCallbackArg<R, A>) =>
      handle.open(params, callbacks),
  })

  handles.set(controller, handle as unknown as DialogHandle<unknown, unknown>)
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
export function getDialogHandle<
  P = Record<string, unknown>,
  R = unknown,
  A extends string = never,
>(
  controller: DialogController<P, R, A>,
): DialogHandle<P, R, A> {
  const handle = handles.get(controller as object)
  if (!handle) {
    throw new Error(
      '[ProDialog] getDialogHandle() 只能传入 wrapDialog / createFormDialog / confirmDialog 返回的对象。',
    )
  }
  return handle as unknown as DialogHandle<P, R, A>
}
