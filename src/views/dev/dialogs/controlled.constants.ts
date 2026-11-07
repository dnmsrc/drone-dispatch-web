// ─────────────────────────────────────────────────────────────
// ControlledDialog 的共享值定义（枚举 / 常量 / 参数类型）
//
// 单独成文件是为了打破循环依赖：
//   controlled.dialog.ts 要 import ControlledDialog.vue（值），
//   而 ControlledDialog.vue 又要用这里的枚举与常量（值）。
// 两边都从本文件导入，环就落在「无组件引用」的纯数据文件上，
// 独立动态 import（命令式打开、按需加载）时不会触发 TDZ。
// 仅类型的入参接口也放这里，方便组件与包裹器共用同一份类型。
// ─────────────────────────────────────────────────────────────

/** 点「确定」回传的值 */
export const CONTROLLED_OK_VALUE = 'ok-result'
/** 弹窗倒计时结束后自己回传的值 */
export const CONTROLLED_AUTO_VALUE = 'auto-closed-by-dialog'
/** 点「稍后提醒」回传的值 */
export const CONTROLLED_LATER_VALUE = 'remind-tomorrow-09:00'

/**
 * 业务自定义关闭动作（与框架的 DialogAction 并列）。
 * 弹窗关闭不止「确认 / 取消」时，用它表达语义，调用方按枚举分支处理。
 */
export enum ControlledAction {
  /** 稍后提醒：用户选择延期，带一个提醒时间回来 */
  RemindLater = 'remind-later',
}

/** 弹窗参数 */
export interface ControlledDialogParams {
  title?: string
  description?: string
  content?: string
  /** 打开后由弹窗自己倒计时（秒），到点自己关闭；不传则等用户操作 */
  autoClose?: number
}
