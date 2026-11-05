<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 业务弹窗组件：打开、关闭都由它自己控制
//
// 业务调用方只做一件事：await open() 拿结果，不参与弹窗生命周期。
// 这里演示三种「组件自己决定何时关」的方式：
//   ① 底部「取消」→ cancel()（调用方拿到 null）
//   ② 底部「确定」→ close(值)（调用方拿到值）
//   ③ 组件内倒计时到点 → 自己 close(值)，调用方照样拿到结果
// ─────────────────────────────────────────────────────────────
import { onBeforeUnmount, ref, watch } from 'vue'
import { useDialog } from '@/components/pro'
import { CONTROLLED_AUTO_VALUE, CONTROLLED_OK_VALUE } from './controlled.dialog'
import type { ControlledDialogParams } from './controlled.dialog'

defineOptions({ inheritAttrs: false })

const { visible, params, close, cancel } = useDialog<ControlledDialogParams, string>()

/** 倒计时还剩几秒（0 = 没在倒计时） */
const countdown = ref(0)
let timer: ReturnType<typeof setTimeout> | null = null

function stopCountdown() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  countdown.value = 0
}

/**
 * 弹窗自己决定：N 秒后自动关闭。
 * 调用方完全不知道这件事，只是 await 的 Promise 到点才有了结果。
 */
function startAutoClose(seconds = 3) {
  stopCountdown()
  countdown.value = seconds
  const tick = () => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      timer = null
      close(CONTROLLED_AUTO_VALUE)
      return
    }
    timer = setTimeout(tick, 1000)
  }
  timer = setTimeout(tick, 1000)
}

/** params.autoClose 让弹窗一打开就自己开始倒计时 */
watch(visible, (next) => {
  if (next && params.autoClose) startAutoClose(params.autoClose)
  else if (!next) stopCountdown()
})

onBeforeUnmount(stopCountdown)
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    :title="params.title ?? '自己控制开关的弹窗'"
    width="520px"
    align-center
  >
    <p v-if="params.description" class="pro-dialog-desc">{{ params.description }}</p>
    <div class="pro-dialog-text">
      {{
        params.content ??
        '这个弹窗什么时候关由它自己决定：点按钮、点右上角 X、或者自己倒计时到点。调用方只是 await open() 等结果。'
      }}
    </div>

    <div v-if="countdown > 0" class="pro-dialog-tip">
      <el-tag type="warning" size="small">{{ countdown }} 秒后由弹窗自己关闭…</el-tag>
    </div>

    <template #footer>
      <el-button @click="startAutoClose()">3 秒后自己关闭</el-button>
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="close(CONTROLLED_OK_VALUE)">
        确定并回传字符串
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.pro-dialog-tip {
  margin-top: 12px;
}
</style>
