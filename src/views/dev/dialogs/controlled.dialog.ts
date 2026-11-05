// ─────────────────────────────────────────────────────────────
// 演示用弹窗配置文件：被外部程序化控制的弹窗
//
// 用来演示包裹器的三个方法：
//   open()    打开（这里的按钮不 await，页面同时显示 isOpen 状态）
//   close()   程序化关闭 → 视为取消，Promise 以 null 结束
//   destroy() 立即销毁（不等关闭动画），同样以 null 结束
// ─────────────────────────────────────────────────────────────
import { defineDialog } from '@/components/pro'

/** 确定时回传这个字符串，方便区分「确定」与「外部关闭」 */
export const CONTROLLED_OK_VALUE = 'ok-result'

export const controlledDialog = defineDialog<{ content?: string }, string>({
  name: 'controlled',
  width: 520,
  title: '被外部控制的弹窗',
  description: '这个弹窗由页面上的按钮调用包裹器的 close() / destroy() 控制',
  content: (params) =>
    params.content ?? '点页面上的「调用 .close()」或「调用 .destroy()」可以绕开底部按钮关闭这个弹窗。',
  okText: '确定并回传字符串',
  okValue: CONTROLLED_OK_VALUE,
})
