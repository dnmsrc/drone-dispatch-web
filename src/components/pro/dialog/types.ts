// ─────────────────────────────────────────────────────────────
// 弹窗（ProDialog）类型契约 —— 包裹器架构
//
// 架构分三层，职责严格分开：
//
//   ① 包裹器（框架提供）：定义弹窗的"机制" —— 挂载到 body、注入上下文、
//      收集结果、卸载。它只提供能力（visible / confirm / cancel / close），
//      不规定按钮长什么样；业务从不直接碰它。
//   ② 业务弹窗组件（业务正常写）：自己写 <el-dialog> 和自己的按钮，入参用标准
//      defineProps 接收，visible / 关闭能力用 useDialog() 拿，按钮点击就调这些方法，
//      自己决定什么时候关；也可以 defineExpose({ open, close }) 覆盖默认动作。
//   ③ 平行位置的 ts 配置文件：用包裹器把组件包起来并导出。
//
//   按钮一律内聚在弹窗组件内部，不从 open() 外部传入：
//   想改按钮（数量 / 文字 / 布局 / 业务动作），就写一个自己的弹窗组件，
//   在组件里写按钮、点击时调 useDialog() 的 confirm / cancel / close。
//   内置 confirmDialog / createFormDialog 只提供通用的「取消 / 确定」两组按钮。
//
//   入参三层默认（优先级从低到高）：
//     组件 withDefaults 默认 ＜ wrapDialog 的 options.props ＜ open() 入参
//
//   ── 业务组件 OrderDialog.vue ──────────────────────────────
//   const props = withDefaults(defineProps<Params>(), { title: '订单' })
//   const { visible, confirm, cancel } = useDialog<Params, Data>()
//   <el-dialog v-model="visible" :title="props.title"> … </el-dialog>
//   点确定 → confirm(form)；点取消 → cancel()
//
//   ── 平行位置 OrderDialog.dialog.ts ────────────────────────
//   export const orderDialog = wrapDialog(OrderDialog, { name: 'order', props: { … } })
//
//   ── 业务代码里（只调 open，等结果，不管生命周期）──────────
//   import { orderDialog } from './OrderDialog.dialog'
//   const result = await orderDialog.open(params)
//   if (result.action !== DialogAction.Confirm) return   // 明确标识，不用判 null
//   use(result.data)
//
//   ── 要自定义按钮（数量 / 业务动作）：写一个自己的弹窗组件 ──
//   const { visible, confirm, cancel, close } = useDialog<Params, Data, MyAction>()
//   <el-button @click="close(MyAction.Reject, reason)">驳回</el-button>
//   <el-button type="primary" @click="confirm(data)">通过</el-button>
// ─────────────────────────────────────────────────────────────
import type { Component } from 'vue'
import type { Ref } from 'vue'
import type { FormFieldConfig } from '../types'

// ─────────────────────────────────────────────────────────────
// 一、关闭动作（结果标识）
//
// open() 的返回值不是一个值，而是「动作 + 数据」：
//
//   { action: DialogAction.Confirm, data }   // 确认，带业务数据
//   { action: DialogAction.Cancel,  data: null }   // 点取消
//   { action: DialogAction.Close,   data: null }   // 点 X / ESC / 遮罩
//   { action: DialogAction.Timeout, data }         // 弹窗自己倒计时到点（可顺带带回数据）
//   { action: DialogAction.Replace, data: null }   // 被新的 open 顶掉
//   { action: DialogAction.Destroy, data: null }   // 程序化销毁
//
// 判断结果请一律用 action 枚举，不要用 data 是否为 null：
// 弹窗的关闭动作不止「确定 / 取消」两种，业务还可以定义自己的动作（见下面 A 泛型）。
// ─────────────────────────────────────────────────────────────

/** 弹窗关闭动作（框架内置的语义）—— 判断结果只看它 */
export enum DialogAction {
  /** 确认：业务主动带着数据关闭（弹窗里调 confirm(data)） */
  Confirm = 'confirm',
  /** 取消：用户点了「取消」按钮（弹窗里调 cancel()） */
  Cancel = 'cancel',
  /** 关闭：右上角 X / ESC / 点遮罩 —— 用户没做任何决定 */
  Close = 'close',
  /** 超时：弹窗自己倒计时到点关闭（业务侧只看到结果；组件可顺带带回数据） */
  Timeout = 'timeout',
  /** 顶掉：还没关完就再次 open()，上一份请求以这个动作结束 */
  Replace = 'replace',
  /** 销毁：程序化销毁（页面切走、框架重置，只在调试 / 框架内出现） */
  Destroy = 'destroy',
}

