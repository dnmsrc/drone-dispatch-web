// ─────────────────────────────────────────────────────────────
// 演示用弹窗配置文件：嵌套弹窗外层
//
// 外层弹窗的内容是一个普通组件（DialogNestedDemo），组件内部再打开 innerDialog，
// 层级由 Element 的全局 z-index 计数器自动递增，不需要手动传 zIndex。
// ─────────────────────────────────────────────────────────────
import { defineDialog } from '@/components/pro'
import NestedPanel from '../components/DialogNestedDemo.vue'

/** 嵌套弹窗外层：组件自己控制关闭并回传字符串 */
export const nestedDialog = defineDialog<Record<string, never>, string>({
  name: 'nested',
  component: NestedPanel,
  title: '嵌套弹窗',
  description: 'showFooter: false，底部按钮由内容组件自己提供；内容里可以再打开弹窗',
  width: 600,
  showFooter: false,
})
