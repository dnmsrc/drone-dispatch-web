<script setup lang="ts">
// 弹窗 · 表单：包裹器包住 fields 配置式表单，确定时自动校验
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { orderFormDialog } from '../dialogs/order-form.dialog'
import type { OrderFormData } from '../dialogs/order-form.dialog'
import DemoBlock from '../components/DemoBlock.vue'

const rows = ref<OrderFormData[]>([])
const lastResult = ref('（还没有提交数据）')
const attempts = ref(0)

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** 新增：await 拿表单数据，随后继续后续逻辑 */
async function create() {
  const data = await orderFormDialog.open()
  if (!data) {
    lastResult.value = '已取消 → 返回 null，后面的逻辑不执行'
    return
  }

  rows.value.unshift(data)
  lastResult.value = JSON.stringify(data, null, 2)
  ElMessage.success(`订单 ${data.id} 已创建`)
}

/** 确定前钩子：本次 open 传入 beforeOk（覆盖定义里的），返回 false 保持弹窗打开 */
async function createWithBeforeOk() {
  attempts.value = 0
  const data = await orderFormDialog.open({
    // beforeOk 作为本次 open 的参数传给弹窗组件，组件在确定时先跑它
    beforeOk: async () => {
      await sleep(700)
      if (attempts.value === 0) {
        attempts.value += 1
        ElMessage.warning('模拟：服务端校验未通过，弹窗保持打开（填完表单再点确定）')
        return false
      }
      return true
    },
  })
  if (!data) return
  rows.value.unshift(data)
  lastResult.value = JSON.stringify(data, null, 2)
}

/** 回调风格：不 await，结果走 onOk / onCancel */
function createWithCallback() {
  orderFormDialog.open(
    {},
    {
      onOk: (data) => {
        rows.value.unshift(data as OrderFormData)
        lastResult.value = `onOk 收到数据：${JSON.stringify(data)}`
        ElMessage.success('onOk 收到表单数据')
      },
      onCancel: () => {
        lastResult.value = 'onCancel 被调用（已取消）'
      },
    },
  )
}

/** 编辑：把整行数据作为 params 传入，标题自动变成「编辑订单 xxx」 */
async function edit(row: OrderFormData) {
  // 编辑：整行作为初始值，title 一起传（组件里 params.title 优先于配置的标题）
  const data = await orderFormDialog.open({ ...row, title: `编辑订单 ${row.id}` })
  if (!data) return
  Object.assign(row, data)
  lastResult.value = JSON.stringify(data, null, 2)
  ElMessage.success('已保存（演示）')
}

const code = `// ① 平行配置：src/views/dev/dialogs/order-form.dialog.ts
const fields: FormFieldConfig[] = [
  { prop: 'id', label: '订单号', control: 'input', required: true },
  { prop: 'venue', label: '表演场地', control: 'select', options: VENUE_OPTIONS },
  // …
]
// createFormDialog = wrapDialog(内置 FormDialog, { props: { fields, … } })
export const orderFormDialog = createFormDialog<OrderFormData>({
  name: 'order-form',
  title: '新增订单',
  width: 640,
  fields,
  model: { drones: 120 },     // 默认值
})

// ② 新增：不传参数就是空白表单
const data = await orderFormDialog.open()
if (!data) return              // 取消 → null
await createOrder(data)

// ③ 编辑：整行数据作为参数 → 同时成为初始值（标题一起传）
const data = await orderFormDialog.open({ ...row, title: '编辑订单 ' + row.id })

// ④ 确定前钩子：作为本次 open 的参数传给组件（按钮自动 loading，返回 false 不关闭）
await orderFormDialog.open({ beforeOk: async () => (await check()) ? true : false })
`


</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="表单弹窗"
      desc="字段配置与 ProForm 完全一致；确定时自动校验，取消返回 null"
      :code="code"
    >
      <div class="demo-actions">
        <el-button type="primary" @click="create">新增订单</el-button>
        <el-button @click="createWithBeforeOk">新增（带确定前钩子）</el-button>
        <el-button @click="createWithCallback">新增（回调风格）</el-button>
      </div>

      <div v-if="rows.length" class="demo-table">
        <el-table :data="rows" border size="small">
          <el-table-column prop="id" label="订单号" width="160" />
          <el-table-column prop="nickname" label="客户" width="100" />
          <el-table-column prop="venue" label="场地" min-width="110" />
          <el-table-column prop="performDate" label="表演日期" width="110" />
          <el-table-column prop="drones" label="无人机" width="90" align="right" />
          <el-table-column label="操作" width="80" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="edit(row as OrderFormData)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="demo-result">
        <div class="demo-result-title">弹窗返回的数据</div>
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

.demo-table {
  margin-top: 16px;
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
