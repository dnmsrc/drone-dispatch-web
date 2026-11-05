<script setup lang="ts">
// 弹窗 · 表单：openFormDialog 复用 ProForm，确定时校验通过才关闭并返回数据
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { confirmDialog, openFormDialog } from '@/components/pro'
import type { FormFieldConfig } from '@/components/pro'
import { VENUE_OPTIONS } from '../mock'
import DemoBlock from '../components/DemoBlock.vue'

/** 演示用：表单返回的数据结构 */
interface OrderForm {
  id: string
  nickname: string
  phone: string
  venue: string
  performDate: string
  drones: number
  amount: number
  remark: string
}

const fields: FormFieldConfig[] = [
  {
    prop: 'id',
    label: '订单号',
    control: 'input',
    required: true,
    props: { placeholder: '如 DD202511080001' },
  },
  { prop: 'nickname', label: '客户昵称', control: 'input', required: true },
  {
    prop: 'phone',
    label: '手机号',
    control: 'input',
    required: true,
    rules: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
  },
  { prop: 'venue', label: '表演场地', control: 'select', options: VENUE_OPTIONS, required: true },
  { prop: 'performDate', label: '表演日期', control: 'date', required: true },
  {
    prop: 'drones',
    label: '无人机数量',
    control: 'input-number',
    props: { min: 1, max: 1000, step: 10 },
  },
  { prop: 'amount', label: '订单金额', control: 'input-number', props: { min: 0, step: 100 } },
  { prop: 'remark', label: '备注', control: 'textarea', span: 24 },
]

const rows = ref<OrderForm[]>([])
const lastResult = ref('（还没有提交数据）')
const attempts = ref(0)

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** 新增：拿到表单数据后继续（入列表 + 问是否继续添加） */
async function create() {
  const data = await openFormDialog<OrderForm>({
    title: '新增订单',
    description: '确定时先校验；校验通过才关闭，并把表单数据交回',
    fields,
    model: { drones: 120, amount: 16800 },
  })

  if (!data) {
    lastResult.value = '已取消 → 返回 null，后面的逻辑不执行'
    return
  }

  rows.value.unshift(data)
  lastResult.value = JSON.stringify(data, null, 2)
  ElMessage.success(`订单 ${data.id} 已创建`)

  // 链式：创建完紧接着确认是否继续 —— 弹窗逻辑都在这一段里
  const again = await confirmDialog({
    title: '继续添加？',
    content: `订单 ${data.id} 已创建，是否继续添加下一个？`,
    type: 'info',
    okText: '继续',
  })
  if (again) void create()
}

/** 编辑：把行数据作为初始值传入，保存后写回表格 */
async function edit(row: Record<string, unknown>) {
  const data = await openFormDialog<OrderForm>({
    title: `编辑订单 ${row.id}`,
    fields,
    model: { ...row },
  })
  if (!data) return
  Object.assign(row, data)
  lastResult.value = JSON.stringify(data, null, 2)
  ElMessage.success('已保存（演示）')
}

/** 确定前钩子：beforeOk 返回 Promise 时按钮自动 loading，返回 false 保持弹窗打开 */
async function createWithBeforeOk() {
  attempts.value = 0
  const data = await openFormDialog<OrderForm>({
    title: '新增订单（确定前钩子）',
    description: '第一次点确定会失败（模拟服务器校验），弹窗保持打开；再点一次成功',
    fields,
    beforeOk: async () => {
      await sleep(700)
      if (attempts.value === 0) {
        attempts.value += 1
        ElMessage.warning('模拟：订单号已被占用，请再点一次确定')
        return false
      }
      return true
    },
  })
  if (!data) return
  rows.value.unshift(data)
  lastResult.value = JSON.stringify(data, null, 2)
}

const code = `const data = await openFormDialog<OrderForm>({
  title: '新增订单',
  fields: [
    { prop: 'id', label: '订单号', control: 'input', required: true },
    { prop: 'venue', label: '表演场地', control: 'select', options: VENUE_OPTIONS },
    { prop: 'performDate', label: '表演日期', control: 'date' },
    // …
  ],
  model: { drones: 120 },       // 初始值
  beforeOk: async () => {       // 可选：确定前钩子（自动 loading）
    await validateOnServer()
    return true                 // false → 保持弹窗打开
  },
})

if (!data) return                // 取消 → null
await createOrder(data)          // 继续后续逻辑
// 还能接着弹第二个窗，逻辑保持在同一段：`
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
              <el-button link type="primary" @click="edit(row)">编辑</el-button>
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
