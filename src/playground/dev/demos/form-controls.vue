<script setup lang="ts">
// 表单 · 控件总览：control 名 → Element 控件的完整映射
import { reactive } from 'vue'
import { ProForm, type FormFieldConfig, type OptionItem } from '@/components/pro'
import { VENUE_OPTIONS } from '../mock'
import DemoBlock from '../components/DemoBlock.vue'

const model = reactive({
  input: '',
  textarea: '',
  password: '',
  number: 120,
  switch: true,
  slider: 60,
  rate: 4,
  color: '#409eff',
  select: '',
  multi: [] as string[],
  grouped: '',
  radio: 'a',
  checkbox: [] as string[],
  date: '',
  datetime: '',
  range: [] as string[],
  month: '',
  year: '',
  time: '',
  city: [] as string[],
  tree: '',
  auto: '',
  asyncSelect: '',
  custom: '',
})

/** 文本 / 数字 / 布尔类控件 */
const textFields: FormFieldConfig[] = [
  { prop: 'input', label: 'input', control: 'input' },
  { prop: 'textarea', label: 'textarea', control: 'textarea' },
  { prop: 'password', label: 'password', control: 'password' },
  { prop: 'number', label: 'input-number', control: 'input-number', props: { min: 0, max: 1000 } },
  { prop: 'switch', label: 'switch', control: 'switch' },
  { prop: 'slider', label: 'slider', control: 'slider' },
  { prop: 'rate', label: 'rate', control: 'rate' },
  { prop: 'color', label: 'color', control: 'color' },
]

/** 选择类控件 */
const selectFields: FormFieldConfig[] = [
  { prop: 'select', label: 'select', control: 'select', options: VENUE_OPTIONS },
  {
    prop: 'multi',
    label: 'select 多选',
    control: 'select',
    options: VENUE_OPTIONS,
    props: { multiple: true, filterable: true },
  },
  { prop: 'grouped', label: 'select 分组', control: 'select', options: VENUE_OPTIONS },
  {
    prop: 'radio',
    label: 'radio',
    control: 'radio',
    options: [
      { label: 'A 方案', value: 'a' },
      { label: 'B 方案', value: 'b' },
      { label: 'C 方案', value: 'c', disabled: true },
    ],
  },
  {
    prop: 'checkbox',
    label: 'checkbox',
    control: 'checkbox',
    span: 16,
    options: [
      { label: '航拍', value: 'aerial' },
      { label: '编队', value: 'formation' },
      { label: '灯光', value: 'light' },
    ],
  },
]

/** 日期时间类控件 */
const dateFields: FormFieldConfig[] = [
  { prop: 'date', label: 'date', control: 'date' },
  { prop: 'datetime', label: 'datetime', control: 'datetime', width: 230 },
  { prop: 'range', label: 'daterange', control: 'daterange', span: 16, width: 320 },
  { prop: 'month', label: 'month', control: 'month' },
  { prop: 'year', label: 'year', control: 'year' },
  { prop: 'time', label: 'time', control: 'time', width: 180 },
]

/** 高级控件：级联 / 树选 / 自动补全 / 异步选项 / 自定义插槽 */
const CITY_TREE: OptionItem[] = [
  {
    label: '湖北省',
    value: 'hubei',
    children: [
      { label: '武汉市', value: 'wuhan' },
      { label: '宜昌市', value: 'yichang' },
    ],
  },
  {
    label: '广东省',
    value: 'guangdong',
    children: [
      { label: '深圳市', value: 'shenzhen' },
      { label: '广州市', value: 'guangzhou' },
    ],
  },
]

const advancedFields: FormFieldConfig[] = [
  { prop: 'city', label: 'cascader', control: 'cascader', options: CITY_TREE },
  { prop: 'tree', label: 'tree-select', control: 'tree-select', options: CITY_TREE },
  {
    prop: 'auto',
    label: 'autocomplete',
    control: 'autocomplete',
    placeholder: '输入后选择建议项',
    props: {
      fetchSuggestions: (query: string, cb: (items: { value: string }[]) => void) => {
        const list = VENUE_OPTIONS.filter((item) => item.label.includes(query)).map((item) => ({
          value: item.label,
        }))
        cb(list)
      },
    },
  },
  {
    prop: 'asyncSelect',
    label: '异步选项',
    control: 'select',
    tip: 'options 传函数（返回 Promise）时，组件自动加载并显示 loading',
    options: () =>
      new Promise<OptionItem[]>((resolve) => {
        setTimeout(() => resolve(VENUE_OPTIONS), 800)
      }),
  },
  {
    prop: 'custom',
    label: '自定义插槽',
    control: 'custom',
    slot: 'custom',
    span: 16,
    tip: 'control=custom + slot 名，由业务侧完全接管渲染',
  },
]

const code = `// control 名即 Element 控件；options 支持数组 / 函数 / 异步函数
const fields: FormFieldConfig[] = [
  { prop: 'input',  label: 'input',        control: 'input' },
  { prop: 'number', label: 'input-number', control: 'input-number', props: { min: 0, max: 1000 } },
  { prop: 'select', label: 'select',       control: 'select', options: VENUE_OPTIONS },
  { prop: 'multi',  label: 'select 多选',   control: 'select', options: VENUE_OPTIONS,
    props: { multiple: true, filterable: true } },
  { prop: 'date',   label: 'date',         control: 'date' },
  { prop: 'range',  label: 'daterange',    control: 'daterange', width: 320 },
  { prop: 'city',   label: 'cascader',     control: 'cascader', options: CITY_TREE },
  { prop: 'asyncSelect', label: '异步选项', control: 'select',
    options: () => fetchDictionary('venue') },
  // 自定义控件：声明 slot 名，用同名具名插槽渲染
  { prop: 'custom', label: '自定义插槽', control: 'custom', slot: 'custom' },
]

<ProForm :model="model" :fields="fields">
  <template #custom="{ value, setValue }">
    <el-input :model-value="String(value ?? '')" @update:model-value="setValue" />
  </template>
</ProForm>`
</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="文本 / 数字 / 布尔"
      desc="input、textarea、password、input-number、switch、slider、rate、color"
    >
      <ProForm :model="model" :fields="textFields" label-width="110px" />
    </DemoBlock>

    <DemoBlock title="选择类" desc="select（含多选、分组、可搜索）、radio、checkbox">
      <ProForm :model="model" :fields="selectFields" label-width="110px" />
    </DemoBlock>

    <DemoBlock
      title="日期时间"
      desc="date、datetime、daterange、month、year、time，默认值格式 YYYY-MM-DD 等"
    >
      <ProForm :model="model" :fields="dateFields" label-width="110px" />
    </DemoBlock>

    <DemoBlock title="高级控件" desc="级联、树选择、自动补全、异步选项、自定义插槽" :code="code">
      <ProForm :model="model" :fields="advancedFields" label-width="110px">
        <template #custom="{ value, setValue }">
          <div class="demo-custom-field">
            <el-input
              :model-value="String(value ?? '')"
              placeholder="自定义插槽：输入 + 生成按钮"
              @update:model-value="setValue"
            />
            <el-button type="primary" plain @click="setValue(`编号-${Date.now()}`)">
              生成编号
            </el-button>
          </div>
        </template>
      </ProForm>
    </DemoBlock>
  </div>
</template>

<style scoped>
.demo-custom-field {
  display: flex;
  gap: 8px;
  width: 100%;
}
</style>
