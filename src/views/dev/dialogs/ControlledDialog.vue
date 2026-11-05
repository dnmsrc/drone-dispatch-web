<script setup lang="ts">
// 业务弹窗组件：演示被外部程序化控制（包裹器的 close() / destroy()）
//
// 组件本身不关心是谁关的；它只负责界面和"确定"按钮的返回值。
import { useDialog } from '@/components/pro'
import { CONTROLLED_OK_VALUE } from './controlled.dialog'
import type { ControlledDialogParams } from './controlled.dialog'

defineOptions({ inheritAttrs: false })

const { visible, params, close, cancel } = useDialog<ControlledDialogParams, string>()
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    :title="params.title ?? '被外部控制的弹窗'"
    width="520px"
    align-center
  >
    <p v-if="params.description" class="pro-dialog-desc">{{ params.description }}</p>
    <div class="pro-dialog-text">
      {{ params.content ?? '点页面上的「调用 .close()」或「调用 .destroy()」可以绕开底部按钮关闭这个弹窗。' }}
    </div>

    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="close(CONTROLLED_OK_VALUE)">
        确定并回传字符串
      </el-button>
    </template>
  </el-dialog>
</template>
