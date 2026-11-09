// ─────────────────────────────────────────────────────────────
// 弹窗配置文件：审批弹窗（自建组件 ApproveDialog + 业务动作枚举）
//
// 按钮（驳回 / 转审 / 通过）全部内聚在 ApproveDialog.vue 里，
// 调用方只调 open()，不在外面写任何按钮 / 渲染函数。
// 组件点「驳回 / 转审」时以 ApproveAction 枚举动作关闭，调用方按枚举分支处理。
//
// 这证明：按钮内聚不影响「动作 + 数据」契约，业务动作照样能经 close 回传。
// 枚举与类型抽到 approve.constants.ts，避免组件与本文件之间的循环依赖。
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import ApproveDialog from './ApproveDialog.vue'
import { ApproveAction } from './approve.constants'
import type { ApproveData, ApproveDialogParams } from './approve.constants'

// 枚举从常量文件转出，保持 `import { ApproveAction } from './approve.dialog'` 的旧路径可用
export { ApproveAction } from './approve.constants'
export type { ApproveData, ApproveDialogParams } from './approve.constants'

/**
 * 审批弹窗：按钮与业务动作都在组件内部定义，
 * 点通过 → { action: Confirm, data: true }；
 * 点驳回 / 转审 → { action: ApproveAction.*, data: 说明文字 }。
 */
export const approveDialog = wrapDialog<ApproveDialogParams, ApproveData, ApproveAction>(
  ApproveDialog,
  { name: 'approve' },
)
