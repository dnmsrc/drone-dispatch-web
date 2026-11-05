<script setup lang="ts">
// 业务弹窗组件：纯文本弹窗（复用一个组件支撑全屏 / 可拖拽两种包裹器）
//
// 全屏还是可拖拽，由包住它的包裹器在 open 时传参决定：
//   fullscreenDialog.open({ fullscreen: true, title: '全屏弹窗' })
//   draggableDialog.open({ draggable: true,  title: '可拖拽弹窗' })
import { useDialog } from '@/components/pro'
import type { TextDialogParams } from './advanced.dialogs'

defineOptions({ inheritAttrs: false })

const { visible, params, close, cancel } = useDialog<TextDialogParams, boolean>()
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    :class="params.class"
    :title="params.title ?? '弹窗'"
    :width="params.width ?? 520"
    :fullscreen="params.fullscreen"
    :draggable="params.draggable"
    align-center
  >
    <p v-if="params.description" class="pro-dialog-desc">{{ params.description }}</p>
    <div class="pro-dialog-text">{{ params.content }}</div>

    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="close(true)">{{ params.okText ?? '关闭' }}</el-button>
    </template>
  </el-dialog>
</template>
