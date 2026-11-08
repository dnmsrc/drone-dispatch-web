<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 配置式表单：外部传字段配置 + 数据模型，组件内部完成栅格布局、标签、校验、控件渲染
//
// 用法要点：
//   - model 必须是响应式对象（reactive），组件直接读写其字段，外部改动即时生效
//   - fields 里只写"控件名 + 标签 + 选项"，不写任何 Element 组件标签
//   - 字段级自定义：给 field.slot 一个名字，再用同名具名插槽覆盖渲染
//   - 布局模式：inline（搜索栏风格，字段与按钮同一行）/ 栅格（默认，按 span 分列）
// ─────────────────────────────────────────────────────────────
import { computed, ref } from 'vue'
import type { FormInstance, FormItemRule } from 'element-plus'
import type { FormFieldConfig, ProFormExpose } from './types'
import { defaultValueOf } from './helpers'
import ProField from './ProField.vue'

const props = withDefaults(
  defineProps<{
    /** 表单数据模型（响应式对象，组件直接读写其字段） */
    model: Record<string, any>
    /** 字段配置 */
    fields: FormFieldConfig[]
    /** 标签宽度 */
    labelWidth?: string | number
    /** 标签位置 */
    labelPosition?: 'left' | 'right' | 'top'
    /** 默认栅格宽度（24 栅格制，8 = 三列）；inline 模式忽略 */
    defaultSpan?: number
    /** 栅格间距；inline 模式忽略 */
    gutter?: number
    /** 表单尺寸 */
    size?: 'large' | 'default' | 'small'
    /** 整体禁用 */
    disabled?: boolean
    /** 行内布局（搜索栏用），字段与 #tail 插槽内容排在同一行 */
    inline?: boolean
    /** 校验失败时滚动到第一个错误字段 */
    scrollToError?: boolean
  }>(),
  {
    labelWidth: '88px',
    labelPosition: 'right',
    defaultSpan: 8,
    gutter: 16,
    size: 'default',
    disabled: false,
    inline: false,
    scrollToError: true,
  },
)

const emit = defineEmits<{
  /** 任一字段值变化（便于外部做联动 / 埋点） */
  change: [payload: { prop: string; value: unknown }]
}>()

const formRef = ref<FormInstance>()

/** 把 hidden / disabled 的函数写法解析成布尔（依赖 model，实现联动显隐与联动禁用） */
const resolvedFields = computed<FormFieldConfig[]>(() =>
  props.fields.map((field) => ({
    ...field,
    hidden: typeof field.hidden === 'function' ? !!field.hidden(props.model) : field.hidden,
    disabled: typeof field.disabled === 'function' ? !!field.disabled(props.model) : field.disabled,
  })),
)

const visibleFields = computed(() => resolvedFields.value.filter((field) => !field.hidden))

/** 选择类控件用 change 触发校验，输入类用 blur */
const CHANGE_TRIGGER_CONTROLS = [
  'select',
  'radio',
  'checkbox',
  'switch',
  'cascader',
  'tree-select',
  'date',
  'datetime',
  'daterange',
  'datetimerange',
  'month',
  'year',
  'time',
  'slider',
  'rate',
  'color',
]

/** 字段的校验规则：field.rules + required 简写生成的规则 */
function rulesOf(field: FormFieldConfig): FormItemRule[] {
  const rules = [...(field.rules ?? [])]
  if (field.required && !rules.some((rule) => rule.required)) {
    const isChange = CHANGE_TRIGGER_CONTROLS.includes(field.control ?? 'input')
    rules.unshift({
      required: true,
      message: `${isChange ? '请选择' : '请输入'}${field.label ?? field.prop}`,
      trigger: isChange ? 'change' : 'blur',
    })
  }
  return rules
}

/** 字段值写入：直接改 model（外部传入的响应式对象），并抛 change 便于联动 */
function setField(prop: string, value: unknown) {
  props.model[prop] = value
  emit('change', { prop, value })
}

