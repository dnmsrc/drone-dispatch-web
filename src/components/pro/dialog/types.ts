// ─────────────────────────────────────────────────────────────
// 弹窗（ProDialog）类型契约 —— 包裹器架构
//
// 架构分三层：
//
//   ① 包裹器（框架提供）：定义弹窗的基本动作 open / close / destroy，负责挂载到 body
//   ② 业务弹窗组件（业务正常写）：自己写 <el-dialog>，自己管 visible，
//      也可以 defineExpose({ open, close }) 覆盖包裹器的默认动作
//   ③ 平行位置的 ts 配置文件：用包裹器把组件包起来并导出
//
//   ── 业务组件 OrderDialog.vue ──────────────────────────────
//   const { visible, params, close } = useDialog<Params, Data>()
//   <el-dialog v-model="visible" title="订单"> … </el-dialog>
//
//   ── 平行位置 OrderDialog.dialog.ts ────────────────────────
//   export const orderDialog = wrapDialog(OrderDialog, { name: 'order' })
//
//   ── 业务代码里 ────────────────────────────────────────────
//   import { orderDialog } from './OrderDialog.dialog'
//   const data = await orderDialog.open(params)
// ─────────────────────────────────────────────────────────────
import type { Component } from 'vue'
import type { Ref } from 'vue'
import type { FormFieldConfig } from '../types'

/** 弹窗关闭动作：确定 / 取消 / 右上角关闭（含遮罩、ESC） */
export type DialogAction = 'ok' | 'cancel' | 'close'

/**
 * 包裹器注入给弹窗组件的运行时上下文（组件里用 useDialog() 获取）。
 * 组件拿到它是为了三件事：
 *   - visible：绑给 <el-dialog v-model>，包裹器据此判断关闭、播放动画
 *   - params：本次 open 传入的参数
 *   - close / cancel：把结果交回调用方
 */
export interface DialogRuntime<P = Record<string, unknown>, R = unknown> {
  /** 弹窗是否可见：组件里 `v-model="visible"` 绑给 el-dialog */
  visible: Ref<boolean>
  /** 本次 open 传入的参数 */
  params: P
  /** 关闭并把结果交回调用方（语义 = 点"确定"） */
  close: (result?: R) => void
  /** 关闭并标记为取消（结果 null） */
  cancel: () => void
  /** 控制内置表单/确认框的按钮 loading（自建组件可不用） */
  setLoading: (loading: boolean) => void
}

/**
 * 弹窗组件可选暴露的动作：包裹器 close() / open() 时优先调用这里的方法，
 * 从而实现「业务组件覆盖默认打开、关闭」。
 *
 *   defineExpose({ open, close })   // 两个都可选，只写一个也行
 */
export interface DialogExposed<P = Record<string, unknown>, R = unknown> {
  /** 覆盖默认「打开」：默认动作只是把 visible 置 true */
  open?: (params: P, runtime: DialogRuntime<P, R>) => void | Promise<void>
  /** 覆盖默认「关闭」：默认动作是把 visible 置 false 并 settle 结果 */
  close?: (result: R | undefined, runtime: DialogRuntime<P, R>) => void
}

/** open 的第二个参数：回调对象 */
export interface DialogCallbacks<R = unknown> {
  /** 点确定 / 组件 close(value) 之后 */
  onOk?: (result: R) => void
  /** 点取消之后 */
  onCancel?: () => void
  /** 右上角关闭 / 遮罩 / ESC 之后；不传时回退到 onCancel */
  onClose?: () => void
}

/**
 * 第二个参数的两种写法：
 *   - 回调对象：{ onOk, onCancel, onClose }
 *   - 单个函数：关闭时调用一次，确定传结果值、取消/关闭传 null
 */
export type DialogCallbackArg<R = unknown> = DialogCallbacks<R> | ((result: R | null) => void)

/**
 * 包裹器配置（wrapDialog 的第二个参数）。
 * 除了 name，还可以覆盖默认动作 —— 但优先级低于业务组件自己 defineExpose 的方法。
 */
export interface WrapDialogOptions<P = Record<string, unknown>, R = unknown> {
  /** 包裹器名字：日志 / 调试用 */
  name: string
  /** 固定透传给弹窗组件的 props（每次都一样，组件也可以从 useDialog().params 拿） */
  props?: Record<string, unknown>
  /** 覆盖默认「打开」：组件没有 defineExpose({ open }) 时用这个 */
  open?: (params: P, runtime: DialogRuntime<P, R>) => void | Promise<void>
  /** 覆盖默认「关闭」：组件没有 defineExpose({ close }) 时用这个 */
  close?: (result: R | undefined, runtime: DialogRuntime<P, R>) => void
}

/**
 * wrapDialog 的返回值：这就是"弹窗句柄"。
 * 业务里 import 配置文件后直接用它：
 *   orderDialog.open(params, callbacks) / close() / destroy() / isOpen
 */
export interface DialogController<P = Record<string, unknown>, R = unknown> {
  /** 包裹器名字 */
  readonly name: string
  /** 当前是否有打开的实例（在 computed 里读取可响应） */
  readonly isOpen: boolean
  /**
   * 打开弹窗。每次 open 都会重新挂载，所以参数可以每次不同。
   * @param params 传给弹窗组件的参数（组件里 useDialog().params 或声明同名 props）
   * @param callbacks 回调对象，或单个函数
   * @returns 确定时 resolve 结果值，取消 / 关闭时 resolve null
   */
  open: (params?: P, callbacks?: DialogCallbackArg<R>) => Promise<R | null>
  /**
   * 程序化关闭：close() 视为取消（null）；close(result) 视为确定并回传 result。
   * @returns 是否真的关闭了一个打开的弹窗
   */
  close: (result?: R) => boolean
  /** 立即销毁（不播关闭动画），Promise 以 null 结束；用于页面卸载 / 强制重置 */
  destroy: () => boolean
}

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
  close?: (result: unknown, runtime: DialogRuntime) => void
}
