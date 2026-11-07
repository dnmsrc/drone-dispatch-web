// ─────────────────────────────────────────────────────────────
// 弹窗统一出口
//
//   import { wrapDialog, useDialog, DialogAction, confirmDialog, createFormDialog } from '@/components/pro'
//
// 用法（包裹器架构）：
//   ① 业务正常写弹窗组件（自己写 <el-dialog>，用 useDialog() 拿 visible，
//      自己决定什么时候关：底部按钮 / X / 遮罩都可以）
//   ② 与组件平行位置写 xxx.dialog.ts，用 wrapDialog 把它包成只带 open() 的对象
//   ③ 业务代码 import 这个 ts，`const result = await xxx.open(params)` 等结果
//
// 结果永远是 { action, data }：action 是 DialogAction 枚举（或业务自定义动作），
// 用它判断「确认 / 取消 / 点 X / 超时 / 被顶掉 / 销毁」，不要用 data 是否为 null 猜。
//
// 弹窗的打开 / 关闭 / 销毁属于弹窗自身与包裹器的职责，业务代码不参与。
// 调试 / 测试需要内部能力（close / destroy / isOpen）时用 getDialogHandle()。
// ─────────────────────────────────────────────────────────────
export { wrapDialog, getDialogHandle } from './wrap'
export { useDialog } from './context'
export { confirmDialog } from './confirm'
export { createFormDialog } from './form'
export { setDialogAppContext } from './runner'
export { DialogAction, isDialogConfirmed, isDialogDismissed } from './types'

/** 内置组件：想参考标准写法 / 复用时可以直接引入（按钮已内聚，不接受外部插槽重写） */
export { default as FormDialog } from './FormDialog.vue'
export { default as ConfirmDialog } from './ConfirmDialog.vue'

export type { CreateFormDialogOptions } from './form'
export type {
  ConfirmDialogParams,
  DialogCallbackArg,
  DialogCallbacks,
  DialogController,
  DialogDismissAction,
  DialogExposed,
  DialogHandle,
  DialogResult,
  DialogResultConfirmed,
  DialogResultCustom,
  DialogResultDismissed,
  DialogRuntime,
  FormDialogProps,
  WrapDialogOptions,
} from './types'
