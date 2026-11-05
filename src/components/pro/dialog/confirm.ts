// ─────────────────────────────────────────────────────────────
// 内置确认框：也是一个包裹器，所以用法和其它自建弹窗完全一致
//
//   const ok = await confirmDialog.open({ content: '确认删除该订单？', type: 'danger' })
//   if (!ok) return
//
//   // 回调风格
//   confirmDialog.open({ content: '…' }, { onOk: () => save(), onCancel: () => ElMessage.info('已取消') })
//
// 实现上就是 wrapDialog(ConfirmDialog, { name: 'confirm' })，
// 和业务里「组件 + 平行 ts 配置文件」的写法一模一样。
// ─────────────────────────────────────────────────────────────
import ConfirmDialog from './ConfirmDialog.vue'
import { wrapDialog } from './wrap'
import type { ConfirmDialogParams } from './types'

/** 确认框包裹器：.open(params) 确定返回 true，取消 / 关闭返回 null */
export const confirmDialog = wrapDialog<ConfirmDialogParams, boolean>(ConfirmDialog, {
  name: 'confirm',
})
