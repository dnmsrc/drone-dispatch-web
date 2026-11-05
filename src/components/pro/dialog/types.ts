// ─────────────────────────────────────────────────────────────
// 弹窗（ProDialog）类型契约 —— 包裹器模式
//
// 用法分两步：
//   1) 每个弹窗写一个「配置文件」（xxx.dialog.ts），用 defineDialog 把弹窗包起来：
//
//        export const orderDialog = defineDialog({ name: 'order', component: OrderDialog, title: '订单' })
//
//   2) 业务代码直接引入这个配置文件，用包裹器提供的方法：
//
//        import { orderDialog } from '@/dialogs/order.dialog'
//        orderDialog.open(params, { onOk, onCancel })   // 打开
//        orderDialog.close()                            // 程序化关闭
//        orderDialog.destroy()                          // 立即销毁（不播关闭动画）
//
// 弹窗组件本身不认识"弹窗"这件事，它通过 useDialogContext() 或 props.dialog 拿到
// close / cancel / setLoading，主动把结果交回调用方。
// ─────────────────────────────────────────────────────────────
import type { Component, VNodeChild } from 'vue'
import type { FormFieldConfig } from '../types'

/** 弹窗关闭动作：确定按钮 / 取消按钮 / 右上角关闭（含遮罩、ESC）/ 程序化关闭 */
export type DialogAction = 'ok' | 'cancel' | 'close'

/**
 * 注入给弹窗内容组件的上下文（两种获取方式，指向同一个对象）：
 *   - props：组件里声明 `props: ['dialog']`
 *   - inject：`const dialog = useDialogContext()!`
 */
export interface DialogContext<T = unknown> {
  /** 关闭弹窗并把结果交回调用方（等价于点"确定"） */
  close: (value?: T) => void
  /** 关闭弹窗并标记为取消（结果 null） */
  cancel: () => void
  /** 控制"确定"按钮的 loading（组件内部异步提交时用） */
  setLoading: (loading: boolean) => void
  /** 弹窗当前是否可见（关闭动画期间仍为 false） */
  getVisible: () => boolean
}

/** 弹窗内容：文本、VNode、或返回 VNode 的函数 */
export type DialogContent = string | VNodeChild | (() => VNodeChild)

/**
 * 配置项取值：可以写死，也可以写成函数按「本次 open 的参数」动态计算。
 * 例：title: (params) => (params.id ? `编辑订单 ${params.id}` : '新增订单')
 */
export type DialogValue<T, P> = T | ((params: P) => T)

/** 弹窗外观配置（与内容无关的部分） */
export interface DialogDisplayOptions<P = Record<string, unknown>> {
  /** 标题 */
  title?: DialogValue<string, P>
  /** 标题下方的补充说明（灰色小字） */
  description?: DialogValue<string, P>
  /** 宽度：数字按 px，默认 480 */
  width?: DialogValue<string | number, P>
  /** 距顶距离，默认由 Element 决定 */
  top?: string
  /** 全屏 */
  fullscreen?: boolean
  /** 是否显示遮罩，默认 true */
  modal?: boolean
  /** 点击遮罩是否关闭，默认 false（避免误触丢失表单） */
  closeOnClickModal?: boolean
  /** ESC 是否关闭，默认 true */
  closeOnPressEscape?: boolean
  /** 是否显示右上角关闭按钮，默认 true */
  showClose?: boolean
  /** 可拖拽，默认 false */
  draggable?: boolean
  /** 垂直居中，默认 true */
  alignCenter?: boolean
  /** 层级，不填自动按打开顺序递增 */
  zIndex?: number
  /** 附加到弹窗根元素的类名 */
  class?: string
  /** 是否显示底部按钮区，默认 true（内容想自管交互时传 false） */
  showFooter?: boolean
  /** 确定按钮文字，默认"确定" */
  okText?: DialogValue<string, P>
  /** 取消按钮文字，默认"取消" */
  cancelText?: DialogValue<string, P>
  /** 确定按钮类型，默认 primary */
  okType?: DialogValue<'primary' | 'success' | 'warning' | 'danger' | 'info', P>
  /** 透传给确定按钮的属性（如 disabled、plain） */
  okButtonProps?: Record<string, unknown>
  /** 透传给取消按钮的属性 */
  cancelButtonProps?: Record<string, unknown>
}

/** 表单模式的布局配置（只有 fields 模式用得上） */
export interface DialogFormOptions {
  /** 标签宽度，默认 96px */
  labelWidth?: string | number
  /** 默认栅格宽度，默认 24（单列） */
  defaultSpan?: number
  /** 栅格间距，默认 16 */
  gutter?: number
  /** 表单尺寸 */
  size?: 'large' | 'default' | 'small'
}

