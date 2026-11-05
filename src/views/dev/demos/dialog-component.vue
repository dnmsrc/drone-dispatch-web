<script setup lang="ts">
// 弹窗 · 自定义内容组件：包裹器包住任意组件，结果由组件里 dialog.close() 回传
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { confirmDialog } from '@/components/pro'
import { orderPickerDialog } from '../dialogs/order-picker.dialog'
import DemoBlock from '../components/DemoBlock.vue'

const lastResult = ref('（还没有选择数据）')

/** Promise 风格：打开 → 拿到选中的行 → 接着弹确认框 → 继续后续逻辑 */
async function pickOrder() {
  const picked = await orderPickerDialog.open()

  if (!picked) {
    lastResult.value = '未选择（关闭弹窗返回 null）'
    return
  }

  lastResult.value = JSON.stringify(picked, null, 2)

  // 拿到结果后继续：确认再执行
  const ok = await confirmDialog.open({
    title: '推送接单通知',
    content: `向「${picked.nickname}」推送订单 ${picked.id} 的接单通知？`,
    type: 'info',
    okText: '推送',
  })
  if (!ok) return
  ElMessage.success(`已向 ${picked.nickname} 推送接单通知（演示）`)
}

/** 回调风格：第二个参数直接传一个函数，关闭时调用一次（确定传行数据，取消传 null） */
function pickOrderWithCallback() {
  orderPickerDialog.open(
    { keyword: '滨江' },
    (picked) => {
      lastResult.value = picked
        ? `回调收到：${JSON.stringify(picked)}`
        : '回调收到 null（取消 / 关闭）'
    },
  )
}

const code = `// ① 配置文件：src/dialogs/order-picker.dialog.ts
import OrderPicker from '@/views/order/OrderPicker.vue'
export const orderPickerDialog = defineDialog<OrderPickerParams, MockOrder>({
  name: 'order-picker',
  component: OrderPicker,     // 普通组件，不需要知道自己是弹窗
  title: '选择订单',
  width: 840,
  showFooter: false,          // 底部按钮由内容组件自己给
})

// ② OrderPicker.vue：只负责把选中项交出去
const dialog = useDialogContext<MockOrder>()
function pick(row: MockOrder) {
  dialog?.close(row)          // 关闭并把 row 交回调用方
}

// ③ 业务里：await 结果 → 继续
const picked = await orderPickerDialog.open()
if (!picked) return

// ④ 也可以只传回调（第二个参数是函数时，关闭时调用一次）
orderPickerDialog.open({ keyword: '滨江' }, (picked) => {
  if (picked) console.log(picked.id)
})`

</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="包裹器里放任意组件"
      desc="组件通过 useDialogContext() 或 props.dialog 主动关闭并回传值"
      :code="code"
    >
      <div class="demo-actions">
        <el-button type="primary" @click="pickOrder">选择订单（await）</el-button>
        <el-button @click="pickOrderWithCallback">选择订单（只传回调）</el-button>
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