/** 模板里的事件入口（避免在模板内写带参数的箭头函数导致隐式 any） */
function onFieldUpdate(prop: string, value: unknown) {
  setField(prop, value)
}

/** 给插槽用的"写值函数"：插槽内调 setValue(val) 即可更新对应字段 */
function setValueOf(prop: string) {
  return (value: unknown) => setField(prop, value)
}

/** 重置到配置的默认值（不是回滚到首次渲染的值） */
function resetFields() {
  for (const field of props.fields) {
    if (field.hidden === true) continue
    props.model[field.prop] = defaultValueOf(field)
  }
  clearValidate()
  emit('change', { prop: '', value: props.model })
}

function clearValidate() {
  formRef.value?.clearValidate()
}

/** 校验：通过返回 true，失败返回 false（不抛异常，便于 if 判断） */
async function validate(): Promise<boolean> {
  if (!formRef.value) return false
  try {
    await formRef.value.validate()
    return true
  } catch {
    return false
  }
}

/** 校验单个字段 */
async function validateField(prop: string): Promise<boolean> {
  if (!formRef.value) return false
  try {
    await formRef.value.validateField(prop)
    return true
  } catch {
    return false
  }
}

defineExpose<ProFormExpose>({
  validate,
  validateField,
  resetFields,
  clearValidate,
  getModel: () => props.model,
})
</script>

<template>
  <el-form
    ref="formRef"
    class="pro-form"
    :class="{ 'is-inline': inline }"
    :model="model"
    :inline="inline"
    :label-width="inline ? undefined : labelWidth"
    :label-position="labelPosition"
    :size="size"
    :disabled="disabled"
    :scroll-to-error="scrollToError"
    @submit.prevent
  >
    <!-- 行内布局：字段平铺，与 #tail（搜索按钮）在同一行 -->
    <template v-if="inline">
      <el-form-item
        v-for="field in visibleFields"
        :key="field.prop"
        class="pro-form-item"
        :prop="field.prop"
        :label="field.label ?? field.prop"
        :rules="rulesOf(field)"
      >
        <slot
          v-if="field.slot"
          :name="field.slot"
          :field="field"
          :model="model"
          :value="model[field.prop]"
          :set-value="setValueOf(field.prop)"
        />
        <ProField
          v-else
          :field="field"
          :model-value="model[field.prop]"
          @update:model-value="onFieldUpdate(field.prop, $event)"
        />
      </el-form-item>
      <slot name="tail" />
    </template>

    <!-- 栅格布局：按 span 分列（默认三列） -->
    <template v-else>
      <el-row :gutter="gutter">
        <el-col
          v-for="field in visibleFields"
          :key="field.prop"
          :span="field.span ?? defaultSpan"
          :offset="field.offset"
        >
          <el-form-item
            class="pro-form-item"
            :prop="field.prop"
            :label="field.label ?? field.prop"
            :rules="rulesOf(field)"
          >
            <slot
              v-if="field.slot"
              :name="field.slot"
              :field="field"
              :model="model"
              :value="model[field.prop]"
              :set-value="setValueOf(field.prop)"
            />
            <ProField
              v-else
              :field="field"
              :model-value="model[field.prop]"
              @update:model-value="onFieldUpdate(field.prop, $event)"
            />
            <div v-if="field.tip" class="pro-form-item-tip">{{ field.tip }}</div>
          </el-form-item>
        </el-col>

        <!-- 栅格布局下也允许在末尾追加自定义区域（如按钮行） -->
        <el-col v-if="$slots.tail" :span="24">
          <slot name="tail" />
        </el-col>
      </el-row>
    </template>
  </el-form>
</template>

<style scoped>
.pro-form-item-tip {
  width: 100%;
  margin-top: 2px;
  font-size: var(--app-font-size-xs);
  line-height: 1.6;
  color: var(--app-text-placeholder);
}
</style>