/** 框架内置的非确认动作集合（取消 / 关闭 / 超时 / 顶掉 / 销毁） */
export type DialogDismissAction = Exclude<DialogAction, DialogAction.Confirm>

/** 确认结果：action 一定是 Confirm，data 一定有值（类型收窄后可直接用） */
export interface DialogResultConfirmed<TData = unknown> {
  action: DialogAction.Confirm
  data: TData
}

/** 超时结果：弹窗自己倒计时关闭，data 可能有值也可能是 null（组件决定） */
export interface DialogResultTimeout<TData = unknown> {
  action: DialogAction.Timeout
  data: TData | null
}

/**
 * 用户没做任何决定就结束了（点取消 / X / 被顶掉 / 销毁）：data 一定是 null。
 * 注意不含 Timeout —— 超时关闭允许组件顺带带回数据（见 DialogResultTimeout）。
 */
export interface DialogResultDismissed {
  action: Exclude<DialogDismissAction, DialogAction.Timeout>
  data: null
}

/**
 * 业务自定义动作的结果（比如「保存草稿」「稍后提醒」「跳过」）。
 * TAction 是业务自己的动作枚举 / 字面量联合，见 wrapDialog 的第三个类型参数。
 */
export interface DialogResultCustom<TData = unknown, TAction extends string = never> {
  action: TAction
  data: TData | null
}

/**
 * open() 的结果。
 *
 * @typeParam TData 业务数据类型（确认时回传的那个）
 * @typeParam TAction 业务自定义动作（枚举类型）；不定义就没有第四个分支
 *
 * @example
 * const result = await orderDialog.open({ id: 1 })
 * switch (result.action) {
 *   case DialogAction.Confirm: save(result.data); break
 *   case DialogAction.Cancel:  break          // 用户点了取消
 *   case DialogAction.Close:   break          // 用户点了 X
 * }
 */
export type DialogResult<TData = unknown, TAction extends string = never> =
  | DialogResultConfirmed<TData>
  | DialogResultTimeout<TData>
  | DialogResultDismissed
  | ([TAction] extends [never] ? never : DialogResultCustom<TData, TAction>)

/** 是否为「确认」结果（带业务数据） */
export function isDialogConfirmed<TData, TAction extends string = never>(
  result: DialogResult<TData, TAction>,
): result is DialogResultConfirmed<TData> {
  return result.action === DialogAction.Confirm
}

/** 是否为「用户没做任何决定」（取消 / 关闭 / 顶掉 / 销毁；data 一定是 null） */
export function isDialogDismissed<TData, TAction extends string = never>(
  result: DialogResult<TData, TAction>,
): result is DialogResultDismissed {
  return (
    result.action !== DialogAction.Confirm &&
    result.action !== DialogAction.Timeout &&
    (result as { data?: unknown }).data === null
  )
}

// ─────────────────────────────────────────────────────────────
// 二、组件 ↔ 包裹器 的内部约定（业务调用方看不到）
// ─────────────────────────────────────────────────────────────

/**
 * 包裹器注入给弹窗组件的运行时上下文（组件里用 useDialog() 获取）。
 * 组件拿到它是为了三件事：
 *   - visible：绑给 <el-dialog v-model>，组件自己控制显示/隐藏
 *   - params：本次 open 传入的参数
 *   - confirm / cancel / close：组件关闭时把「动作 + 数据」交回调用方
 *
 * 这一层只提供「方法」，按钮怎么写、放几个，完全是组件自己的事。
 */
