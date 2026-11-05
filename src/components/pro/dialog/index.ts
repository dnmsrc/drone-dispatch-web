// ─────────────────────────────────────────────────────────────
// 弹窗统一出口
//
//   import { defineDialog, confirmDialog, useDialogContext } from '@/components/pro'
//
// 用法（包裹器模式）：
//   ① 弹窗配置文件里用 defineDialog 把弹窗包起来并导出
//   ② 业务里引入该配置文件，调用 .open(params, callbacks) / .close() / .destroy()
// ─────────────────────────────────────────────────────────────
export { defineDialog } from './wrapper'
export { confirmDialog } from './confirm'
export { useDialogContext } from './context'
export { setDialogAppContext } from './mount'

export type { ConfirmDialogParams, ConfirmType } from './confirm'
export type {
  DialogAction,
  DialogCallbackArg,
  DialogCallbacks,
  DialogContent,
  DialogContext,
  DialogDefinition,
  DialogDisplayOptions,
  DialogFormOptions,
  DialogValue,
  DialogWrapper,
} from './types'
