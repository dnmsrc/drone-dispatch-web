<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 内置确认框组件（一个"正常定义的弹窗组件"）
//
// 它和业务自己写的弹窗完全一样：自己写 <el-dialog>、自己写底部按钮、
// 通过 useDialog() 拿 visible 与 close。
// confirm.ts 只是用 wrapDialog 把它包起来导出成 confirmDialog。
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

const { visible, params, close, cancel } = useDialog<ConfirmDialogParams, boolean>()

/** 语义类型对应的内置图标 */
const TYPE_ICONS: Record<string, Component> = {
  warning: WarningFilled,
  danger: CircleCloseFilled,
  info: InfoFilled,
  success: SuccessFilled,
}

const type = computed(() => params.type ?? 'warning')
const icon = computed(() => params.icon ?? TYPE_ICONS[type.value])
const okType = computed(
  () => params.okType ?? (type.value === 'danger' ? 'danger' : 'primary'),
)

const okLoading = ref(false)

/**
 * 点确定：先跑本次 open 传入的 beforeOk 钩子（返回 false / 抛错都不关闭），
 * 通过才把 true 交回调用方。
 */
async function handleOk() {
  const hook = params.beforeOk
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
  close(true)
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    :title="params.title ?? '提示'"
    width="440px"
    align-center
    :show-close="false"
    :close-on-click-modal="false"
  >
    <div class="pro-confirm">
      <span class="pro-confirm-icon" :class="`is-${type}`">
        <component :is="icon" />
      </span>
      <div class="pro-confirm-text">{{ params.content }}</div>
    </div>

    <template #footer>
      <el-button @click="cancel">{{ params.cancelText ?? '取消' }}</el-button>
      <el-button :type="okType" :loading="okLoading" @click="handleOk">
        {{ params.okText ?? '确定' }}
      </el-button>
    </template>
  </el-dialog>
</template>
