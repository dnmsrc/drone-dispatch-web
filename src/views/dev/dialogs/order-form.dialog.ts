// ─────────────────────────────────────────────────────────────
// 演示用弹窗配置文件：订单表单弹窗（fields 配置式表单）
//
// 字段配置与 ProForm 完全一致；确定时先校验，校验通过才关闭并把表单数据交回。
// 编辑场景把整行数据作为 params 传进来，标题会自动变成「编辑订单 xxx」。
// ─────────────────────────────────────────────────────────────
import { defineDialog } from '@/components/pro'
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

/** 打开时的参数 = 表单初始值（新增传空对象，编辑传整行） */
export type OrderFormParams = Partial<OrderFormData>

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
 * 标题是函数形态 —— 带 id 参数时显示「编辑订单」。
 */
export const orderFormDialog = defineDialog<OrderFormParams, OrderFormData>({
  name: 'order-form',
  width: 640,
  labelWidth: '96px',
  defaultSpan: 24,
  title: (params) => (params.id ? `编辑订单 ${params.id}` : '新增订单'),
  description: '确定时先校验；校验通过才关闭，并把表单数据交回',
  fields,
  model: { drones: 120, amount: 16800 },
  okValue: true,
})
