// ─────────────────────────────────────────────────────────────
// 退款审批弹窗配置：wrapDialog 把 AuditDialog.vue 包成只带 open() 的句柄
//
//   const result = await auditDialog.open({ orderId, totalAmount, … })
//   if (result.action !== DialogAction.Confirm) return
//   result.data.mode === 'approve' ? actRefundApprove(...) : actRefundReject(...)
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import AuditDialog from './AuditDialog.vue'
import type { AuditDialogParams, AuditFormData } from '../types'

export const auditDialog = wrapDialog<AuditDialogParams, AuditFormData>(AuditDialog, {
  name: 'refund-audit',
})
