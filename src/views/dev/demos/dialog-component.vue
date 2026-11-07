<script setup lang="ts">
// 弹窗 · 自定义内容组件：包裹器包住任意组件，结果由组件里 confirm(row) 回传
//
// 结果统一是 { action, data }：选择一行 → action = Confirm + 行数据；
// 取消 / 点 X → 其它 action + data = null（语义一律看 action，不看 data）。
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DialogAction, confirmDialog } from '@/components/pro'
import { orderPickerDialog } from '../dialogs/order-picker.dialog'
import DemoBlock from '../components/DemoBlock.vue'

const lastResult = ref('（还没有选择数据）')

/** Promise 风格：打开 → 拿到选中的行 → 接着弹确认框 → 继续后续逻辑 */
async function pickOrder() {
  const result = await orderPickerDialog.open()

  if (result.action !== DialogAction.Confirm) {
    lastResult.value = `未选择 → action: ${result.action}（没有回传数据）`
    return
  }

  const picked = result.data
  lastResult.value = JSON.stringify(picked, null, 2)

  // 拿到结果后继续：确认再执行
  const confirmed = await confirmDialog.open({
    title: '推送接单通知',
    content: `向「${picked.nickname}」推送订单 ${picked.id} 的接单通知？`,
    type: 'info',
    okText: '推送',
  })
  if (confirmed.action !== DialogAction.Confirm) return
  ElMessage.success(`已向 ${picked.nickname} 推送接单通知（演示）`)
}

/** 回调风格：第二个参数直接传一个函数，关闭时调用一次（参数是完整结果） */
function pickOrderWithCallback() {
  orderPickerDialog.open(
    { keyword: '滨江' },
    (result) => {
      lastResult.value =
        result.action === DialogAction.Confirm
          ? `回调收到（action: confirm）：${JSON.stringify(result.data)}`
          : `回调收到（action: ${result.action}）→ 没有选择数据`
    },
  )
}

const code = `// ① 业务组件：OrderPickerDialog.vue —— 入参 defineProps，useDialog 只拿运行时能力
const props = withDefaults(defineProps<OrderPickerParams>(), { title: '选择订单', keyword: '' })
const { visible, confirm, cancel } = useDialog<OrderPickerParams, MockOrder>()

<el-dialog v-model="visible" :title="props.title" width="840px">
  <el-table :data="rows" @row-dblclick="pick"> … </el-table>
</el-dialog>
function pick(row) { confirm(row) }   // 确认关闭并回传选中的行

// ② 平行位置的 ts：order-picker.dialog.ts
export const orderPickerDialog = wrapDialog<OrderPickerParams, MockOrder>(OrderPickerDialog, {
  name: 'order-picker',
})

// ③ 业务里：await 结果 → 按 action 分支 → 接着往下做
const result = await orderPickerDialog.open({ keyword: '滨江' })
if (result.action !== DialogAction.Confirm) return   // 用户取消 / 点 X
await pushNotify(result.data)

// ④ 也可以只传回调（第二个参数是函数时，关闭时调用一次，参数是完整结果）
orderPickerDialog.open({ keyword: '滨江' }, (result) => {
  if (result.action === DialogAction.Confirm) console.log(result.data.id)
})
`

</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="包裹器里放任意组件"
      desc="组件自己写 el-dialog，用 useDialog().confirm(row) 主动关闭并回传；结果按 action 判断"
      :code="code"
    >
      <div class="demo-actions">
        <el-button type="primary" @click="pickOrder">选择订单（await）</el-button>
        <el-button @click="pickOrderWithCallback">选择订单（只传回调）</el-button>
      </div>

      <div class="demo-result">
        <div class="demo-result-title">弹窗的结果（action + data）</div>
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
