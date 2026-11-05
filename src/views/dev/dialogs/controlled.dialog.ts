// ─────────────────────────────────────────────────────────────
// 弹窗配置文件：被外部程序化控制的弹窗（与 ControlledDialog.vue 平行）
//
// 用来演示包裹器的三个方法：
//   open()    打开（这里的按钮不 await，页面同时显示 isOpen 状态）
//   close()   程序化关闭 → 视为取消，Promise 以 null 结束
//   destroy() 立即销毁（不等关闭动画），同样以 null 结束
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import ControlledDialog from './ControlledDialog.vue'

/** 确定时回传这个字符串，方便区分「确定」与「外部关闭」 */
export const CONTROLLED_OK_VALUE = 'ok-result'

/** 弹窗参数 */
export interface ControlledDialogParams {
  title?: string
  description?: string
  content?: string
}

export const controlledDialog = wrapDialog<ControlledDialogParams, string>(
  ControlledDialog,
  { name: 'controlled' },
)
