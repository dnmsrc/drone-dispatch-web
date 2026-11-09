<script setup lang="ts">
// 弹窗 · 进阶：嵌套弹窗、全屏 / 可拖拽、确定前校验失败保持打开
//
// 结果统一是 { action, data }，用 DialogAction 枚举判断，不靠 null 猜语义。
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DialogAction, confirmDialog } from '@/components/pro'
import type { DialogResult } from '@/components/pro'
import { nestedDialog } from '../dialogs/nested.dialog'
import { draggableDialog, fullscreenDialog } from '../dialogs/advanced.dialogs'
import DemoBlock from '../components/DemoBlock.vue'

const lastResult = ref('（还没有操作）')

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** 把「动作 + 数据」显示成一行，方便肉眼验证（全屏 / 可拖拽回传 boolean，嵌套回传 string） */
function describe(result: DialogResult<unknown>) {
  const data = result.data === null ? 'null' : `「${String(result.data)}」`
  return `action: ${result.action}，data: ${data}`
}

/** 嵌套：外层弹窗里再开内层弹窗，层级自动递增，下拉浮层也不会被遮 */
async function openNested() {
  const result = await nestedDialog.open()
  lastResult.value = describe(result)
}

/** 全屏弹窗 */
async function openFullscreen() {
  const result = await fullscreenDialog.open({
    title: '全屏弹窗',
    description: 'fullscreen: true；长内容时 body 自动滚动，底部按钮始终可见',
    fullscreen: true,
    content:
      '这是一个全屏弹窗，适合放表格、详情、长文档。\n\n内容超出高度时弹窗 body 区自动滚动，底部按钮始终可见。\n\n全屏时 draggable 不生效。',
    okText: '关闭',
  })
  lastResult.value = `全屏弹窗 → ${describe(result)}`
}

/** 可拖拽弹窗 */
async function openDraggable() {
  const result = await draggableDialog.open({
    title: '可拖拽弹窗',
    description: 'draggable: true，按住标题栏拖动',
    draggable: true,
    width: 520,
    content: '按住标题栏可以拖动这个弹窗，适合需要对照页面内容的场景。',
  })
  lastResult.value = `可拖拽弹窗 → ${describe(result)}`
}

/** 确定前钩子校验失败：弹窗保持打开（不关闭、不丢输入） */
async function permissionCheck() {
  const result = await confirmDialog.open({
    title: '归档订单',
    content: '归档前会做权限校验（演示：第一次必然失败），失败时弹窗保持打开。',
    type: 'warning',
    okText: '归档',
    beforeOk: async () => {
      await sleep(600)
      ElMessage.error('权限校验未通过（模拟），弹窗保持打开')
      return false
    },
  })
  lastResult.value =
    result.action === DialogAction.Confirm
      ? '归档成功（action: confirm）'
      : `未通过校验 / 未确认 → action: ${result.action}`
}

const code = `// ① 嵌套：内层弹窗有自己的组件 + 平行配置
// inner.dialog.ts
export const innerDialog = wrapDialog<InnerDialogParams, boolean>(InnerDialog, { name: 'inner' })

// NestedOuterDialog.vue（外层弹窗组件）里直接调内层包裹器
innerDialog.open({}, { onConfirm: () => ElMessage.success('内层确定'),
                       onCancel:  () => ElMessage.info('内层被取消') })

// 页面里打开外层：结果用枚举判断
const result = await nestedDialog.open()
if (result.action === DialogAction.Confirm) use(result.data)

// ② 全屏 / 可拖拽：同一个组件、两个包裹器，形态由 open 的参数决定
await fullscreenDialog.open({ title: '全屏弹窗', fullscreen: true, content: '…' })
await draggableDialog.open({ title: '可拖拽弹窗', draggable: true, content: '…' })

// ③ 确定前钩子：作为 open 参数传给组件，返回 false 或抛异常都不关闭
const result = await confirmDialog.open({
  title: '归档订单',
  content: '…',
  type: 'warning',
  okText: '归档',
  beforeOk: async () => (await checkPermission()) ? true : false,
})
if (result.action === DialogAction.Confirm) archive()
`
</script>

<template>
  <div class="demo-page">
    <DemoBlock title="进阶用法" desc="嵌套弹窗 / 全屏 / 可拖拽 / 确定前校验失败不关闭" :code="code">
      <div class="demo-actions">
        <el-button type="primary" @click="openNested">嵌套弹窗</el-button>
        <el-button @click="openFullscreen">全屏弹窗</el-button>
        <el-button @click="openDraggable">可拖拽弹窗</el-button>
        <el-button type="warning" plain @click="permissionCheck">校验失败保持打开</el-button>
      </div>

      <div class="demo-result">
        <div class="demo-result-title">最近一次结果</div>
        <pre class="demo-block-code">{{ lastResult }}</pre>
      </div>
    </DemoBlock>
  </div>
</template>

<style scoped>
.demo-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.demo-result {
  margin-top: 16px;
}

.demo-result-title {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--app-text-secondary);
}
</style>
