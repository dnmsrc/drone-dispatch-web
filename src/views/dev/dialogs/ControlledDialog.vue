<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 业务弹窗组件：打开、关闭都由它自己控制
//
// 业务调用方只做一件事：await open() 拿「动作 + 数据」，不参与弹窗生命周期。
// 这里演示四种「组件自己决定何时关、为什么关」的方式：
//   ① 底部「取消」→ cancel()                    → 调用方收到 DialogAction.Cancel
//   ② 底部「确定」→ confirm(值)                 → 调用方收到 DialogAction.Confirm + 值
//   ③ 底部「稍后提醒」→ close(ControlledAction.RemindLater, 值)
//                                              → 调用方收到业务自定义动作 + 值
//   ④ 组件内倒计时到点 → close(DialogAction.Timeout, 值)
//                                              → 调用方收到 DialogAction.Timeout + 值
// ─────────────────────────────────────────────────────────────
import { onBeforeUnmount, ref, watch } from 'vue'
import { DialogAction, useDialog } from '@/components/pro'
import {
  CONTROLLED_AUTO_VALUE,
  CONTROLLED_LATER_VALUE,
  CONTROLLED_OK_VALUE,
  ControlledAction,
} from './controlled.constants'
import type { ControlledDialogParams } from './controlled.constants'

defineOptions({ inheritAttrs: false })

// 入参用标准 defineProps 接收（三层默认：组件默认 < options.props < open 入参）
const props = withDefaults(defineProps<ControlledDialogParams>(), {
  title: '自己控制开关的弹窗',
  content:
    '这个弹窗什么时候关由它自己决定：点按钮、点右上角 X、或者自己倒计时到点。调用方只是 await open() 等结果。',
})

const { visible, confirm, cancel, close } = useDialog<
  ControlledDialogParams,
  string,
  ControlledAction
>()

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
 * 调用方完全不知道这件事，只是 await 的 Promise 到时拿到
 * { action: DialogAction.Timeout, data: CONTROLLED_AUTO_VALUE }。
 */
function startAutoClose(seconds = 3) {
  stopCountdown()
  countdown.value = seconds
  const tick = () => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      timer = null
      close(DialogAction.Timeout, CONTROLLED_AUTO_VALUE)
      return
    }
    timer = setTimeout(tick, 1000)
  }
  timer = setTimeout(tick, 1000)
}

/** props.autoClose 让弹窗一打开就自己开始倒计时 */
watch(visible, (next) => {
  if (next && props.autoClose) startAutoClose(props.autoClose)
  else if (!next) stopCountdown()
})

onBeforeUnmount(stopCountdown)
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    :title="props.title"
    width="560px"
  >
    <p v-if="props.description" class="pro-dialog-desc">{{ props.description }}</p>
    <div class="pro-dialog-text">{{ props.content }}</div>

    <div v-if="countdown > 0" class="pro-dialog-tip">
      <el-tag type="warning" size="small">{{ countdown }} 秒后由弹窗自己关闭…</el-tag>
    </div>

    <template #footer>
      <el-button @click="startAutoClose()">3 秒后自己关闭</el-button>
      <el-button @click="cancel">取消</el-button>
      <el-button @click="close(ControlledAction.RemindLater, CONTROLLED_LATER_VALUE)">
        稍后提醒
      </el-button>
      <el-button type="primary" @click="confirm(CONTROLLED_OK_VALUE)">
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
