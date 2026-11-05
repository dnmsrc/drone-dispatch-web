// ─────────────────────────────────────────────────────────────
// 弹窗配置文件：订单选择弹窗（与 OrderPickerDialog.vue 平行）
//
// 组件是完全正常的业务组件（自己写 el-dialog + 表格），
// 包裹器负责挂载、把 params 交给它、收 close(row) 的结果。
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import OrderPickerDialog from './OrderPickerDialog.vue'
import type { MockOrder } from '../mock'

/** 打开时传给组件的参数（初始搜索词、文案） */
export interface OrderPickerParams {
  /** 初始搜索词 */
  keyword?: string
  /** 标题，默认「选择订单」 */
  title?: string
  /** 标题下的灰色说明 */
  description?: string
}

/** 订单选择弹窗：选中一行返回该行数据，取消 / 关闭返回 null */
export const orderPickerDialog = wrapDialog<OrderPickerParams, MockOrder>(
  OrderPickerDialog,
  { name: 'order-picker' },
)
