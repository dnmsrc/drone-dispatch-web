<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 业务弹窗组件示例：最普通的写法
//
// 它是一个完全正常的 Vue 组件：自己写 <el-dialog>、自己的按钮、自己的文案。
// 入参用标准 defineProps 接收（不再从 useDialog().params 读）：
//   三层默认优先级 —— 组件 withDefaults 默认 < wrapDialog options.props < open() 入参
// useDialog() 只拿运行时能力：visible 与 confirm / cancel / close。
//
// 平行位置的 message.dialog.ts 用 wrapDialog 把它包成句柄，业务里调 .open() 就能打开。
// ─────────────────────────────────────────────────────────────
import { useDialog } from '@/components/pro'
import type { MessageDialogParams } from './message.dialog'

defineOptions({ inheritAttrs: false })

// 标准 props：open() 入参 / options.props 默认值合并后从这里进来
const props = withDefaults(defineProps<MessageDialogParams>(), {
  title: '提示',
  okText: '知道了',
})

const { visible, confirm, cancel } = useDialog<MessageDialogParams, boolean>()
</script>

<template>
  <el-dialog v-model="visible" class="pro-dialog" :title="props.title" width="480px">
    <p v-if="props.description" class="pro-dialog-desc">{{ props.description }}</p>
    <div class="pro-dialog-text">{{ props.content }}</div>

    <!-- 底部按钮由业务组件自己写：点确定 confirm(true)（动作=Confirm），点取消 cancel() -->
    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="confirm(true)">
        {{ props.okText }}
      </el-button>
    </template>
  </el-dialog>
</template>
