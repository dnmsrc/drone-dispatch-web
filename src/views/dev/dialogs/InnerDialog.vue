<script setup lang="ts">
// 业务弹窗组件：嵌套场景的内层弹窗
// 单独一个组件 + 平行配置文件，方便被任意弹窗 / 页面复用（这里被 NestedOuterDialog 引用）。
import { useDialog } from '@/components/pro'
import type { InnerDialogParams } from './inner.dialog'

defineOptions({ inheritAttrs: false })

const { visible, params, close, cancel } = useDialog<InnerDialogParams, boolean>()
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    :title="params.title ?? '内层弹窗'"
    width="420px"
    align-center
  >
    <div class="pro-dialog-text">
      {{ params.content ?? '我是从外层弹窗里再打开的弹窗。层级自动高于外层，下拉框等浮层也不受影响。' }}
    </div>

    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="close(true)">确认</el-button>
    </template>
  </el-dialog>
</template>
