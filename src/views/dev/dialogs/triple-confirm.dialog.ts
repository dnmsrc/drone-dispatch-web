// ─────────────────────────────────────────────────────────────
// 弹窗配置文件：三按钮确认框（自建组件，按钮内聚）
// 与 TripleConfirmDialog.vue 平行，写法和任何自建弹窗完全一致。
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import TripleConfirmDialog from './TripleConfirmDialog.vue'
import type { TripleConfirmParams } from './triple.constants'

export type { TripleConfirmParams } from './triple.constants'

/** 三按钮确认框：确认回传 true，取消 / 稍后处理回传对应内置动作 */
export const tripleConfirmDialog = wrapDialog<TripleConfirmParams, boolean>(
  TripleConfirmDialog,
  { name: 'triple-confirm' },
)
