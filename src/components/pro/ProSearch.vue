<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 搜索栏组件：复用 ProForm（行内布局），固定提供「查询 / 重置」按钮
//
// 结构：一张卡片 = 一行搜索字段 + 右侧按钮组（字段过多时折叠为「展开/收起」）
//
// 用法：
//   <ProSearch v-model="query" :fields="searchFields" @search="load(1)" @reset="load(1)" />
//   - model 用 v-model 传入响应式对象时，组件直接改它，外部始终拿到最新条件
//   - 不传 model 时组件内部创建，查询结果通过 search 事件的参数拿到
// ─────────────────────────────────────────────────────────────
import { computed, reactive, ref, watch } from 'vue'
import { ArrowDown, ArrowUp, Refresh, Search } from '@element-plus/icons-vue'
import type { ProSearchProps } from './types'
import { defaultValueOf, snapshotModel } from './helpers'
import ProForm from './ProForm.vue'

const props = withDefaults(defineProps<ProSearchProps>(), {
  loading: false,
  showReset: true,
  collapsible: true,
  defaultVisibleCount: 3,
  searchText: '查询',
  resetText: '重置',
  searchOnEnter: true,
})

const emit = defineEmits<{
  /** 点击查询 / 回车：参数为当前条件快照 */
  search: [query: Record<string, any>]
  /** 点击重置：参数为重置后的条件快照（外部自行决定是否重新查询） */
  reset: [query: Record<string, any>]
}>()

/** 未传 model 时的内部模型 */
const innerModel = reactive<Record<string, any>>({})

/** 实际使用的查询模型：优先外部传入，其次内部 */
const model = computed<Record<string, any>>(() => {
  const external = props.model as Record<string, any> | undefined
  return external ?? innerModel
})

/** 首次渲染补齐默认值（只补 undefined 的字段，不覆盖外部已有值） */
watch(
  [() => props.model, () => props.fields],
  () => {
    const target = model.value
    for (const field of props.fields) {
      if (target[field.prop] === undefined) target[field.prop] = defaultValueOf(field)
    }
  },
  { immediate: true },
)

/** 折叠：字段数超过 defaultVisibleCount 时先只显示前 N 个 */
const needCollapse = computed(
  () => props.collapsible && props.fields.length > props.defaultVisibleCount,
)
const expanded = ref(false)
const visibleFields = computed(() => {
  if (!needCollapse.value || expanded.value) return props.fields
  return props.fields.slice(0, props.defaultVisibleCount)
})

const formRef = ref<InstanceType<typeof ProForm>>()

/** 查询：把条件做快照后抛给外部 */
function onSearch() {
  emit('search', snapshotModel(model.value))
}

/** 重置：恢复默认值 + 清校验 + 收起折叠，再通知外部 */
function onReset() {
  const target = model.value
  for (const field of props.fields) {
    target[field.prop] = defaultValueOf(field)
  }
  formRef.value?.clearValidate()
  expanded.value = false
  emit('reset', snapshotModel(target))
}

/** 回车查询：只认输入框，避免下拉 / 文本域的回车误触发 */
function onKeyup(event: KeyboardEvent) {
  if (!props.searchOnEnter) return
  const target = event.target as HTMLElement | null
  if (target?.tagName !== 'INPUT') return
  onSearch()
}

defineExpose({
  /** 主动触发查询（如外部按钮） */
  search: onSearch,
  reset: onReset,
  getQuery: () => snapshotModel(model.value),
})
</script>

<template>
  <div class="pro-search" @keyup.enter="onKeyup">
    <el-card shadow="never" class="pro-search-card">
      <ProForm
        ref="formRef"
        :model="model"
        :fields="visibleFields"
        inline
        size="default"
        :label-position="'left'"
      >
        <template #tail>
          <el-form-item class="pro-search-buttons">
            <el-button type="primary" :icon="Search" :loading="loading" @click="onSearch">
              {{ searchText }}
            </el-button>

            <el-button v-if="showReset" :icon="Refresh" @click="onReset">
              {{ resetText }}
            </el-button>

            <el-button
              v-if="needCollapse"
              link
              type="primary"
              class="pro-search-toggle"
              @click="expanded = !expanded"
            >
              {{ expanded ? '收起' : '展开' }}
              <el-icon class="pro-search-toggle-icon">
                <ArrowUp v-if="expanded" />
                <ArrowDown v-else />
              </el-icon>
            </el-button>

            <slot name="actions" />
          </el-form-item>
        </template>
      </ProForm>
    </el-card>
  </div>
</template>
