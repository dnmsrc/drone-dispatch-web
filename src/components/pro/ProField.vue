<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 控件渲染器：把一行字段配置（FormFieldConfig）渲染成对应的 Element 控件
//
// 职责边界：
//   - 只负责"控件本身"：控件类型映射、选项加载、占位符、值格式、属性透传
//   - 不负责布局（栅格、标签、校验）——那是 ProForm 的事
//   - 不负责按钮 ——那是 ProSearch / 业务页面的事
//
// 模板里不用 TS 断言（Vue 模板只支持 JS 表达式），因此这里把各种
// 控件需要的值类型预先收窄成 computed，模板只引用变量。
// ─────────────────────────────────────────────────────────────
import { computed, ref, watch } from 'vue'
import type { FormFieldConfig, OptionItem } from './types'

const props = defineProps<{
  field: FormFieldConfig
  modelValue: unknown
}>()

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
}>()

/** 控件名：未声明时按输入框渲染 */
const control = computed(() => props.field.control ?? 'input')

/** 多值控件：值必须是数组，空值时给 []，避免 Element 对 null 报错 */
const MULTI_CONTROLS = new Set(['checkbox', 'daterange', 'datetimerange'])
const isMulti = computed(() => {
  if (MULTI_CONTROLS.has(control.value)) return true
  if (['select', 'cascader', 'tree-select'].includes(control.value)) {
    return props.field.props?.multiple === true
  }
  return false
})

/** 原始绑定值（多值控件兜底为数组） */
const value = computed<unknown>(() => {
  if (!isMulti.value) return props.modelValue
  return Array.isArray(props.modelValue) ? props.modelValue : []
})

/* 模板用的值类型收窄 —— 各控件对 modelValue 的类型要求不同 */
const textValue = computed(() => value.value as string | undefined)
const numberValue = computed(() => value.value as number | undefined)
const booleanValue = computed(() => value.value as boolean | undefined)
/** 选择框组要的是原始值数组（string | number），单独收窄一次 */
const primitiveArrayValue = computed(() => (value.value as (string | number)[]) ?? [])
const anyValue = computed(() => value.value as unknown as never)

function onUpdate(val: unknown) {
  emit('update:modelValue', val)
}

/** 是否禁用（配置里通常已由 ProForm 归一化为布尔，这里兼容函数写法） */
const disabled = computed(() =>
  typeof props.field.disabled === 'function' ? false : props.field.disabled === true,
)

/** 是否可清空：输入 / 选择类默认开，开关类控件没有该能力 */
const clearable = computed(() => {
  if (typeof props.field.clearable === 'boolean') return props.field.clearable
  return !['switch', 'radio', 'checkbox', 'slider', 'rate', 'color', 'custom'].includes(
    control.value,
  )
})

/** 选项（同步数组 / 同步函数 / 异步函数） */
const options = ref<OptionItem[]>([])
const loadingOptions = ref(false)

async function loadOptions() {
  const source = props.field.options
  if (!source) {
    options.value = []
    return
  }
  if (Array.isArray(source)) {
    options.value = source
    return
  }
  loadingOptions.value = true
  try {
    options.value = (await source()) ?? []
  } finally {
    loadingOptions.value = false
  }
}

/** 选项来源变化时重新请求；field 对象每次渲染会重建，但 options 引用稳定，故不会重复请求 */
watch(
  () => props.field.options,
  () => void loadOptions(),
  { immediate: true },
)

/** 分组选项：有 group 的按组渲染 el-option-group，否则平铺 */
const groupedOptions = computed(() => {
  const groups = new Map<string, OptionItem[]>()
  let hasGroup = false
  for (const item of options.value) {
    if (item.group) hasGroup = true
    const key = item.group ?? ''
    const list = groups.get(key)
    if (list) list.push(item)
    else groups.set(key, [item])
  }
  if (!hasGroup) return null
  return Array.from(groups, ([label, items]) => ({ label, options: items }))
})

/** 占位文字：未配置时按"请输入/请选择 + 标签"生成 */
const placeholder = computed(() => {
  if (props.field.placeholder) return props.field.placeholder
  const label = props.field.label ?? props.field.prop
  if (['input', 'textarea', 'password', 'input-number', 'autocomplete'].includes(control.value)) {
    return `请输入${label}`
  }
  return `请选择${label}`
})