/**
 * 包裹器定义：describe 一个弹窗的全部静态信息。
 * 内容来源四种，优先级 component > fields > render > content。
 */
export interface DialogDefinition<P = Record<string, unknown>>
  extends DialogDisplayOptions<P>,
    DialogFormOptions {
  /** 包裹器名字：日志与调试用 */
  name?: string
  /** 内容来源①：自定义弹窗组件（组件内用 useDialogContext() 关闭并回传值） */
  component?: Component
  /** 内容来源②：配置式表单字段（复用 ProForm，确定时先校验再回传 model） */
  fields?: FormFieldConfig[]
  /** 内容来源③：渲染函数 */
  render?: (params: P) => VNodeChild
  /** 内容来源④：文本 / VNode（也可写成 (params) => …） */
  content?: DialogContent | ((params: P) => DialogContent)
  /** 传给内容组件的默认 props（open 时传入的 params 会覆盖同名项） */
  props?: Record<string, unknown>
  /** 表单模式的默认值（open 的 params 优先） */
  model?: Record<string, unknown> | ((params: P) => Record<string, unknown>)
  /** 非表单模式下"确定"的返回值，默认 true */
  okValue?: unknown | ((params: P) => unknown)
  /** 确定前钩子：返回 false / 抛异常都不关闭；返回 Promise 时按钮自动 loading */
  beforeOk?: (params: P) => boolean | void | Promise<boolean | void>
}

/** open 时传入的回调（与 Promise 结果并存，两者都会触发） */
export interface DialogCallbacks<R = unknown> {
  /** 点确定 / 内容组件 close(value) 之后 */
  onOk?: (result: R) => void
  /** 点取消按钮之后 */
  onCancel?: () => void
  /** 右上角关闭 / 遮罩 / ESC 之后；不传时回退到 onCancel */
  onClose?: () => void
  /** 本次打开专用的确定前钩子（覆盖定义里的 beforeOk） */
  beforeOk?: () => boolean | void | Promise<boolean | void>
}

/**
 * 第二个参数的两种写法：
 *   - 回调对象：{ onOk, onCancel, onClose, beforeOk }
 *   - 单个函数：关闭时调用一次，确定传结果值、取消/关闭传 null
 */
export type DialogCallbackArg<R = unknown> = DialogCallbacks<R> | ((result: R | null) => void)

/** defineDialog 的返回值：包裹器实例 */
export interface DialogWrapper<P = Record<string, unknown>, R = unknown> {
  /** 包裹器名字 */
  readonly name: string
  /** 当前是否有打开的实例（在 computed 里读取可响应） */
  readonly isOpen: boolean
  /**
   * 打开弹窗。
   * @param params 传给内容组件的 props / 表单初始值 / 渲染函数参数
   * @param callbacks 回调对象或单个函数
   * @returns 确定时 resolve 结果值，取消 / 关闭时 resolve null
   */
  open: (params?: P, callbacks?: DialogCallbackArg<R>) => Promise<R | null>
  /**
   * 程序化关闭：close() 视为取消（结果 null）；close(result) 视为确定并把 result 交回。
   * @returns 是否真的关闭了一个打开的弹窗
   */
  close: (result?: R) => boolean
  /** 立即销毁（不播关闭动画），Promise 以 null 结束；用于页面卸载/强制重置 */
  destroy: () => boolean
}

/** 宿主组件的配置：由 wrapper 把 DialogDefinition 解析成具体值后传入 */
export interface DialogHostOptions {
  title?: string
  description?: string
  width?: string | number
  top?: string
  fullscreen?: boolean
  modal?: boolean
  closeOnClickModal?: boolean
  closeOnPressEscape?: boolean
  showClose?: boolean
  draggable?: boolean
  alignCenter?: boolean
  zIndex?: number
  class?: string
  showFooter?: boolean
  okText?: string
  cancelText?: string
  okType?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  okButtonProps?: Record<string, unknown>
  cancelButtonProps?: Record<string, unknown>
  component?: Component
  fields?: FormFieldConfig[]
  render?: () => VNodeChild
  content?: string | VNodeChild
  props?: Record<string, unknown>
  model?: Record<string, unknown>
  okValue?: unknown
  beforeOk?: () => boolean | void | Promise<boolean | void>
  labelWidth?: string | number
  defaultSpan?: number
  gutter?: number
  size?: 'large' | 'default' | 'small'
}

/** 宿主暴露给外部的控制能力（wrapper.close / destroy 用） */
export interface DialogHostApi {
  /** 触发一次关闭：action 决定结果语义，value 为回传值 */
  close: (action: DialogAction, value?: unknown) => void
}
