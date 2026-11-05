// ─────────────────────────────────────────────────────────────
// 弹窗统一出口
//
//   import { wrapDialog, useDialog, confirmDialog, createFormDialog } from '@/components/pro'
//
// 用法（包裹器架构）：
//   ① 业务正常写弹窗组件（自己写 <el-dialog>，用 useDialog() 拿 visible/close）
//   ② 与组件平行位置写 xxx.dialog.ts，用 wrapDialog 把它包成句柄并导出
//   ③ 业务代码 import 这个 ts，调 .open() / .close() / .destroy()
// ─────────────────────────────────────────────────────────────
export { wrapDialog } from './wrap'
export { useDialog } from './context'
export { confirmDialog } from './confirm'
export { createFormDialog } from './form'
export { setDialogAppContext } from './runner'

/** 内置组件：想自定义标题栏/布局时也可以直接复用 */
export { default as FormDialog } from './FormDialog.vue'
export { default as ConfirmDialog } from './ConfirmDialog.vue'

export type { CreateFormDialogOptions } from './form'
export type {
  ConfirmDialogParams,
  DialogAction,
  DialogCallbackArg,
  DialogCallbacks,
  DialogController,
  DialogExposed,
  DialogRuntime,
  FormDialogProps,
  WrapDialogOptions,
} from './types'
