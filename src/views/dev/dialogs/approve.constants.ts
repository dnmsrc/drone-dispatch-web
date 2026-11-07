// ─────────────────────────────────────────────────────────────
// ApproveDialog 的共享值定义（枚举 / 参数 / 数据类型）
//
// 单独成文件是为了打破循环依赖：
//   approve.dialog.ts 要 import ApproveDialog.vue（值），
//   而 ApproveDialog.vue 又要用这里的枚举与类型（值 / 类型）。
// 两边都从本文件导入，环就落在「无组件引用」的纯数据文件上，
// 独立动态 import（命令式打开、按需加载）时不会触发 TDZ。
// ─────────────────────────────────────────────────────────────

/** 审批场景的业务关闭动作（与框架 DialogAction 并列） */
export enum ApproveAction {
  /** 驳回：带驳回原因 */
  Reject = 'approve-reject',
  /** 转审：带转交人 */
  Transfer = 'approve-transfer',
}

/** 审批弹窗入参（标准 defineProps 接收，走三层默认） */
export interface ApproveDialogParams {
  /** 标题，默认「订单审批」 */
  title?: string
  /** 正文提示 */
  content: string
  /** 驳回按钮文字 */
  rejectText?: string
  /** 转审按钮文字 */
  transferText?: string
  /** 通过按钮文字 */
  okText?: string
}

/** 审批结果数据：通过为 true；驳回 / 转审带回各自的说明 */
export type ApproveData = boolean | string
