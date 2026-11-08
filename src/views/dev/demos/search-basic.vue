<script setup lang="ts">
// 搜索 · 基础：字段配置 + 查询/重置事件 + 折叠展开
import { reactive, ref } from 'vue'
import { ProSearch, type FormFieldConfig } from '@/components/pro'
import { ORDER_STATUS_OPTIONS, VENUE_OPTIONS } from '../mock'
import DemoBlock from '../components/DemoBlock.vue'

const query = reactive<Record<string, any>>({
  keyword: '',
  status: '',
  venue: '',
})

const fields: FormFieldConfig[] = [
  {
    prop: 'keyword',
    label: '关键词',
    control: 'input',
    placeholder: '订单号 / 用户昵称',
    width: 220,
  },
  { prop: 'status', label: '状态', control: 'select', options: ORDER_STATUS_OPTIONS, width: 160 },
  { prop: 'venue', label: '场地', control: 'select', options: VENUE_OPTIONS, width: 160 },
]

/** 字段较多时自动折叠（默认只显示前 3 个） */
const manyFields: FormFieldConfig[] = [
  ...fields,
  { prop: 'phone', label: '手机号', control: 'input', width: 180 },
  { prop: 'dateRange', label: '日期', control: 'daterange', width: 260 },
  {
    prop: 'timeSlot',
    label: '时段',
    control: 'select',
    width: 160,
    options: [
      { label: '18:00', value: '18:00' },
      { label: '19:00', value: '19:00' },
      { label: '20:00', value: '20:00' },
    ],
  },
]

const logs = ref<string[]>([])

function pushLog(type: string, payload: unknown) {
  const time = new Date().toLocaleTimeString('zh-CN')
  logs.value.unshift(`[${time}] ${type}: ${JSON.stringify(payload)}`)
  if (logs.value.length > 6) logs.value.pop()
}

const code = `const fields: FormFieldConfig[] = [
  { prop: 'keyword', label: '关键词', control: 'input', width: 220 },
  { prop: 'status',  label: '状态',  control: 'select', options: ORDER_STATUS_OPTIONS },
  { prop: 'venue',   label: '场地',  control: 'select', options: VENUE_OPTIONS },
]

<ProSearch :model="query" :fields="fields"
  @search="onSearch" @reset="onReset" />

// 字段数 > defaultVisibleCount（默认 3）时自动折叠为「展开/收起」
// 查询回车即触发（searchOnEnter 默认 true）`
</script>

<template>
  <div class="demo-page">
    <DemoBlock title="基础搜索" desc="固定提供查询/重置；回车即查询；事件回传条件快照" :code="code">
      <ProSearch
        :model="query"
        :fields="fields"
        @search="(q) => pushLog('search', q)"
        @reset="(q) => pushLog('reset', q)"
      />

      <div class="demo-log">
        <div class="demo-log-title">事件日志（最近 6 条）</div>
        <pre v-if="logs.length" class="demo-block-code">{{ logs.join('\n') }}</pre>
        <div v-else class="demo-log-empty">点击「查询 / 重置」后在这里查看事件参数</div>
      </div>
    </DemoBlock>

    <DemoBlock title="折叠搜索" desc="6 个字段，默认只显示 3 个，点「展开」显示全部">
      <ProSearch :model="query" :fields="manyFields" />
    </DemoBlock>

    <DemoBlock title="自定义按钮" desc="通过 actions 插槽补充额外按钮（如导出、高级筛选）">
      <ProSearch
        :model="query"
        :fields="fields"
        :show-reset="false"
        search-text="搜索订单"
        reset-text="清空"
      >
        <template #actions>
          <el-button type="success" plain>导出结果</el-button>
        </template>
      </ProSearch>
    </DemoBlock>
  </div>
</template>

<style scoped>
.demo-log {
  margin-top: 16px;
}

.demo-log-title {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--app-text-secondary);
}

.demo-log-empty {
  padding: 12px;
  font-size: 12px;
  color: var(--app-text-placeholder);
  background: #f8f9fb;
  border: 1px dashed var(--app-border-color-light);
  border-radius: 4px;
}
</style>
