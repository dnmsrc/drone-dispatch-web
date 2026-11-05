// ─────────────────────────────────────────────────────────────
// 命令式弹窗（ProDialog）类型契约
//
// 设计目标：把"打开弹窗 → 用户操作 → 拿到结果 → 继续执行"写成一段顺序代码，
// 不再需要在 template 里挂 <xxx-dialog v-model:visible> 和一堆 visible / loading 变量。
//
// 与外界的交互只有两种写法（都支持，可混用）：
//   1) Promise： const result = await openDialog({ ... })   → 结果为 null 表示取消/关闭
//   2) 回调：   openDialog({ ..., onOk: (v) => { ... } })
//
// 内容来源四种，优先级 component > fields > render > content：
//   - component：自定义内容组件（组件内通过 props.dialog 或 useDialogContext() 主动关闭并回传值）
//   - fields：  配置式表单，复用 ProForm，确定时先校验再回传 model
//   - render：  渲染函数
//   - content： 文本 / VNode / 返回 VNode 的函数
// ─────────────────────────────────────────────────────────────
import type { Component, VNodeChild } from 'vue'
import type { FormFieldConfig } from '../types'

/** 弹窗关闭动作：确定按钮 / 取消按钮 / 右上角关闭（含遮罩、ESC） */
export type DialogAction = 'ok' | 'cancel' | 'close'

/**
 * 注入给弹窗内容组件的上下文（两种获取方式）：
 *   - props：在组件里声明 `props: ['dialog']`
 *   - inject：`const dialog = useDialogContext()!`
 * 两者指向同一个对象。
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

/** 所有弹窗共用的配置 */
export interface DialogCommonOptions {
  /** 标题 */
  title?: string
  /** 标题下方的补充说明（灰色小字） */
  description?: string
  /** 宽度：数字按 px，默认 480 */
  width?: string | number
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
  /** 是否显示底部按钮区，默认 true（自定义内容想完全自管交互时传 false） */
  showFooter?: boolean
  /** 确定按钮文字，默认"确定" */
  okText?: string
  /** 取消按钮文字，默认"取消" */
  cancelText?: string
  /** 确定按钮类型，默认 primary */
  okType?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  /** 透传给确定按钮的属性（如 disabled、plain） */
  okButtonProps?: Record<string, unknown>
  /** 透传给取消按钮的属性 */
  cancelButtonProps?: Record<string, unknown>
  /**
   * 点确定时的前置钩子：
   *   - 返回 false → 不关闭（保留弹窗，通常配合 ElMessage 提示）
   *   - 抛异常 → 同样不关闭，异常由业务自己提示
   *   - 返回 Promise 时确定按钮自动进入 loading
   */
  beforeOk?: () => boolean | void | Promise<boolean | void>
  /** 确定后的回调（与 Promise 风格并存，两者都会触发；值类型见泛型 T） */
  onOk?: (value: unknown) => void
  /** 点取消按钮后的回调 */
  onCancel?: () => void
  /** 右上角关闭 / 遮罩 / ESC 关闭后的回调；不传时回退到 onCancel */
  onClose?: () => void
}

/** openDialog 的配置 */
export interface DialogOptions<T = unknown> extends DialogCommonOptions {
  /** 内容组件（优先级最高） */
  component?: Component
  /** 传给内容组件的 props（会自动追加 dialog 上下文与 close/cancel 事件） */
  props?: Record<string, unknown>
  /** 渲染函数 */
  render?: () => VNodeChild
  /** 纯内容 */
  content?: DialogContent
  /** 配置式表单字段（走 ProForm，确定时校验通过才关闭） */
  fields?: FormFieldConfig[]
  /** 表单初始值 */
  model?: Record<string, unknown>
  /** 表单标签宽度，默认 96px */
  labelWidth?: string | number
  /** 表单默认栅格宽度，默认 24（单列） */
  defaultSpan?: number
  /** 表单栅格间距，默认 16 */
  gutter?: number
  /** 表单尺寸 */
  size?: 'large' | 'default' | 'small'
  /** 非表单模式下"确定"的返回值，默认 true */
  okValue?: T
}

/** 表单弹窗：fields 必填，返回值为表单数据 */
export type FormDialogOptions<T = Record<string, unknown>> = DialogOptions<T> & {
  fields: FormFieldConfig[]
}

/** 确认框配置 */
export interface ConfirmDialogOptions extends DialogCommonOptions {
  /** 提示内容 */
  content?: string
  /** 语义类型，决定图标与确定按钮颜色，默认 warning */
  type?: 'warning' | 'danger' | 'info' | 'success'
  /** 自定义图标组件（不传按 type 取内置图标） */
  icon?: Component
}
