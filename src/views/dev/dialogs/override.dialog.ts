// ─────────────────────────────────────────────────────────────
// 弹窗配置文件：演示「组件覆盖默认动作」（与 OverrideDialog.vue 平行）
//
// 这个配置文件跟别的没有区别 —— 组件自己 defineExpose({ open, close })，
// 包裹器在 open() / close() 时会优先调用组件的方法。
// 也可以在这里用 options.open / options.close 覆盖，优先级：组件 > 配置 > 默认。
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import OverrideDialog from './OverrideDialog.vue'

/** 弹窗参数 */
export interface OverrideDialogParams {
  title?: string
  content?: string
}

export const overrideDialog = wrapDialog<OverrideDialogParams, string>(OverrideDialog, {
  name: 'override',
})
