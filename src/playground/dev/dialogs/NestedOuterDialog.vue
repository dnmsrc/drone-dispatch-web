<script setup lang="ts">
// 业务弹窗组件：嵌套场景的外层弹窗
// 它内部直接 import 内层弹窗的配置文件并 .open()，层级由 Element 全局计数器自动递增。
//
// 入参用标准 defineProps 接收；useDialog() 只拿运行时能力。
import { ElMessage } from 'element-plus'
import { useDialog } from '@/components/pro'
import { innerDialog } from './inner.dialog'
import type { NestedDialogParams } from './nested.dialog'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<NestedDialogParams>(), {
  title: '嵌套弹窗',
})

const { visible, confirm, cancel } = useDialog<NestedDialogParams, string>()

/** 在外层弹窗里再开一个弹窗（不 await，用回调拿结果） */
function openNested() {
  void innerDialog.open(
    {},
    {
      onConfirm: () => ElMessage.success('内层弹窗点了确定'),
      onCancel: () => ElMessage.info('内层弹窗被取消'),
    },
  )
}
</script>

<template>
  <el-dialog v-model="visible" class="pro-dialog" :title="props.title" width="600px">
    <div class="nested-demo">
      <p class="nested-demo-text">
        外层弹窗（底部按钮由组件自己提供，没有默认的确定/取消）。
        点下面的按钮会用「内层弹窗的包裹器」再打开一个弹窗，层级自动高于外层。
      </p>
      <div class="nested-demo-actions">
        <el-button type="primary" @click="openNested">在外层再开一个弹窗</el-button>
        <el-button @click="confirm('外层回传的值')">关闭并回传「外层回传的值」</el-button>
        <el-button @click="cancel">取消</el-button>
      </div>
    </div>
  </el-dialog>
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
