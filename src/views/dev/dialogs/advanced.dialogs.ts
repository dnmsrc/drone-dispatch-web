// ─────────────────────────────────────────────────────────────
// 弹窗配置文件：全屏弹窗 / 可拖拽弹窗（都与 TextDialog.vue 平行）
//
// 一个文件放多个包裹器（同属一个业务模块时），业务按名称引入即可。
// 两个包裹器包的是同一个组件，差异只在 open 时传的参数上。
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import TextDialog from './TextDialog.vue'

/** 文本弹窗参数 */
export interface TextDialogParams {
  title?: string
  description?: string
  content?: string
  /** 全屏 */
  fullscreen?: boolean
  /** 可拖拽 */
  draggable?: boolean
  /** 宽度（数字按 px） */
  width?: string | number
  /** 确定按钮文字 */
  okText?: string
  /** 附加类名 */
  class?: string
}

/** 全屏弹窗：适合放表格、详情、长文档；内容超出时 body 自动滚动 */
export const fullscreenDialog = wrapDialog<TextDialogParams, boolean>(TextDialog, {
  name: 'fullscreen',
})

/** 可拖拽弹窗：按住标题栏拖动，适合需要对照页面内容的场景 */
export const draggableDialog = wrapDialog<TextDialogParams, boolean>(TextDialog, {
  name: 'draggable',
})
