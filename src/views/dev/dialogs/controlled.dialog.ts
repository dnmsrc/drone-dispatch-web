// ─────────────────────────────────────────────────────────────
// 弹窗配置文件：弹窗自己控制打开 / 关闭（与 ControlledDialog.vue 平行）
//
// 对外只有 open()：调用方 await 它拿结果，不参与关闭。
// 关闭时机全在组件内部 —— 底部按钮、右上角 X、或组件自己的倒计时。
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import ControlledDialog from './ControlledDialog.vue'

/** 点「确定」回传的值，方便区分结果来源 */
export const CONTROLLED_OK_VALUE = 'ok-result'
/** 弹窗倒计时结束后自己回传的值 */
export const CONTROLLED_AUTO_VALUE = 'auto-closed-by-dialog'

/** 弹窗参数 */
export interface ControlledDialogParams {
  title?: string
  description?: string
  content?: string
  /** 打开后由弹窗自己倒计时（秒），到点自己关闭；不传则等用户操作 */
  autoClose?: number
}

export const controlledDialog = wrapDialog<ControlledDialogParams, string>(
  ControlledDialog,
  { name: 'controlled' },
)