export interface DialogRuntime<P = Record<string, unknown>, R = unknown, A extends string = never> {
  /** 弹窗是否可见：组件里 `v-model="visible"` 绑给 el-dialog */
  visible: Ref<boolean>
  /** 本次 open 传入的参数 */
  params: P
  /** 确认：带着业务数据关闭（结果 action = DialogAction.Confirm） */
  confirm: (data: R) => void
  /** 取消：用户点了取消按钮（结果 action = DialogAction.Cancel） */
  cancel: () => void
  /**
   * 以指定动作关闭（弹窗自己决定关闭原因时用）：
   *   close(DialogAction.Timeout)                 // 倒计时到点
   *   close(OrderDialogAction.SaveDraft, draft)   // 业务自定义动作 + 数据
   */
  close: (action: DialogAction | A, data?: R | null) => void
}

/**
 * 弹窗组件可选暴露的动作：包裹器 open() / close() 时优先调用这里的方法，
 * 从而实现「业务组件覆盖默认打开、关闭」。
 *
 *   defineExpose({ open, close })   // 两个都可选，只写一个也行
 */
export interface DialogExposed<P = Record<string, unknown>, R = unknown, A extends string = never> {
  /** 覆盖默认「打开」：默认动作只是把 visible 置 true */
  open?: (params: P, runtime: DialogRuntime<P, R, A>) => void | Promise<void>
  /** 覆盖默认「关闭」：默认动作是 visible 置 false 并 settle 结果 */
  close?: (action: DialogAction | A, data: R | null, runtime: DialogRuntime<P, R, A>) => void
}

// ─────────────────────────────────────────────────────────────
// 三、open 的回调参数
// ─────────────────────────────────────────────────────────────

/**
 * open 的第二个参数：回调对象。
 * 优先用 onResult（拿到完整结果）；onConfirm / onCancel / onClose / onTimeout
 * 是「只关心某个动作」时的便捷写法。
 */
export interface DialogCallbacks<TData = unknown, TAction extends string = never> {
  /** 任何原因关闭都会调用一次，拿到「动作 + 数据」 */
  onResult?: (result: DialogResult<TData, TAction>) => void
  /** 仅确认（action = DialogAction.Confirm）：拿到业务数据 */
  onConfirm?: (data: TData) => void
  /** 仅取消（action = DialogAction.Cancel） */
  onCancel?: () => void
  /** 仅点 X / ESC / 遮罩（action = DialogAction.Close） */
  onClose?: () => void
  /** 仅弹窗自己超时关闭（action = DialogAction.Timeout） */
  onTimeout?: () => void
  /** 仅被新的 open 顶掉 / 程序化销毁（框架内部场景，调试用） */
  onDismissed?: (result: DialogResultDismissed) => void
}

/**
 * 第二个参数的两种写法：
 *   - 回调对象：{ onResult, onConfirm, onCancel, onClose, onTimeout }
 *   - 单个函数：关闭时调用一次，参数是完整的 DialogResult
 *
 * 两种写法都是 await 的补充（早期业务不习惯 await 时用），语义完全一致。
 */
export type DialogCallbackArg<TData = unknown, TAction extends string = never> =
  DialogCallbacks<TData, TAction> | ((result: DialogResult<TData, TAction>) => void)

// ─────────────────────────────────────────────────────────────
// 四、包裹器对外 API
// ─────────────────────────────────────────────────────────────

/**
 * 包裹器配置（wrapDialog 的第二个参数）。
 * 除了 name，还可以覆盖默认动作 —— 但优先级低于业务组件自己 defineExpose 的方法。
 */
export interface WrapDialogOptions<
  P = Record<string, unknown>,
  R = unknown,
  A extends string = never,
> {
  /** 包裹器名字：日志 / 调试用 */
  name: string
  /** 固定透传给弹窗组件的 props（每次都一样，组件也可以从 useDialog().params 拿） */
  props?: Record<string, unknown>
  /** 覆盖默认「打开」：组件没有 defineExpose({ open }) 时用这个 */
  open?: (params: P, runtime: DialogRuntime<P, R, A>) => void | Promise<void>
  /** 覆盖默认「关闭」：组件没有 defineExpose({ close }) 时用这个 */
  close?: (action: DialogAction | A, data: R | null, runtime: DialogRuntime<P, R, A>) => void
}

/**
 * 业务侧拿到的弹窗对象 —— 只有一件事：请求打开，然后等结果。
 *
 * 打开、关闭、销毁都是弹窗自己的事：
 *   - 打开：包裹器挂载组件、注入上下文，由组件自己把 visible 置 true
 *     （组件 defineExpose({ open }) 时，由组件写自己的打开逻辑）
 *   - 关闭：组件里的按钮 / X / 遮罩 / ESC / 倒计时，组件自己调
 *     confirm(data) / cancel() / close(action, data)
 *   - 业务代码只 await 结果，不参与弹窗生命周期的任何一环，也不往里传按钮
 */
