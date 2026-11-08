// ─────────────────────────────────────────────────────────────
// 创建派单弹窗配置文件：wrapDialog 把 DispatchDialog.vue 包成只带 open() 的句柄
//
//   const result = await dispatchDialog.open({ consultId, quoteLo, … })
//   if (result.action !== DialogAction.Confirm) return   // 取消 / X / 遮罩
//   actDispatch(row, result.data)                        // { quoteLo, quoteHi, terms, note }
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import DispatchDialog from './DispatchDialog.vue'
import type { DispatchDialogParams, DispatchFormData } from '../types'

export const dispatchDialog = wrapDialog<DispatchDialogParams, DispatchFormData>(DispatchDialog, {
  name: 'consult-dispatch',
})
