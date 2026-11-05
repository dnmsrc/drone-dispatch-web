<script setup lang="ts">
// 弹窗内容组件示例：选中订单后通过 useDialogContext().close(row) 回传结果
// 这个组件不需要知道自己是"弹窗"，只管把选中项交出去。
// 也支持外部通过 params 传 keyword（包裹器会把 params 作为 props 传进来），用作初始搜索词。
import { computed, ref } from 'vue'
import { useDialogContext } from '@/components/pro'
import { ORDER_STATUS_MAP, mockOrders } from '../mock'
import type { MockOrder } from '../mock'

const props = defineProps<{ keyword?: string }>()

const dialog = useDialogContext<MockOrder>()
const keyword = ref(props.keyword ?? '')

const rows = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return mockOrders
  return mockOrders.filter(
    (item) =>
      item.id.toLowerCase().includes(text) ||
      item.nickname.toLowerCase().includes(text) ||
      item.venue.toLowerCase().includes(text),
  )
})

function pick(row: unknown) {
  dialog?.close(row as MockOrder)
}
</script>

<template>
  <div class="order-picker">
    <el-input
      v-model="keyword"
      class="order-picker-search"
      placeholder="搜索订单号 / 客户昵称 / 场地"
      clearable
    />

    <el-table :data="rows" height="320" border @row-dblclick="pick">
      <el-table-column prop="id" label="订单号" width="160" />
      <el-table-column prop="nickname" label="客户" width="90" />
      <el-table-column prop="venue" label="场地" min-width="110" />
      <el-table-column prop="performDate" label="表演日期" width="110" />
      <el-table-column label="金额" width="110" align="right">
        <template #default="{ row }">¥{{ row.amount.toLocaleString('zh-CN') }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="ORDER_STATUS_MAP[row.status]?.type" size="small">
            {{ ORDER_STATUS_MAP[row.status]?.text }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="76" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="pick(row)">选择</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="order-picker-tip">双击任意一行或点「选择」→ 关闭弹窗并把这一行交回调用方</div>
  </div>
</template>

<style scoped>
.order-picker-search {
  margin-bottom: 12px;
}

.order-picker-tip {
  margin-top: 10px;
  font-size: 12px;
  color: var(--app-text-secondary);
}
</style>
