// ─────────────────────────────────────────────────────────────
// 弹窗配置文件：弹窗自己控制打开 / 关闭（与 ControlledDialog.vue 平行）
//
// 对外只有 open()：调用方 await 它拿结果，不参与关闭。
// 关闭时机全在组件内部 —— 底部按钮、右上角 X、或组件自己的倒计时。
//
// 这个弹窗演示「关闭动作不止确认 / 取消」：
//   Confirm（框架内置）  点「确定」          → data = CONTROLLED_OK_VALUE
//   RemindLater（业务定义）点「稍后提醒」    → data = CONTROLLED_LATER_VALUE
//   Cancel（框架内置）    点「取消」
//   Timeout（框架内置）   组件自己倒计时到点 → data = CONTROLLED_AUTO_VALUE
//   Close（框架内置）     点右上角 X / 遮罩
//
// 枚举 / 常量 / 参数类型抽到了 controlled.constants.ts 以打破与组件的循环依赖；
// 这里 re-export，调用方仍可从本文件按原路径引入。
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import ControlledDialog from './ControlledDialog.vue'
import { ControlledAction } from './controlled.constants'
import type { ControlledDialogParams } from './controlled.constants'

export {
  CONTROLLED_AUTO_VALUE,
  CONTROLLED_LATER_VALUE,
  CONTROLLED_OK_VALUE,
  ControlledAction,
} from './controlled.constants'
export type { ControlledDialogParams } from './controlled.constants'

export const controlledDialog = wrapDialog<ControlledDialogParams, string, ControlledAction>(
  ControlledDialog,
  { name: 'controlled' },
)
