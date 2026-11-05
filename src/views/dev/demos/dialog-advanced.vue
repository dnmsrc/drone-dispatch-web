<script setup lang="ts">
// 弹窗 · 进阶：嵌套弹窗、全屏 / 可拖拽、确定失败保持打开
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { confirmDialog, openDialog } from '@/components/pro'
import DialogNestedDemo from '../components/DialogNestedDemo.vue'
import DemoBlock from '../components/DemoBlock.vue'

const lastResult = ref('（还没有操作）')

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** 嵌套：外层弹窗里再开内层弹窗，层级自动递增，下拉浮层也不会被遮 */
async function openNested() {
  const result = await openDialog<string>({
    title: '嵌套弹窗',
    description: 'showFooter: false，底部按钮由内容组件自己提供；内容里可以再打开弹窗',
    component: DialogNestedDemo,
    width: 600,
    showFooter: false,
  })
  lastResult.value =
    result === null ? 'null（被关闭，没有回传值）' : `回传值：${result}`
}

/** 全屏 + 可拖拽 + 无底部按钮 */
async function openFullscreen() {
  const result = await openDialog<boolean>({
    title: '全屏弹窗',
    description: 'fullscreen: true；长内容时 body 自动滚动',
    fullscreen: true,
    content:
      '这是一个全屏弹窗，适合放表格、详情、长文档。\n\n内容超出高度时弹窗 body 区自动滚动，底部按钮始终可见。\n\n也可以配合 draggable: true 让弹窗可拖动（全屏时不生效）。',
    okText: '关闭',
  })
  lastResult.value = `全屏弹窗 → ${result === null ? 'null' : result}`
}

async function openDraggable() {
  const result = await openDialog<boolean>({
    title: '可拖拽弹窗',
    draggable: true,
    width: 520,
    content: '按住标题栏可以拖动这个弹窗，适合需要对照页面内容的场景。',
  })
  lastResult.value = `可拖拽弹窗 → ${result === null ? 'null' : result}`
}

/** 确定前钩子校验失败：弹窗保持打开（不关闭、不丢输入） */
async function permissionCheck() {
  const ok = await confirmDialog({
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
  lastResult.value = ok ? '归档成功' : '未通过校验，弹窗保持打开'
}

const code = `// 嵌套：内容组件里再开弹窗
openDialog({ title: '嵌套弹窗', component: NestedPanel, showFooter: false })

// 全屏 / 可拖拽
await openDialog({ title: '全屏弹窗', fullscreen: true, content: '…' })
await openDialog({ title: '可拖拽弹窗', draggable: true, content: '…' })

// 确定前钩子：返回 false 或抛异常都不关闭
await confirmDialog({
  title: '归档订单',
  content: '…',
  beforeOk: async () => {
    const allowed = await checkPermission()
    return allowed            // false → 保持在弹窗里
  },
})`
</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="进阶用法"
      desc="嵌套弹窗 / 全屏 / 可拖拽 / 确定前校验失败不关闭"
      :code="code"
    >
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
