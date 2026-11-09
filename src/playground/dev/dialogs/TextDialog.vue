<script setup lang="ts">
// 业务弹窗组件：纯文本弹窗（复用一个组件支撑全屏 / 可拖拽两种包裹器）
//
// 全屏还是可拖拽，由包住它的包裹器在 open 时传参决定：
//   fullscreenDialog.open({ fullscreen: true, title: '全屏弹窗' })
//   draggableDialog.open({ draggable: true,  title: '可拖拽弹窗' })
//
// 入参用标准 defineProps 接收（三层默认：组件默认 < options.props < open 入参）。
import { useDialog } from '@/components/pro'
import type { TextDialogParams } from './advanced.dialogs'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<TextDialogParams>(), {
  title: '弹窗',
  width: 520,
  okText: '关闭',
})

const { visible, confirm, cancel } = useDialog<TextDialogParams, boolean>()
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    :class="props.class"
    :title="props.title"
    :width="props.width"
    :fullscreen="props.fullscreen"
    :draggable="props.draggable"
  >
    <p v-if="props.description" class="pro-dialog-desc">{{ props.description }}</p>
    <div class="pro-dialog-text">{{ props.content }}</div>

    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="confirm(true)">{{ props.okText }}</el-button>
    </template>
  </el-dialog>
</template>
