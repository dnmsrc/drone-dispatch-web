<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 业务弹窗组件示例：在通用「取消 / 确定」之外多加一个「稍后处理」按钮
//
// 不改内置 ConfirmDialog，也不从外部传插槽 —— 直接写一个自己的弹窗组件，
// 三个按钮都内聚在模板里。点击分别对应包裹器提供的三种方法：
//   稍后处理 → close(DialogAction.Close)   用户没做决定，动作是 Close（data 恒为 null）
//   取消     → cancel()                    动作是 Cancel
//   知道了   → confirm(true)               动作是 Confirm，带数据 true
// ─────────────────────────────────────────────────────────────
import { ElButton, ElDialog } from 'element-plus'
import { DialogAction, useDialog } from '@/components/pro'
import type { TripleConfirmParams } from './triple.constants'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<TripleConfirmParams>(), {
  title: '三按钮确认框',
  laterText: '稍后处理',
  cancelText: '取消',
  okText: '知道了',
})

// 只用框架内置动作，第三个泛型不必传（没有业务自定义枚举）
const { visible, confirm, cancel, close } = useDialog<TripleConfirmParams, boolean>()

/** 稍后处理：用户没做决定，以 Close 动作结束（与 X / ESC 同语义，data 为 null） */
function later() {
  close(DialogAction.Close)
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    :title="props.title"
    width="460px"
    :close-on-click-modal="false"
  >
    <div class="pro-dialog-text">{{ props.content }}</div>

    <!-- 按钮全部内聚：三个按钮三种关闭方式，都是包裹器给的方法 -->
    <template #footer>
      <el-button @click="later">{{ props.laterText }}</el-button>
      <el-button @click="cancel">{{ props.cancelText }}</el-button>
      <el-button type="primary" @click="confirm(true)">{{ props.okText }}</el-button>
    </template>
  </el-dialog>
</template>
