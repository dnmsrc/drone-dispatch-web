// ─────────────────────────────────────────────────────────────
// 命令式弹窗统一出口
//
//   import { openDialog, confirmDialog, openFormDialog } from '@/components/pro'
//
// 三种用法：
//   1) 通用弹窗：openDialog({ title, component / render / content, ... })
//   2) 确认框：  confirmDialog('确认删除？') → await 得到 boolean
//   3) 表单弹窗：openFormDialog({ title, fields }) → await 得到表单数据或 null
// ─────────────────────────────────────────────────────────────
export { openDialog, setDialogAppContext } from './open'
export { confirmDialog } from './confirm'
export { openFormDialog } from './form'
export { useDialogContext } from './context'

export type {
  DialogAction,
  DialogContext,
  DialogContent,
  DialogCommonOptions,
  DialogOptions,
  FormDialogOptions,
  ConfirmDialogOptions,
} from './types'