/** 日期类控件的值格式 */
function dateValueFormat(): string {
  switch (control.value) {
    case 'datetime':
    case 'datetimerange':
      return 'YYYY-MM-DD HH:mm:ss'
    case 'month':
      return 'YYYY-MM'
    case 'year':
      return 'YYYY'
    case 'time':
      return 'HH:mm:ss'
    default:
      return 'YYYY-MM-DD'
  }
}

const valueFormat = computed(() => props.field.valueFormat ?? dateValueFormat())

/** 日期选择器类型（模板里需要具体的字面量类型） */
const dateType = computed(
  () => control.value as 'date' | 'datetime' | 'daterange' | 'datetimerange' | 'month' | 'year',
)

/** 日期范围控件的开始 / 结束占位 */
const rangePlaceholder = computed(() => {
  const isTime = control.value === 'datetimerange'
  return {
    start: isTime ? '开始时间' : '开始日期',
    end: isTime ? '结束时间' : '结束日期',
  }
})

/** 控件宽度：配置了 width 时外层固定宽度，否则撑满栅格列 */
const style = computed(() => {
  const width = props.field.width
  if (!width) return undefined
  return { width: typeof width === 'number' ? `${width}px` : width }
})

/** 透传属性：允许覆盖组件的默认属性（如 filterable / multiple / rows / maxlength） */
const extraProps = computed(() => props.field.props ?? {})

/** 下拉：默认单选 + 多选时折叠标签，可被 field.props 覆盖 */
const selectBind = computed(() => ({
  multiple: isMulti.value,
  collapseTags: isMulti.value,
  ...extraProps.value,
}))

/** 文本域：默认 3 行，可覆盖 */
const textareaBind = computed(() => ({ rows: 3, ...extraProps.value }))

/** 树选择：默认父子不严格关联，可覆盖 */
const treeSelectBind = computed(() => ({ checkStrictly: true, ...extraProps.value }))

/** 级联 / 树选择的选项结构由用户数据决定，这里放宽类型交给 Element */
const cascaderOptions = computed(() => options.value as unknown as never[])
const treeData = computed(() => options.value as unknown as never[])
</script>

