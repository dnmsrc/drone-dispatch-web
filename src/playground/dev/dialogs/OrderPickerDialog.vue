<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 业务弹窗组件示例：弹窗里放表格，选中一行后关闭并回传
//
// 和普通列表组件一样：自己写 <el-dialog>，自己写搜索框和表格；
// 选中后调 confirm(row) —— 参数（初始搜索词）从 useDialog().params 拿。
// ─────────────────────────────────────────────────────────────
import { computed, ref } from 'vue'
import { useDialog } from '@/components/pro'
import { ORDER_STATUS_MAP, mockOrders } from '../mock'
import type { MockOrder } from '../mock'
import type { OrderPickerParams } from './order-picker.dialog'

defineOptions({ inheritAttrs: false })

// 入参用标准 defineProps 接收（三层默认：组件默认 < options.props < open 入参）
const props = withDefaults(defineProps<OrderPickerParams>(), {
  title: '选择订单',
  keyword: '',
})

const { visible, confirm, cancel } = useDialog<OrderPickerParams, MockOrder>()

const keyword = ref(props.keyword)

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

/** 选中一行：确认关闭并把这一行交回调用方（结果 action = DialogAction.Confirm） */
function pick(row: unknown) {
  confirm(row as MockOrder)
}
</script>

<template>
  <el-dialog v-model="visible" class="pro-dialog" :title="props.title" width="840px">
    <p v-if="props.description" class="pro-dialog-desc">{{ props.description }}</p>

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

    <template #footer>
      <el-button @click="cancel">取消</el-button>
    </template>
  </el-dialog>
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
