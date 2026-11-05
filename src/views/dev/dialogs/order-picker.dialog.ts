// ─────────────────────────────────────────────────────────────
// 演示用弹窗配置文件：订单选择弹窗（内容是一个普通组件）
//
// 组件本身不认识"弹窗"，它通过 useDialogContext().close(row) 把选中项交回；
// 包裹器负责挂载、传参、收结果。showFooter: false 让底部按钮由组件自己提供。
// ─────────────────────────────────────────────────────────────
import { defineDialog } from '@/components/pro'
import type { MockOrder } from '../mock'
import OrderPicker from '../components/OrderPicker.vue'

/** 打开时传给 OrderPicker 的 props */
export interface OrderPickerParams {
  keyword?: string
}

/** 订单选择弹窗：选中一行返回该行数据，关闭 / 取消返回 null */
export const orderPickerDialog = defineDialog<OrderPickerParams, MockOrder>({
  name: 'order-picker',
  component: OrderPicker,
  title: '选择订单',
  description: '内容是一个普通组件（OrderPicker），它用 useDialogContext().close(row) 回传选中项',
  width: 840,
  showFooter: false,
})
