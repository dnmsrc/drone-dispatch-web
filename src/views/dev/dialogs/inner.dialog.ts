// ─────────────────────────────────────────────────────────────
// 演示用弹窗配置文件：嵌套弹窗的内层
//
// 单独一个配置文件，方便被任意弹窗/页面复用；这里被 DialogNestedDemo 引用。
// ─────────────────────────────────────────────────────────────
import { defineDialog } from '@/components/pro'

export const innerDialog = defineDialog<{ content?: string }, boolean>({
  name: 'inner',
  width: 420,
  title: '内层弹窗',
  content: (params) =>
    params.content ?? '我是从外层弹窗里再打开的弹窗。层级自动高于外层，下拉框等浮层也不受影响。',
  okText: '确认',
  okValue: true,
})
