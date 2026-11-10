// ─────────────────────────────────────────────────────────────
// 合同改期弹窗配置：wrapDialog 把 RescheduleDialog.vue 包成只带 open() 的句柄
//
//   const result = await rescheduleDialog.open({ contract })
//   if (result.action !== DialogAction.Confirm || !result.data) return
//   actReschedule(contract.id, result.data)
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import RescheduleDialog from './RescheduleDialog.vue'
import type { ContractRow, RescheduleContractForm } from '../types'

export const rescheduleDialog = wrapDialog<{ contract: ContractRow }, RescheduleContractForm>(
  RescheduleDialog,
  { name: 'contract-reschedule' },
)
