// ─────────────────────────────────────────────────────────────
// 弹窗配置文件：嵌套弹窗的内层（与 InnerDialog.vue 平行）
//
// 单独一个文件，方便被任意弹窗 / 页面复用；这里被 NestedOuterDialog 引用。
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import InnerDialog from './InnerDialog.vue'

/** 内层弹窗参数 */
export interface InnerDialogParams {
  title?: string
  content?: string
}

export const innerDialog = wrapDialog<InnerDialogParams, boolean>(InnerDialog, {
  name: 'inner',
})
