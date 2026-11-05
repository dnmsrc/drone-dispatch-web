// ─────────────────────────────────────────────────────────────
// 弹窗配置文件：订单表单弹窗（配置式表单，复用内置 FormDialog 组件）
//
// createFormDialog 就是 wrapDialog(FormDialog, { props: { fields, … } }) 的便捷写法。
// 想完全自己掌控打开/关闭，就像 MessageDialog.vue 那样写自己的组件 + wrapDialog。
// ─────────────────────────────────────────────────────────────
import { createFormDialog } from '@/components/pro'
import type { FormFieldConfig } from '@/components/pro'
import { VENUE_OPTIONS } from '../mock'

/** 表单返回值 */
export interface OrderFormData {
  id: string
  nickname: string
  phone: string
  venue: string
  performDate: string
  drones: number
  amount: number
  remark: string
}

/** 打开时的参数（放进表单的初始值；新增传空对象，编辑传整行） */
export type OrderFormParams = Partial<OrderFormData> & {
  /** 覆盖标题：不传时用配置里的标题 */
  title?: string
}

const fields: FormFieldConfig[] = [
  {
    prop: 'id',
    label: '订单号',
    control: 'input',
    required: true,
    props: { placeholder: '如 DD202511080001' },
  },
  { prop: 'nickname', label: '客户昵称', control: 'input', required: true },
  {
    prop: 'phone',
    label: '手机号',
    control: 'input',
    required: true,
    rules: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
  },
  { prop: 'venue', label: '表演场地', control: 'select', options: VENUE_OPTIONS, required: true },
  { prop: 'performDate', label: '表演日期', control: 'date', required: true },
  {
    prop: 'drones',
    label: '无人机数量',
    control: 'input-number',
    props: { min: 1, max: 1000, step: 10 },
  },
  { prop: 'amount', label: '订单金额', control: 'input-number', props: { min: 0, step: 100 } },
  { prop: 'remark', label: '备注', control: 'textarea', span: 24 },
]

/**
 * 订单表单弹窗：确定返回表单数据，取消 / 关闭返回 null。
 * 打开时传 { ...row, title: '编辑订单 xxx' } 就是编辑，不传 title 就是新增。
 */
export const orderFormDialog = createFormDialog<OrderFormData>({
  name: 'order-form',
  title: '新增订单',
  description: '确定时先校验；校验通过才关闭，并把表单数据交回',
  width: 640,
  labelWidth: '96px',
  defaultSpan: 24,
  fields,
  model: { drones: 120, amount: 16800 },
})
