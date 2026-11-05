// ─────────────────────────────────────────────────────────────
// 弹窗配置文件：嵌套弹窗外层（与 NestedOuterDialog.vue 平行）
//
// 外层组件内部会再 import 内层弹窗的配置文件并 .open()。
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import NestedOuterDialog from './NestedOuterDialog.vue'

/** 外层弹窗参数 */
export interface NestedDialogParams {
  title?: string
}

/** 嵌套弹窗外层：组件自己控制关闭并回传字符串 */
export const nestedDialog = wrapDialog<NestedDialogParams, string>(NestedOuterDialog, {
  name: 'nested',
})
