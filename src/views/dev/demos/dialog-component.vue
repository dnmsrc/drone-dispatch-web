<script setup lang="ts">
// 弹窗 · 自定义内容组件：把任意组件交给 openDialog，结果由组件里 dialog.close() 回传
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { confirmDialog, openDialog } from '@/components/pro'
import type { MockOrder } from '../mock'
import OrderPicker from '../components/OrderPicker.vue'
import DemoBlock from '../components/DemoBlock.vue'

const lastResult = ref('（还没有选择数据）')

/** 打开"选择订单"弹窗 → 拿到选中的行 → 接着弹确认框 → 继续后续逻辑 */
async function pickOrder() {
  const picked = await openDialog<MockOrder>({
    title: '选择订单',
    description: '内容是一个普通组件（OrderPicker），它用 useDialogContext().close(row) 回传选中项',
    component: OrderPicker,
    width: 840,
    showFooter: false, // 交互全部由内容组件自己完成
  })

  if (!picked) {
    lastResult.value = '未选择（关闭弹窗返回 null）'
    return
  }

  lastResult.value = JSON.stringify(picked, null, 2)

  // 拿到结果后继续：确认再执行
  const ok = await confirmDialog({
    title: '推送接单通知',
    content: `向「${picked.nickname}」推送订单 ${picked.id} 的接单通知？`,
    type: 'info',
    okText: '推送',
  })
  if (!ok) return
  ElMessage.success(`已向 ${picked.nickname} 推送接单通知（演示）`)
}

const code = `// OrderPicker.vue：一个普通组件，不认识"弹窗"
const dialog = useDialogContext<MockOrder>()
function pick(row) { dialog?.close(row) }

// 调用方：打开弹窗 → 等结果 → 继续
const picked = await openDialog<MockOrder>({
  title: '选择订单',
  component: OrderPicker,
  width: 840,
  showFooter: false,          // 底部按钮由内容组件自己给
})
if (!picked) return           // 关闭 / 取消 → null

const ok = await confirmDialog({ title: '推送接单通知', content: \`\${picked.id}\` })
if (!ok) return
await pushNotice(picked)`
</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="弹窗里放任意组件"
      desc="组件通过 useDialogContext() 或 props.dialog 主动关闭并回传值"
      :code="code"
    >
      <div class="demo-actions">
        <el-button type="primary" @click="pickOrder">选择订单</el-button>
      </div>

      <div class="demo-result">
        <div class="demo-result-title">弹窗回传的数据</div>
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
