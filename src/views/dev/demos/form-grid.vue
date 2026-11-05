<script setup lang="ts">
// 表单 · 栅格布局：span / offset / labelPosition / labelWidth / gutter
import { reactive } from 'vue'
import { ProForm, type FormFieldConfig } from '@/components/pro'
import { ORDER_STATUS_OPTIONS, VENUE_OPTIONS } from '../mock'
import DemoBlock from '../components/DemoBlock.vue'

const gridModel = reactive({
  full: '',
  half: '',
  third: '',
  quarter: '',
  offsetField: '',
})

/** span 是 24 栅格制：24 整行、12 半行、8 三分之一、6 四分之一 */
const gridFields: FormFieldConfig[] = [
  { prop: 'full', label: '整行', control: 'input', span: 24, tip: 'span = 24' },
  { prop: 'half', label: '半行', control: 'input', span: 12, tip: 'span = 12' },
  {
    prop: 'third',
    label: '三分之一',
    control: 'input',
    span: 8,
    offset: 4,
    tip: 'span = 8，offset = 4（左侧空出 1/6）',
  },
  { prop: 'quarter', label: '四分之一', control: 'input', span: 6, tip: 'span = 6' },
]

const layoutModel = reactive({
  venue: '',
  status: '',
  date: '',
})

const layoutFields: FormFieldConfig[] = [
  { prop: 'venue', label: '场地', control: 'select', options: VENUE_OPTIONS },
  { prop: 'status', label: '状态', control: 'select', options: ORDER_STATUS_OPTIONS },
  { prop: 'date', label: '表演日期', control: 'date', width: 220 },
]

const code = `// span 1~24；不写取 defaultSpan（默认 8）
const fields: FormFieldConfig[] = [
  { prop: 'full',    label: '整行',       control: 'input', span: 24 },
  { prop: 'half',    label: '半行',       control: 'input', span: 12 },
  { prop: 'third',   label: '三分之一',   control: 'input', span: 8, offset: 4 },
  { prop: 'quarter', label: '四分之一',   control: 'input', span: 6 },
]

// 标签位置 / 宽度 / 栅格间距
<ProForm :model="model" :fields="fields"
  label-position="top" label-width="120px" :gutter="24" />`
</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="栅格宽度"
      desc="span 按 24 栅格分配列宽，offset 控制左侧偏移"
      :code="code"
    >
      <ProForm :model="gridModel" :fields="gridFields" />
    </DemoBlock>

    <DemoBlock
      title="标签与间距"
      desc="label-position=top 顶部标签；label-width=120px；gutter=24 加大列间距"
    >
      <ProForm
        :model="layoutModel"
        :fields="layoutFields"
        label-position="top"
        label-width="120px"
        :gutter="24"
      />
    </DemoBlock>

    <DemoBlock title="四列布局" desc="default-span=6，适合字段较少的查询/编辑表单">
      <ProForm :model="layoutModel" :fields="layoutFields" :default-span="6" />
    </DemoBlock>
  </div>
</template>
