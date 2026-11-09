<script setup lang="ts">
// 业务弹窗组件：嵌套场景的内层弹窗
// 单独一个组件 + 平行配置文件，方便被任意弹窗 / 页面复用（这里被 NestedOuterDialog 引用）。
//
// 入参用标准 defineProps 接收（三层默认：组件默认 < options.props < open 入参）。
import { useDialog } from '@/components/pro'
import type { InnerDialogParams } from './inner.dialog'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<InnerDialogParams>(), {
  title: '内层弹窗',
  content: '我是从外层弹窗里再打开的弹窗。层级自动高于外层，下拉框等浮层也不受影响。',
})

const { visible, confirm, cancel } = useDialog<InnerDialogParams, boolean>()
</script>

<template>
  <el-dialog v-model="visible" class="pro-dialog" :title="props.title" width="420px">
    <div class="pro-dialog-text">{{ props.content }}</div>

    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="confirm(true)">确认</el-button>
    </template>
  </el-dialog>
</template>
