// ─────────────────────────────────────────────────────────────
// 演示用弹窗配置文件：普通消息弹窗
//
// 这就是"包裹器"的用法：一个弹窗一个配置文件，导出包裹器实例。
// 业务里 import 这个文件，就能用 messageDialog.open(...) / .close() / .destroy()。
// ─────────────────────────────────────────────────────────────
import { defineDialog } from '@/components/pro'

/** 打开时传入的参数（也可以理解为弹窗内容组件的 props） */
export interface MessageDialogParams {
  title?: string
  description?: string
  content: string
  okText?: string
}

/**
 * 消息弹窗：确定返回 true，取消 / 关闭返回 null。
 * 配置项写成函数时，每次 open 都会按本次参数重新计算（这里标题、文案、按钮文字都可变）。
 */
export const messageDialog = defineDialog<MessageDialogParams, boolean>({
  name: 'message',
  width: 480,
  title: (params) => params.title ?? '提示',
  description: (params) => params.description ?? '',
  content: (params) => params.content,
  okText: (params) => params.okText ?? '知道了',
  okValue: true,
})
