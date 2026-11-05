<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 业务弹窗组件示例：最普通的写法
//
// 它是一个完全正常的 Vue 组件：自己写 <el-dialog>、自己的按钮、自己的文案。
// 唯一和普通组件不同的是：visible / 打开参数 / 关闭方法由包裹器注入（useDialog）。
//
// 平行位置的 message.dialog.ts 用 wrapDialog 把它包成句柄，业务里调 .open() 就能打开。
// ─────────────────────────────────────────────────────────────
import { useDialog } from '@/components/pro'
import type { MessageDialogParams } from './message.dialog'

defineOptions({ inheritAttrs: false })

const { visible, params, close, cancel } = useDialog<MessageDialogParams, boolean>()
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    :title="params.title ?? '提示'"
    width="480px"
    align-center
  >
    <p v-if="params.description" class="pro-dialog-desc">{{ params.description }}</p>
    <div class="pro-dialog-text">{{ params.content }}</div>

    <!-- 底部按钮由业务组件自己写：点确定 close(true)，点取消 cancel() -->
    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="close(true)">
        {{ params.okText ?? '知道了' }}
      </el-button>
    </template>
  </el-dialog>
</template>
