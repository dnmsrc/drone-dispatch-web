// ─────────────────────────────────────────────────────────────
// 命令式确认框：await 直接得到布尔结果
//
//   const ok = await confirmDialog('确认删除该订单？')
//   const ok = await confirmDialog({ title: '删除确认', content: '…', type: 'danger' })
//
// 内部复用 openDialog，因此样式、层级、回调风格与其它弹窗完全一致。
// ─────────────────────────────────────────────────────────────
import { h } from 'vue'
import type { Component } from 'vue'
import {
  CircleCloseFilled,
  InfoFilled,
  SuccessFilled,
  WarningFilled,
} from '@element-plus/icons-vue'
import { openDialog } from './open'
import type { ConfirmDialogOptions } from './types'

type ConfirmType = NonNullable<ConfirmDialogOptions['type']>

const TYPE_ICONS: Record<ConfirmType, Component> = {
  warning: WarningFilled,
  danger: CircleCloseFilled,
  info: InfoFilled,
  success: SuccessFilled,
}

/** 确认框：确定返回 true，取消 / 关闭返回 false */
export function confirmDialog(options: string | ConfirmDialogOptions): Promise<boolean> {
  const opts: ConfirmDialogOptions = typeof options === 'string' ? { content: options } : options
  const type: ConfirmType = opts.type ?? 'warning'
  const icon = opts.icon ?? TYPE_ICONS[type]

  return openDialog<boolean>({
    title: opts.title ?? '提示',
    description: opts.description,
    width: opts.width ?? 440,
    modal: opts.modal,
    alignCenter: opts.alignCenter ?? true,
    showClose: opts.showClose ?? false,
    closeOnClickModal: opts.closeOnClickModal ?? false,
    closeOnPressEscape: opts.closeOnPressEscape ?? true,
    class: opts.class,
    zIndex: opts.zIndex,
    okText: opts.okText ?? '确定',
    cancelText: opts.cancelText ?? '取消',
    okType: opts.okType ?? (type === 'danger' ? 'danger' : 'primary'),
    beforeOk: opts.beforeOk,
    onOk: opts.onOk,
    onCancel: opts.onCancel,
    onClose: opts.onClose,
    render: () =>
      h('div', { class: 'pro-confirm' }, [
        h('span', { class: ['pro-confirm-icon', `is-${type}`] }, [h(icon)]),
        h('div', { class: 'pro-confirm-text' }, opts.content ?? ''),
      ]),
  }).then((value) => value === true)
}
