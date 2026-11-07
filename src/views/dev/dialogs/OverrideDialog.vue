<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 业务弹窗组件示例：自己定义「打开 / 关闭」动作，覆盖包裹器的默认动作
//
// 默认动作很简单：打开 = visible 置 true，关闭 = visible 置 false 并 settle。
// 如果业务需要更多逻辑（准备数据、埋点、二次确认…），就像这个组件一样
// defineExpose({ open, close }) —— 包裹器会优先调用组件自己的方法。
//
// 入参用标准 defineProps 接收；exposed.open(params) 的 params 与 props 同源，
// 组件内部统一读 props，params 只用于打开瞬间的额外处理。
//
// 注意 close 的签名是「动作 + 数据」：框架内部句柄关闭时也会传动作进来，
// 组件据此决定怎么处理（比如 Confirm 才 toast 成功提示）。
// ─────────────────────────────────────────────────────────────
import { ElMessage } from 'element-plus'
import { DialogAction, useDialog } from '@/components/pro'
import type { OverrideDialogParams } from './override.dialog'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<OverrideDialogParams>(), {
  title: '覆盖默认动作的弹窗',
  content:
    '这个弹窗的「打开 / 关闭」动作由组件自己实现（defineExpose），不是包裹器的默认动作。点按钮时看提示消息。',
})

const { visible, cancel, close: settle } = useDialog<OverrideDialogParams, string, string>()

/**
 * 覆盖默认「打开」：包裹器调 open(params) 时走的是这里。
 * 注意：组件自己负责把 visible 置 true（包裹器不再帮你打开）。
 */
function open(p: OverrideDialogParams) {
  ElMessage.info(`组件自定义的打开逻辑：准备「${p.title ?? props.title}」的数据，再显示弹窗`)
  visible.value = true
}

/**
 * 覆盖默认「关闭」：包裹器调 close(action, data) 时走的是这里。
 * 注意：组件自己负责 settle —— 最后要调 runtime 的 confirm / cancel / close。
 */
function close(action: DialogAction | string = DialogAction.Cancel, data: string | null = null) {
  if (action === DialogAction.Confirm) {
    ElMessage.success(`组件自定义的关闭逻辑：回传「${data}」`)
    settle(DialogAction.Confirm, data)
    return
  }
  if (action === DialogAction.Cancel) {
    ElMessage.warning('组件自定义的关闭逻辑：按「取消」关闭')
    cancel()
    return
  }
  // 其它动作（超时 / 业务自定义动作）原样交回
  settle(action, data)
}

// 暴露给包裹器：这两个方法会覆盖默认动作
defineExpose({ open, close })
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    :title="props.title"
    width="520px"
  >
    <div class="pro-dialog-text">{{ props.content }}</div>

    <template #footer>
      <el-button @click="close(DialogAction.Cancel)">取消（走组件自定义 close）</el-button>
      <el-button type="primary" @click="close(DialogAction.Confirm, '组件回传的值')">
        确定（走组件自定义 close）
      </el-button>
    </template>
  </el-dialog>
</template>
