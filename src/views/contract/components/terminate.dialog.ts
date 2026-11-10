// ─────────────────────────────────────────────────────────────
// 合同终止结算弹窗配置：wrapDialog 把 TerminateDialog.vue 包成只带 open() 的句柄
//
//   const result = await terminateDialog.open({ contract })
//   if (result.action !== DialogAction.Confirm || !result.data) return
//   actTerminate(contract.id, result.data, isAdmin)
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import TerminateDialog from './TerminateDialog.vue'
import type { ContractRow, TerminateContractForm } from '../types'

export const terminateDialog = wrapDialog<{ contract: ContractRow }, TerminateContractForm>(
  TerminateDialog,
  { name: 'contract-terminate' },
)
