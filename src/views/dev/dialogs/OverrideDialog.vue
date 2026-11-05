<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 业务弹窗组件示例：自己定义「打开 / 关闭」动作，覆盖包裹器的默认动作
//
// 默认动作很简单：打开 = visible 置 true，关闭 = visible 置 false 并 settle。
// 如果业务需要更多逻辑（准备数据、埋点、二次确认…），就像这个组件一样
// defineExpose({ open, close }) —— 包裹器会优先调用组件自己的方法。
// ─────────────────────────────────────────────────────────────
import { ElMessage } from 'element-plus'
import { useDialog } from '@/components/pro'
import type { OverrideDialogParams } from './override.dialog'

defineOptions({ inheritAttrs: false })

const {
  visible,
  params,
  cancel,
  close: finish,
} = useDialog<OverrideDialogParams, string>()

/**
 * 覆盖默认「打开」：包裹器调 open() 时走的是这里。
 * 注意：组件自己负责把 visible 置 true（包裹器不再帮你打开）。
 */
function open(p: OverrideDialogParams) {
  ElMessage.info(`组件自定义的打开逻辑：准备「${p.title ?? '标题'}」的数据，再显示弹窗`)
  visible.value = true
}

/**
 * 覆盖默认「关闭」：包裹器调 close(result) 时走的是这里。
 * 注意：组件自己负责 settle —— 最后要调 runtime 的 close / cancel。
 */
function close(result?: string) {
  if (result === undefined) {
    ElMessage.warning('组件自定义的关闭逻辑：按「取消」关闭')
    cancel()
    return
  }
  ElMessage.success(`组件自定义的关闭逻辑：回传「${result}」`)
  finish(result)
}

// 暴露给包裹器：这两个方法会覆盖默认动作
defineExpose({ open, close })
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    :title="params.title ?? '覆盖默认动作的弹窗'"
    width="520px"
    align-center
  >
    <div class="pro-dialog-text">
      {{ params.content ??
        '这个弹窗的「打开 / 关闭」动作由组件自己实现（defineExpose），不是包裹器的默认动作。点按钮时看提示消息。' }}
    </div>

    <template #footer>
      <el-button @click="close()">取消（走组件自定义 close）</el-button>
      <el-button type="primary" @click="close('组件回传的值')">确定（走组件自定义 close）</el-button>
    </template>
  </el-dialog>
</template>
