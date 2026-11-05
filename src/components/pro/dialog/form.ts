// ─────────────────────────────────────────────────────────────
// 命令式表单弹窗：fields（配置式字段）+ 确定时自动校验，返回表单数据
//
//   const data = await openFormDialog({
//     title: '新增订单',
//     fields: [
//       { prop: 'name', label: '客户姓名', control: 'input', required: true },
//       { prop: 'venue', label: '表演场地', control: 'select', options: VENUE_OPTIONS },
//     ],
//   })
//   if (!data) return            // 取消
//   await createOrder(data)      // 继续后续逻辑
// ─────────────────────────────────────────────────────────────
import { openDialog } from './open'
import type { FormDialogOptions } from './types'

/** 表单弹窗：确定返回表单数据，取消 / 关闭返回 null */
export function openFormDialog<T = Record<string, unknown>>(
  options: FormDialogOptions<T>,
): Promise<T | null> {
  return openDialog<T>({
    // 弹窗内默认单列布局、固定宽度，业务可覆盖
    width: 640,
    labelWidth: '96px',
    defaultSpan: 24,
    ...options,
  })
}