export interface DialogController<
  P = Record<string, unknown>,
  R = unknown,
  A extends string = never,
> {
  /** 包裹器名字（日志 / 调试用） */
  readonly name: string
  /**
   * 打开弹窗，等它被组件自己关掉，拿到「动作 + 数据」。
   * @param params 传给弹窗组件的参数（组件用 defineProps 同名接收；与 wrapDialog 的
   *   options.props 合并，优先级高于 options.props，组件自身 props 默认值优先级最低）
   * @param callbacks 回调风格（可选），与 await 等价
   * @returns 一定 resolve（不会 reject）：action 是 DialogAction 枚举的成员
   */
  open: (params?: P, callbacks?: DialogCallbackArg<R, A>) => Promise<DialogResult<R, A>>
}

/**
 * 包裹器的内部句柄：在 DialogController 之上多了 close / destroy / isOpen。
 *
 * 这些是"机制"层面的能力（重复 open 时销毁旧实例、调试面板验证包裹器行为），
 * 只有框架自己用；业务代码不应该拿 —— 用 getDialogHandle() 仅在调试 / 测试里取。
 */
export interface DialogHandle<
  P = Record<string, unknown>,
  R = unknown,
  A extends string = never,
> extends DialogController<P, R, A> {
  /** 程序化关闭：不传动作视为取消（框架内部用） */
  close: (action?: DialogAction | A, data?: R | null) => boolean
  /** 立即销毁，不等关闭动画（框架内部用：重复 open、页面重置） */
  destroy: () => boolean
  /** 当前是否有打开的实例 */
  readonly isOpen: boolean
}

// ─────────────────────────────────────────────────────────────
// 五、内置弹窗（确认框 / 表单弹窗）的参数
// ─────────────────────────────────────────────────────────────

/** 内置确认框的参数 */
export interface ConfirmDialogParams {
  /** 提示内容 */
  content: string
  /** 标题，默认「提示」 */
  title?: string
  /** 语义类型，决定图标与确定按钮颜色，默认 warning */
  type?: 'warning' | 'danger' | 'info' | 'success'
  /** 自定义图标组件（不传按 type 取内置图标） */
  icon?: Component
  /** 确定按钮文字 */
  okText?: string
  /** 取消按钮文字 */
  cancelText?: string
  /** 确定按钮类型（不传时 danger 类型给 danger，其它给 primary） */
  okType?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  /** 确定前钩子：返回 false / 抛错都不关闭（可做异步校验，按钮自动 loading） */
  beforeOk?: () => boolean | void | Promise<boolean | void>
}

/** 内置表单弹窗的固定配置（fields 等外观配置，组件 props） */
export interface FormDialogProps {
  /** 配置式表单字段（与 ProForm 一致） */
  fields: FormFieldConfig[]
  /** 默认值；open 时传入的 params 会覆盖同名项 */
  model?: Record<string, unknown>
  /** 标题（params.title 优先） */
  title?: string
  /** 标题下的灰色说明 */
  description?: string
  /** 宽度，默认 640 */
  width?: string | number
  /** 标签宽度，默认 96px */
  labelWidth?: string | number
  /** 默认栅格宽度，默认 24 */
  defaultSpan?: number
  /** 栅格间距，默认 16 */
  gutter?: number
  /** 表单尺寸 */
  size?: 'large' | 'default' | 'small'
  /** 确定按钮文字，默认"确定" */
  okText?: string
  /** 取消按钮文字，默认"取消" */
  cancelText?: string
}

/**
 * 挂载引擎传给 Runner 的"默认动作覆盖"（内部类型）。
 * 来自 wrapDialog 的第二个参数，优先级低于业务组件的 defineExpose。
 */
export interface RunnerHooks {
  open?: (params: Record<string, unknown>, runtime: DialogRuntime) => void | Promise<void>
  close?: (
    action: DialogAction | string,
    data: unknown,
    runtime: DialogRuntime<Record<string, unknown>, unknown, string>,
  ) => void
}
