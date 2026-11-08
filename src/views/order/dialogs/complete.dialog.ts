// ─────────────────────────────────────────────────────────────
// 完成订单弹窗配置文件：wrapDialog 把 CompleteDialog.vue 包成只带 open() 的句柄
//
//   const result = await completeDialog.open({ orderId, photos, videos })
//   if (result.action !== DialogAction.Confirm) return
//   actComplete(row, result.data)          // { photos, videos }
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import CompleteDialog from './CompleteDialog.vue'
import type { CompleteDialogParams, CompleteFormData } from '../types'

export const completeDialog = wrapDialog<CompleteDialogParams, CompleteFormData>(CompleteDialog, {
  name: 'order-complete',
})
