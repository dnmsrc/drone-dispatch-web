// ─────────────────────────────────────────────────────────────
// 内置确认框：也是一个包裹器，所以用法和其它自建弹窗完全一致
//
//   const result = await confirmDialog.open({ content: '确认删除该订单？', type: 'danger' })
//   if (result.action !== DialogAction.Confirm) return   // 取消 / X / 超时都走这里
//   deleteOrder()
//
//   // 回调风格
//   confirmDialog.open({ content: '…' }, { onConfirm: () => save(), onCancel: () => ElMessage.info('已取消') })
//
// 业务只管 await 结果：结果是「动作 + 数据」，用 DialogAction 枚举判断，
// 不要用 data 是否为 null 猜「用户点了取消」。
// 弹窗自己控制什么时候关，调用方不参与。
//
// 实现上就是 wrapDialog(ConfirmDialog, { name: 'confirm' })，
// 和业务里「组件 + 平行 ts 配置文件」的写法一模一样。
// ─────────────────────────────────────────────────────────────
import ConfirmDialog from './ConfirmDialog.vue'
import { wrapDialog } from './wrap'
import type { ConfirmDialogParams } from './types'

/**
 * 确认框包裹器：
 *   .open(params) 点确定 → { action: DialogAction.Confirm, data: true }
 *                 取消 / X → { action: Cancel | Close, data: null }
 */
export const confirmDialog = wrapDialog<ConfirmDialogParams, boolean>(ConfirmDialog, {
  name: 'confirm',
})
