// ─────────────────────────────────────────────────────────────
// TripleConfirmDialog 的共享值（参数 / 数据类型）
// 纯数据文件，避免 .dialog.ts 与 .vue 之间的值循环依赖。
// ─────────────────────────────────────────────────────────────

/** 三按钮确认框入参 */
export interface TripleConfirmParams {
  /** 标题 */
  title?: string
  /** 正文 */
  content: string
  /** 「稍后处理」按钮文字 */
  laterText?: string
  /** 「取消」按钮文字 */
  cancelText?: string
  /** 主按钮文字 */
  okText?: string
}
