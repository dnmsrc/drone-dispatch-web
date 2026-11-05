// ─────────────────────────────────────────────────────────────
// 配置式表单弹窗的便捷构造：内部就是 wrapDialog(FormDialog, { props })
//
//   export const orderFormDialog = createFormDialog<OrderFormData>({
//     name: 'order-form',
//     fields: [...],
//     model: { drones: 120 },
//     title: '新增订单',
//   })
//
// 想完全自己掌控打开/关闭，直接写业务组件 + wrapDialog 即可。
// ─────────────────────────────────────────────────────────────
import FormDialog from './FormDialog.vue'
import { wrapDialog } from './wrap'
import type { DialogController, FormDialogProps } from './types'

/** createFormDialog 的配置：FormDialog 组件 props + 可选包裹器名 */
export interface CreateFormDialogOptions extends FormDialogProps {
  /** 包裹器名字，默认 form-dialog */
  name?: string
}

/**
 * 创建一个配置式表单弹窗句柄。
 * @param options 表单配置（fields 必填）+ 包裹器名
 */
export function createFormDialog<D = Record<string, unknown>>(
  options: CreateFormDialogOptions,
): DialogController<Record<string, unknown>, D> {
  const { name = 'form-dialog', ...props } = options
  return wrapDialog<Record<string, unknown>, D>(FormDialog, {
    name,
    props: props as Record<string, unknown>,
  })
}
