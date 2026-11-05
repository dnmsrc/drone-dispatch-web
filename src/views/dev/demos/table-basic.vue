<script setup lang="ts">
// 表格 · 基础：列配置、formatter、render 自定义单元格、斑马纹/边框/空数据/加载态
import { h, ref } from 'vue'
import { ElTag } from 'element-plus'
import { ProTable, type TableColumn } from '@/components/pro'
import { formatMoney, mockOrders, ORDER_STATUS_MAP } from '../mock'
import DemoBlock from '../components/DemoBlock.vue'

const loading = ref(false)

function statusText(value: unknown): string {
  return ORDER_STATUS_MAP[value as string]?.text ?? '未知'
}

function statusType(value: unknown): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  return ORDER_STATUS_MAP[value as string]?.type ?? 'info'
}

/** 列配置：文本列交给 formatter / render，不写 el-table-column */
const columns: TableColumn[] = [
  { prop: 'id', label: '订单号', minWidth: 160, sortable: true },
  { prop: 'nickname', label: '用户', minWidth: 100 },
  { prop: 'venue', label: '场地', minWidth: 110 },
  { prop: 'performDate', label: '表演日期', width: 120, sortable: true },
  {
    prop: 'amount',
    label: '金额',
    width: 140,
    align: 'right',
    formatter: (_row, value) => formatMoney(value as number),
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (ctx) => h(ElTag, { type: statusType(ctx.value) }, () => statusText(ctx.value)),
  },
  { prop: 'createdAt', label: '创建时间', width: 150 },
]

function toggleLoading() {
  loading.value = true
  setTimeout(() => (loading.value = false), 1200)
}

const code = `const columns: TableColumn[] = [
  { prop: 'id', label: '订单号', minWidth: 160, sortable: true },
  { prop: 'amount', label: '金额', width: 140, align: 'right',
    formatter: (_row, value) => formatMoney(value as number) },
  { prop: 'status', label: '状态', width: 100,
    render: (ctx) => h(ElTag, { type: statusType(ctx.value) }, () => statusText(ctx.value)) },
]

<ProTable :columns="columns" :data="rows" stripe />`
</script>

<template>
  <div class="demo-page">
    <DemoBlock title="基础表格" desc="实体列 + 金额格式化 + 状态标签渲染（render 返回 VNode）" :code="code">
      <ProTable :columns="columns" :data="mockOrders" stripe />

      <div class="demo-toolbar">
        <el-button size="small" @click="toggleLoading">模拟加载 {{ loading ? '（加载中…）' : '' }}</el-button>
        <span class="demo-toolbar-tip">stripe 斑马纹；sortable 点击表头排序（本地排序）</span>
      </div>
    </DemoBlock>

    <DemoBlock title="边框 / 加载态" desc="border=true 显示纵向边框；loading 时显示遮罩">
      <ProTable :columns="columns" :data="mockOrders" border :loading="loading" />
    </DemoBlock>

    <DemoBlock title="空数据" desc="数据为空时显示 empty-text，默认「暂无数据」">
      <ProTable :columns="columns" :data="[]" border empty-text="没有符合条件的订单" />
    </DemoBlock>
  </div>
</template>

<style scoped>
.demo-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.demo-toolbar-tip {
  font-size: 12px;
  color: var(--app-text-secondary);
}
</style>
