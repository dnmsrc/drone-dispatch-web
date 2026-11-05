// ─────────────────────────────────────────────────────────────
// 演示用弹窗配置文件：全屏弹窗 / 可拖拽弹窗
//
// 一个文件可以放多个包裹器（同属一个业务模块时），业务按名称引入即可。
// ─────────────────────────────────────────────────────────────
import { defineDialog } from '@/components/pro'

/** 两处都只用一段文本，这里抽一个参数类型 */
export interface TextDialogParams {
  content?: string
}

/** 全屏弹窗：适合放表格、详情、长文档；内容超出时 body 自动滚动 */
export const fullscreenDialog = defineDialog<TextDialogParams, boolean>({
  name: 'fullscreen',
  title: '全屏弹窗',
  description: 'fullscreen: true；长内容时 body 自动滚动，底部按钮始终可见',
  fullscreen: true,
  content: (params) =>
    params.content ??
    '这是一个全屏弹窗，适合放表格、详情、长文档。\n\n内容超出高度时弹窗 body 区自动滚动，底部按钮始终可见。\n\n全屏时 draggable 不生效。',
  okText: '关闭',
  okValue: true,
})

/** 可拖拽弹窗：按住标题栏拖动，适合需要对照页面内容的场景 */
export const draggableDialog = defineDialog<TextDialogParams, boolean>({
  name: 'draggable',
  title: '可拖拽弹窗',
  description: 'draggable: true，按住标题栏拖动',
  draggable: true,
  width: 520,
  content: (params) => params.content ?? '按住标题栏可以拖动这个弹窗，适合需要对照页面内容的场景。',
  okValue: true,
})
