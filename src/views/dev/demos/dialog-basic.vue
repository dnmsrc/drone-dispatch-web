<script setup lang="ts">
// 弹窗 · 基础用法：包裹器 Promise 风格、回调风格、内置确认框
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { confirmDialog } from '@/components/pro'
import { messageDialog } from '../dialogs/message.dialog'
import DemoBlock from '../components/DemoBlock.vue'

const lastResult = ref('（还没有操作）')

/** 统一记录结果，方便肉眼验证返回值 */
function record(label: string, value: unknown) {
  lastResult.value =
    value === null ? `${label} → null（取消 / 关闭）` : `${label} → ${JSON.stringify(value)}`
}

/** 最常用：await 弹窗结果，代码按顺序往下写 */
async function openBasic() {
  const result = await messageDialog.open({
    title: '普通弹窗',
    description: '打开后 script 停在这一行，结果回来后继续往下执行。',
    content: '点「确定」返回 true；点「取消」、右上角关闭、按 ESC 返回 null。',
    okText: '知道了',
  })
  record('messageDialog.open()', result)
}

/** 确认框也是一个包裹器：await 直接拿到布尔值 */
async function removeOrder() {
  const ok = await confirmDialog.open({
    title: '删除订单',
    content: '删除后订单数据不可恢复，确认删除「DD202511050001」？',
    type: 'danger',
    okText: '删除',
  })
  if (!ok) {
    record('删除订单', null)
    return
  }
  ElMessage.success('已删除（演示，实际这里调删除接口）')
  record('删除订单', '确认 → 继续执行删除逻辑')
}

/** 回调风格：不 await，结果走 onOk / onCancel / onClose */
function callbackStyle() {
  void messageDialog.open(
    {
      title: '回调风格',
      content: '不 await 也能用，结果通过 onOk / onCancel / onClose 回调交回。',
      okText: '继续',
    },
    {
      onOk: () => {
        record('回调风格', 'onOk 被调用')
        ElMessage.success('onOk 收到结果')
      },
      onCancel: () => record('回调风格', 'onCancel 被调用'),
      onClose: () => record('回调风格', 'onClose 被调用（点 X / 遮罩 / ESC）'),
    },
  )
}

const code = `// ① 弹窗的"配置文件"：src/dialogs/message.dialog.ts
import { defineDialog } from '@/components/pro'
export const messageDialog = defineDialog<MessageDialogParams, boolean>({
  name: 'message',
  title: (params) => params.title ?? '提示',
  content: (params) => params.content,
  okValue: true,          // 非表单模式：确定时返回的值
})

// ② 业务里只认包裹器：await 拿结果，代码按顺序写
import { messageDialog } from '@/dialogs/message.dialog'
const result = await messageDialog.open({ title: '普通弹窗', content: '…' })
if (result === null) return       // 取消 / 关闭

// ③ 回调风格（不 await 也行）
messageDialog.open(
  { title: '回调风格', content: '…' },
  { onOk: () => save(), onCancel: () => ElMessage.info('已取消') },
)

// ④ 内置确认框同样是包裹器：.open 返回 true / null
const ok = await confirmDialog.open({ content: '确认删除？', type: 'danger' })`

</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="包裹器：引入配置文件，调 .open() 打开"
      desc="弹窗逻辑与业务逻辑写在一起，不在 template 里维护 visible 变量"
      :code="code"
    >
      <div class="demo-actions">
        <el-button type="primary" @click="openBasic">打开普通弹窗</el-button>
        <el-button type="danger" plain @click="removeOrder">删除前确认</el-button>
        <el-button @click="callbackStyle">回调风格</el-button>
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
