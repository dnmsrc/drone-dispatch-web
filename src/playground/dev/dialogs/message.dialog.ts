// ─────────────────────────────────────────────────────────────
// 弹窗配置文件（与 MessageDialog.vue 平行的位置）
//
// 包裹器把业务组件包成一个句柄，导出后业务里直接：
//   import { messageDialog } from './message.dialog'
//   const ok = await messageDialog.open({ title: '提示', content: '…' })
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import MessageDialog from './MessageDialog.vue'

/** 打开时传入的参数（组件里通过 useDialog().params 拿到） */
export interface MessageDialogParams {
  /** 标题，默认「提示」 */
  title?: string
  /** 标题下方的灰色说明 */
  description?: string
  /** 正文 */
  content: string
  /** 确定按钮文字，默认「知道了」 */
  okText?: string
}

/**
 * 消息弹窗：确定回传 true，取消 / 关闭回传 null。
 * 组件自己定义了 open/close 吗？没有 —— 走的包裹器默认动作（visible 置 true/false）。
 *
 * options.props 是「中间层默认值」：组件 withDefaults 是最低默认，open() 入参优先级最高。
 * 这里给一个默认标题，业务 open({ title }) 时会被覆盖。
 */
export const messageDialog = wrapDialog<MessageDialogParams, boolean>(MessageDialog, {
  name: 'message',
  props: { title: '默认标题（来自 wrapDialog options.props）' },
})
