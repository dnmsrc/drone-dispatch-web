// ─────────────────────────────────────────────────────────────
// 内置确认框：也是一个包裹器，所以用法和其它自建弹窗完全一致
//
//   const ok = await confirmDialog.open({ content: '确认删除该订单？', type: 'danger' })
//   if (!ok) return
//
//   // 回调风格
//   confirmDialog.open({ content: '…' }, { onOk: () => save(), onCancel: () => ElMessage.info('已取消') })
// ─────────────────────────────────────────────────────────────
import { h } from 'vue'
import type { Component } from 'vue'
import {
  CircleCloseFilled,
  InfoFilled,
  SuccessFilled,
  WarningFilled,
} from '@element-plus/icons-vue'
import { defineDialog } from './wrapper'

export type ConfirmType = 'warning' | 'danger' | 'info' | 'success'

/** 确认框参数：它是"内容参数"，不需要每次重新注册包裹器 */
export interface ConfirmDialogParams {
  /** 提示内容 */
  content: string
  /** 标题，默认「提示」 */
  title?: string
  /** 语义类型，决定图标与确定按钮颜色，默认 warning */
  type?: ConfirmType
  /** 自定义图标组件（不传按 type 取内置图标） */
  icon?: Component
  /** 确定按钮文字 */
  okText?: string
  /** 取消按钮文字 */
  cancelText?: string
  /** 确定按钮类型（不传时 danger 类型给 danger，其它给 primary） */
  okType?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}

const TYPE_ICONS: Record<ConfirmType, Component> = {
  warning: WarningFilled,
  danger: CircleCloseFilled,
  info: InfoFilled,
  success: SuccessFilled,
}

/**
 * 确认框包裹器：.open(params) 确定返回 true，取消 / 关闭返回 null。
 * 内部与自建弹窗共用同一套挂载与关闭流程，样式、层级、回调行为完全一致。
 */
export const confirmDialog = defineDialog<ConfirmDialogParams, boolean>({
  name: 'confirm',
  width: 440,
  alignCenter: true,
  showClose: false,
  closeOnClickModal: false,
  title: (params) => params.title ?? '提示',
  okText: (params) => params.okText ?? '确定',
  cancelText: (params) => params.cancelText ?? '取消',
  okType: (params) => params.okType ?? (params.type === 'danger' ? 'danger' : 'primary'),
  okValue: true,
  render: (params) => {
    const type: ConfirmType = params.type ?? 'warning'
    const icon = params.icon ?? TYPE_ICONS[type]
    return h('div', { class: 'pro-confirm' }, [
      h('span', { class: ['pro-confirm-icon', `is-${type}`] }, [h(icon)]),
      h('div', { class: 'pro-confirm-text' }, params.content),
    ])
  },
})