<template>
  <div class="pro-field" :style="style">
    <!-- 文本 -->
    <el-input
      v-if="control === 'input'"
      v-bind="extraProps"
      :model-value="textValue"
      :placeholder="placeholder"
      :clearable="clearable"
      :disabled="disabled"
      class="pro-field-control"
      @update:model-value="onUpdate"
    />

    <el-input
      v-else-if="control === 'textarea'"
      v-bind="textareaBind"
      type="textarea"
      :model-value="textValue"
      :placeholder="placeholder"
      :clearable="clearable"
      :disabled="disabled"
      class="pro-field-control"
      @update:model-value="onUpdate"
    />

    <el-input
      v-else-if="control === 'password'"
      v-bind="extraProps"
      type="password"
      show-password
      :model-value="textValue"
      :placeholder="placeholder"
      :clearable="clearable"
      :disabled="disabled"
      class="pro-field-control"
      @update:model-value="onUpdate"
    />

    <!-- 数字 / 开关 -->
    <el-input-number
      v-else-if="control === 'input-number'"
      v-bind="extraProps"
      :model-value="numberValue"
      :placeholder="placeholder"
      :disabled="disabled"
      class="pro-field-control"
      @update:model-value="onUpdate"
    />

    <el-switch
      v-else-if="control === 'switch'"
      v-bind="extraProps"
      :model-value="booleanValue"
      :disabled="disabled"
      @update:model-value="onUpdate"
    />

    <!-- 选择类 -->
    <el-select
      v-else-if="control === 'select'"
      v-bind="selectBind"
      :model-value="anyValue"
      :placeholder="placeholder"
      :clearable="clearable"
      :disabled="disabled"
      :loading="loadingOptions"
      class="pro-field-control"
      @update:model-value="onUpdate"
    >
      <template v-if="groupedOptions">
        <el-option-group
          v-for="group in groupedOptions"
          :key="group.label"
          :label="group.label || '未分组'"
        >
          <el-option
            v-for="item in group.options"
            :key="String(item.value)"
            :label="item.label"
            :value="item.value"
            :disabled="item.disabled"
          />
        </el-option-group>
      </template>
      <template v-else>
        <el-option
          v-for="item in options"
          :key="String(item.value)"
          :label="item.label"
          :value="item.value"
          :disabled="item.disabled"
        />
      </template>
    </el-select>

    <el-radio-group
      v-else-if="control === 'radio'"
      v-bind="extraProps"
      :model-value="anyValue"
      :disabled="disabled"
      class="pro-field-control"
      @update:model-value="onUpdate"
    >
      <el-radio v-for="item in options" :key="String(item.value)" :value="item.value">
        {{ item.label }}
      </el-radio>
    </el-radio-group>

    <el-checkbox-group
      v-else-if="control === 'checkbox'"
      v-bind="extraProps"
      :model-value="primitiveArrayValue"
      :disabled="disabled"
      class="pro-field-control"
      @update:model-value="onUpdate"
    >
      <el-checkbox v-for="item in options" :key="String(item.value)" :value="item.value">
        {{ item.label }}
      </el-checkbox>
    </el-checkbox-group>

    <el-cascader
      v-else-if="control === 'cascader'"
      v-bind="extraProps"
      :options="cascaderOptions"
      :model-value="anyValue"
      :placeholder="placeholder"
      :clearable="clearable"
      :disabled="disabled"
      class="pro-field-control"
      @update:model-value="onUpdate"
    />

    <el-tree-select
      v-else-if="control === 'tree-select'"
      v-bind="treeSelectBind"
      :data="treeData"
      :model-value="anyValue"
      :placeholder="placeholder"
      :clearable="clearable"
      :disabled="disabled"
      class="pro-field-control"
      @update:model-value="onUpdate"
    />

    <!-- 日期时间 -->
    <el-time-picker
      v-else-if="control === 'time'"
      v-bind="extraProps"
      :model-value="anyValue"
      :value-format="valueFormat"
      :placeholder="placeholder"
      :clearable="clearable"
      :disabled="disabled"
      class="pro-field-control"
      @update:model-value="onUpdate"
    />

    <el-date-picker
      v-else-if="['date', 'datetime', 'daterange', 'datetimerange', 'month', 'year'].includes(control)"
      v-bind="extraProps"
      :type="dateType"
      :model-value="anyValue"
      :value-format="valueFormat"
      :placeholder="placeholder"
      :start-placeholder="rangePlaceholder.start"
      :end-placeholder="rangePlaceholder.end"
      :clearable="clearable"
      :disabled="disabled"
      class="pro-field-control"
      @update:model-value="onUpdate"
    />

    <!-- 其它 -->
    <el-slider
      v-else-if="control === 'slider'"
      v-bind="extraProps"
      :model-value="numberValue"
      :disabled="disabled"
      class="pro-field-control"
      @update:model-value="onUpdate"
    />

    <el-rate
      v-else-if="control === 'rate'"
      v-bind="extraProps"
      :model-value="numberValue"
      :disabled="disabled"
      @update:model-value="onUpdate"
    />

    <el-color-picker
      v-else-if="control === 'color'"
      v-bind="extraProps"
      :model-value="textValue"
      :disabled="disabled"
      @update:model-value="onUpdate"
    />

    <el-autocomplete
      v-else-if="control === 'autocomplete'"
      v-bind="extraProps"
      :model-value="textValue"
      :placeholder="placeholder"
      :clearable="clearable"
      :disabled="disabled"
      class="pro-field-control"
      @update:model-value="onUpdate"
    />

    <!-- 自定义控件：由外层 ProForm 的具名插槽接管；无插槽时给提示，便于排查配置写错 -->
    <div v-else class="pro-field-custom">
      <slot>
        <span class="pro-field-custom-tip">
          未识别的控件「{{ control }}」，请通过 slot 自定义渲染
        </span>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.pro-field {
  width: 100%;
}

.pro-field-control {
  width: 100%;
}

.pro-field-custom-tip {
  font-size: var(--app-font-size-xs);
  color: var(--app-text-placeholder);
}
</style>
