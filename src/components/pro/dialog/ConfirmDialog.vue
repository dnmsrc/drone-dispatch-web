<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 内置确认框组件（一个"正常定义的弹窗组件"）
//
// 它和业务自己写的弹窗完全一样：自己写 <el-dialog>、自己写底部按钮、
// 通过 useDialog() 拿 visible 与关闭能力。
// confirm.ts 只是用 wrapDialog 把它包起来导出成 confirmDialog。
//
// 视觉对齐原型里的 ElMessageBox.confirm：
//   - 标准 el-dialog（顶部 15vh 定位，不垂直居中），保留右上角关闭 X
//   - 确认体用 message-box 原生结构：24px 语义图标 + 文案，flex 间距 12px
//   - 底部「取消 / 确定」右对齐，按钮内聚在本组件，不接受外部重写
//
// 入参用标准 defineProps 接收（三层默认：组件 withDefaults < wrapDialog
// options.props < open() 入参）。业务需要别的按钮时，照这个文件写自己的弹窗。
// ─────────────────────────────────────────────────────────────
import { computed, ref } from 'vue'
import type { Component } from 'vue'
import { ElButton, ElDialog } from 'element-plus'
import {
  CircleCloseFilled,
  InfoFilled,
  SuccessFilled,
  WarningFilled,
} from '@element-plus/icons-vue'
import { useDialog } from './context'
import type { ConfirmDialogParams } from './types'

// 标准 props：业务 open() 入参与 wrapDialog options.props 合并后从这里进来
const props = withDefaults(defineProps<ConfirmDialogParams>(), {
  title: '提示',
  type: 'warning',
  okText: '确定',
  cancelText: '取消',
})

// 包裹器只提供方法：visible / confirm / cancel（这里用不到 close，故不解构）
const { visible, confirm, cancel } = useDialog<ConfirmDialogParams, boolean>()

/** 语义类型对应的内置图标（与 ElMessageBox 的状态图标同一套） */
const TYPE_ICONS: Record<string, Component> = {
  warning: WarningFilled,
  danger: CircleCloseFilled,
  info: InfoFilled,
  success: SuccessFilled,
}

const type = computed(() => props.type ?? 'warning')
const icon = computed(() => props.icon ?? TYPE_ICONS[type.value])
const okType = computed(() => props.okType ?? (type.value === 'danger' ? 'danger' : 'primary'))

const okLoading = ref(false)

/**
 * 点确定：先跑本次 open 传入的 beforeOk 钩子（返回 false / 抛错都不关闭），
 * 通过才把 true 交回调用方（结果 action = DialogAction.Confirm）。
 */
async function handleOk() {
  const hook = props.beforeOk
  if (hook) {
    okLoading.value = true
    try {
      const allowed = await hook()
      if (allowed === false) return
    } catch {
      return
    } finally {
      okLoading.value = false
    }
  }
  confirm(true)
}
</script>

<template>
  <!-- 标准 el-dialog：保留关闭 X（走 DialogAction.Close），顶部定位不垂直居中 -->
  <el-dialog v-model="visible" class="pro-dialog" :title="props.title" width="420px">
    <!-- 确认体：对齐 ElMessageBox.confirm 的「状态图标 + 文案」原生结构 -->
    <div class="pro-confirm">
      <span class="pro-confirm-icon" :class="`is-${type}`">
        <component :is="icon" />
      </span>
      <p class="pro-confirm-text">{{ props.content }}</p>
    </div>

    <!-- 按钮内聚在组件内部：取消走 cancel()，确定走 beforeOk + confirm(true)。
         el-dialog 的 footer 默认右对齐，与 message-box 按钮区一致 -->
    <template #footer>
      <el-button @click="cancel">{{ props.cancelText }}</el-button>
      <el-button :type="okType" :loading="okLoading" @click="handleOk">
        {{ props.okText }}
      </el-button>
    </template>
  </el-dialog>
</template>
