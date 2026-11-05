<script setup lang="ts">
// 嵌套弹窗示例：本身作为弹窗内容组件，内部再打开 innerDialog
// 用来验证层级（内层高于外层）、以及 showFooter=false 时内容自己控制关闭
import { ElMessage } from 'element-plus'
import { useDialogContext } from '@/components/pro'
import { innerDialog } from '../dialogs/inner.dialog'

const dialog = useDialogContext<string>()

/** 在外层弹窗里再开一个弹窗（不 await，用回调拿结果） */
function openNested() {
  void innerDialog.open(
    {},
    {
      onOk: () => ElMessage.success('内层弹窗点了确定'),
      onCancel: () => ElMessage.info('内层弹窗被取消'),
    },
  )
}
</script>

<template>
  <div class="nested-demo">
    <p class="nested-demo-text">
      外层弹窗（showFooter=false，底部按钮由内容自己提供）。
      点下面的按钮会用「内层弹窗的包裹器」再打开一个弹窗，层级自动高于外层。
    </p>
    <div class="nested-demo-actions">
      <el-button type="primary" @click="openNested">在外层再开一个弹窗</el-button>
      <el-button @click="dialog?.close('外层回传的值')">关闭并回传「外层回传的值」</el-button>
    </div>
  </div>
</template>

<style scoped>
.nested-demo-text {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--app-text-regular);
}

.nested-demo-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
