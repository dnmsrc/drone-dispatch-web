<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 字典管理（UI 复刻原型 admin/src/views/system/dict.vue）
//
// 若依风格两级结构，左右双栏：
//   左：字典类型（el-table highlight-current-row，选中联动右侧）
//   右：该类型的字典项（值按类型语义渲染：价格 / 退款比例 / 普通值）
// 两套 CRUD 弹窗用页面内 el-dialog + 配置式 ProForm：
//   - 类型弹窗字段固定；字典项弹窗的「值」标签/精度随当前类型动态变化
//     （ProForm 的 fields 是响应式 props，computed 实时生效，比 createFormDialog
//      的固定快照更适合这种动态表单）
// 内置字典（system）保护：类型不可删、字典项的键编辑时禁用（被业务引用）。
// 数据走 ./dict-mock 的内存 CRUD，刷新回滚。
// TODO(server): 接 /admin/dict 系列后仅替换 dict-mock 调用，本页不改名。
// ─────────────────────────────────────────────────────────────
import { computed, h, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElSwitch, ElTag } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { confirmDialog, DialogAction, ProForm } from '@/components/pro'
import type { FormFieldConfig, ProFormExpose } from '@/components/pro'
import { fmtMoney } from '@/utils/format'
import {
  createDictItem,
  createDictType,
  deleteDictItem,
  deleteDictType,
  queryDictItems,
  queryDictTypes,
  toggleDictItem,
  updateDictItem,
  updateDictType,
} from './dict-mock'
import { PRICE_TYPES } from './dict-types'
import type { DictItem, DictTypeDetail, DictTypeSummary } from './dict-types'

/* ═══ 列表状态 ═══ */
const loadingTypes = ref(false)
const loadingItems = ref(false)
const types = ref<DictTypeSummary[]>([])
const current = ref<DictTypeDetail | null>(null)
const items = ref<DictItem[]>([])

/** 按金额渲染的类型（值=元） */
const isPriceType = computed(
  () => !!current.value && (PRICE_TYPES as readonly string[]).includes(current.value.type),
)
const isRefundType = computed(() => current.value?.type === 'refund_rule')

/** 字典项「值」列的动态标签 */
const valueLabel = computed(() => {
  if (!current.value) return '值'
  if (isPriceType.value) return '价格（元）'
  if (isRefundType.value) return '退款比例'
  return '值'
})

async function loadTypes(keepSelection = true): Promise<void> {
  loadingTypes.value = true
  await new Promise((r) => window.setTimeout(r, 200))
  const list = queryDictTypes()
  types.value = list
  if (keepSelection && current.value) {
    const t = list.find((x) => x.type === current.value!.type)
    if (t) await onSelectType(t)
    else {
      current.value = null
      items.value = []
    }
  }
  if (!current.value && list.length) {
    await onSelectType(list[0])
  }
  loadingTypes.value = false
}

async function onSelectType(row: DictTypeSummary | null): Promise<void> {
  if (!row) return
  loadingItems.value = true
  await new Promise((r) => window.setTimeout(r, 200))
  const detail = queryDictItems(row.type)
  current.value = detail
  items.value = detail.list
  loadingItems.value = false
}

onMounted(() => void loadTypes(false))

/* ═══ 字典类型弹窗（字段固定）═══ */
const typeDialogVisible = ref(false)
const typeSaving = ref(false)
const typeFormRef = ref<ProFormExpose>()
const typeForm = reactive({ oldType: '', type: '', name: '', remark: '' })

const typeFields = computed<FormFieldConfig[]>(() => [
  {
    prop: 'type',
    label: '类型标识',
    placeholder: '如 venue_type（小写英文/数字/下划线）',
    required: true,
    // 编辑时禁用（oldType 非空）；新增可填
    disabled: !!typeForm.oldType,
  },
  {
    prop: 'name',
    label: '类型名称',
    placeholder: '如 场地类型',
    required: true,
    props: { maxlength: 20 },
  },
  {
    prop: 'remark',
    label: '说明',
    control: 'textarea',
    placeholder: '该字典的用途说明（可选）',
    props: { rows: 2, maxlength: 100 },
  },
])

function openTypeDialog(row?: DictTypeSummary): void {
  typeForm.oldType = row?.type ?? ''
  typeForm.type = row?.type ?? ''
  typeForm.name = row?.name ?? ''
  typeForm.remark = row?.remark ?? ''
  typeDialogVisible.value = true
}

async function saveType(): Promise<void> {
  const ok = (await typeFormRef.value?.validate()) ?? false
  if (!ok) return
  typeSaving.value = true
  try {
    await new Promise((r) => window.setTimeout(r, 200))
    if (typeForm.oldType) {
      updateDictType(typeForm.oldType, {
        type: typeForm.type,
        name: typeForm.name,
        remark: typeForm.remark,
      })
    } else {
      createDictType({ type: typeForm.type, name: typeForm.name, remark: typeForm.remark })
    }
    ElMessage.success('已保存')
    typeDialogVisible.value = false
    await loadTypes()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    typeSaving.value = false
  }
}

async function removeType(row: DictTypeSummary): Promise<void> {
  const result = await confirmDialog.open({
    title: '删除确认',
    content: `确认删除字典类型「${row.name}」及其全部字典项？`,
    type: 'warning',
    okText: '删除',
    okType: 'danger',
  })
  if (result.action !== DialogAction.Confirm) return
  try {
    deleteDictType(row.type)
    ElMessage.success('已删除')
    if (current.value?.type === row.type) {
      current.value = null
      items.value = []
    }
    await loadTypes()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '删除失败')
  }
}

/* ═══ 字典项弹窗（值列标签/精度随类型动态）═══ */
const itemDialogVisible = ref(false)
const itemSaving = ref(false)
const itemFormRef = ref<ProFormExpose>()
const itemForm = reactive({
  id: '',
  key: '',
  label: '',
  value: 0,
  extra: '',
  sort: 1,
  status: true,
})

const itemFields = computed<FormFieldConfig[]>(() => [
  {
    prop: 'label',
    label: '标签',
    placeholder: '展示名称，如 100 架',
    required: true,
    props: { maxlength: 40 },
  },
  {
    prop: 'key',
    label: '键',
    placeholder: '程序使用的标识，如 100',
    required: true,
    // 内置字典的键被业务引用，编辑时禁用（id 非空且类型内置）
    disabled: !!itemForm.id && !!current.value?.system,
    props: { maxlength: 40 },
  },
  {
    prop: 'value',
    label: valueLabel.value,
    control: 'input-number',
    // 退款比例：0-1、步进 0.05、两位小数；其余：整数、步进 100、上限百万
    props: isRefundType.value
      ? { min: 0, max: 1, step: 0.05, precision: 2, controlsPosition: 'right' }
      : { min: 0, max: 1000000, step: 100, precision: 0, controlsPosition: 'right' },
  },
  {
    prop: 'extra',
    label: '说明',
    placeholder: '补充说明，如 适用场景（可选）',
    props: { maxlength: 100 },
  },
  {
    prop: 'sort',
    label: '排序',
    control: 'input-number',
    props: { min: 1, max: 999, precision: 0, controlsPosition: 'right' },
  },
  {
    prop: 'status',
    label: '状态',
    control: 'switch',
    props: { activeText: '启用', inactiveText: '停用' },
  },
])

function openItemDialog(row?: DictItem): void {
  if (!current.value) return
  itemForm.id = row?.id ?? ''
  itemForm.key = row?.key ?? ''
  itemForm.label = row?.label ?? ''
  itemForm.value = row?.value ?? 0
  itemForm.extra = row?.extra ?? ''
  itemForm.sort = row?.sort ?? items.value.length + 1
  itemForm.status = row ? row.status === 1 : true
  itemDialogVisible.value = true
}

async function saveItem(): Promise<void> {
  if (!current.value) return
  const ok = (await itemFormRef.value?.validate()) ?? false
  if (!ok) return
  itemSaving.value = true
  try {
    await new Promise((r) => window.setTimeout(r, 200))
    const payload = {
      key: itemForm.key,
      label: itemForm.label,
      value: itemForm.value,
      extra: itemForm.extra,
      sort: itemForm.sort,
      status: (itemForm.status ? 1 : 0) as 0 | 1,
    }
    if (itemForm.id) updateDictItem(current.value.type, itemForm.id, payload)
    else createDictItem(current.value.type, payload)
    ElMessage.success('已保存')
    itemDialogVisible.value = false
    await onSelectType(current.value as unknown as DictTypeSummary)
    await loadTypes()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    itemSaving.value = false
  }
}

async function onToggleStatus(row: DictItem, enabled: boolean): Promise<void> {
  if (!current.value) return
  try {
    toggleDictItem(current.value.type, row.id, enabled)
    row.status = enabled ? 1 : 0
    ElMessage.success(enabled ? '已启用' : '已停用（H5 端将不再展示该项）')
    await loadTypes()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '操作失败')
  }
}

async function removeItem(row: DictItem): Promise<void> {
  if (!current.value) return
  const result = await confirmDialog.open({
    title: '删除确认',
    content: `确认删除字典项「${row.label}」？`,
    type: 'warning',
    okText: '删除',
    okType: 'danger',
  })
  if (result.action !== DialogAction.Confirm) return
  try {
    deleteDictItem(current.value.type, row.id)
    ElMessage.success('已删除')
    await onSelectType(current.value as unknown as DictTypeSummary)
    await loadTypes()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '删除失败')
  }
}

/** 值单元格：价格 / 退款比例 / 普通值（对齐原型三分支） */
function renderValue(row: DictItem) {
  if (!current.value) return h('span', String(row.value))
  if (isPriceType.value) {
    return h('span', { class: 'amount-text' }, row.value ? fmtMoney(row.value) : '0')
  }
  if (isRefundType.value) return h('span', `${Math.round(row.value * 100)}%`)
  return h('span', String(row.value))
}
</script>

<template>
  <div class="page">
    <div class="dict-wrap">
      <!-- 左：字典类型 -->
      <div class="card type-card">
        <div class="card-head">
          <h3 class="card-title">字典类型</h3>
          <el-button type="primary" size="small" :icon="Plus" @click="openTypeDialog()">
            新增类型
          </el-button>
        </div>
        <el-table
          v-loading="loadingTypes"
          :data="types"
          size="small"
          highlight-current-row
          row-key="type"
          @current-change="onSelectType"
        >
          <el-table-column label="类型" min-width="130">
            <template #default="{ row }">
              <div class="type-name">{{ row.name }}</div>
              <div class="type-key">{{ row.type }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="itemCount" label="条目" width="60" align="center" />
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                size="small"
                @click.stop="openTypeDialog(row as DictTypeSummary)"
              >
                编辑
              </el-button>
              <el-tooltip
                v-if="row.system"
                content="系统内置字典被业务引用，不可删除"
                placement="top"
              >
                <span>
                  <el-button link type="info" size="small" disabled>删除</el-button>
                </span>
              </el-tooltip>
              <el-button
                v-else
                link
                type="danger"
                size="small"
                @click.stop="removeType(row as DictTypeSummary)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 右：字典项 -->
      <div class="card item-card">
        <div class="card-head">
          <h3 class="card-title">
            字典项
            <template v-if="current">
              <span class="cur-tag">{{ current.name }}（{{ current.type }}）</span>
              <el-tag v-if="current.system" size="small" type="warning" effect="plain">
                内置
              </el-tag>
            </template>
          </h3>
          <el-button
            v-if="current"
            type="primary"
            size="small"
            :icon="Plus"
            @click="openItemDialog()"
          >
            新增字典项
          </el-button>
        </div>
        <p v-if="current?.remark" class="remark">{{ current.remark }}</p>
        <el-empty v-if="!current" description="请先选择左侧字典类型" :image-size="80" />
        <el-table v-else v-loading="loadingItems" :data="items" size="small" border>
          <el-table-column prop="label" label="标签" min-width="130" />
          <el-table-column prop="key" label="键" min-width="100" />
          <el-table-column label="值" width="110" align="right">
            <template #default="{ row }">
              <component :is="{ render: () => renderValue(row as DictItem) }" />
            </template>
          </el-table-column>
          <el-table-column prop="extra" label="说明" min-width="140" show-overflow-tooltip />
          <el-table-column prop="sort" label="排序" width="60" align="center" />
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <ElSwitch
                :model-value="row.status === 1"
                @change="(val) => onToggleStatus(row as DictItem, Boolean(val))"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="110" align="center" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openItemDialog(row as DictItem)">
                编辑
              </el-button>
              <el-button link type="danger" size="small" @click="removeItem(row as DictItem)"
                >删除</el-button
              >
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 字典类型弹窗 -->
    <el-dialog
      v-model="typeDialogVisible"
      :title="typeForm.oldType ? '编辑字典类型' : '新增字典类型'"
      width="420px"
      destroy-on-close
    >
      <ProForm
        ref="typeFormRef"
        :model="typeForm"
        :fields="typeFields"
        label-width="90px"
        :default-span="24"
      />
      <template #footer>
        <el-button @click="typeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="typeSaving" @click="saveType">保存</el-button>
      </template>
    </el-dialog>

    <!-- 字典项弹窗 -->
    <el-dialog
      v-model="itemDialogVisible"
      :title="itemForm.id ? '编辑字典项' : `新增字典项 - ${current?.name || ''}`"
      width="460px"
      destroy-on-close
    >
      <ProForm
        ref="itemFormRef"
        :model="itemForm"
        :fields="itemFields"
        label-width="90px"
        :default-span="24"
      />
      <template #footer>
        <el-button @click="itemDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="itemSaving" @click="saveItem">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.dict-wrap {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.type-card {
  flex: 0 0 380px;
}

.item-card {
  flex: 1;
  min-width: 0;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 8px;
}

.card-head .card-title {
  margin: 0;
}

.type-name {
  font-weight: 600;
  color: #303133;
}

.type-key {
  font-size: 12px;
  color: #909399;
}

.cur-tag {
  font-size: 13px;
  font-weight: 400;
  color: #606266;
  margin: 0 8px;
}

.remark {
  margin: -4px 0 12px;
  font-size: 12px;
  color: #909399;
}

/* 窄屏自适应：左右栏堆叠 */
@media (max-width: 992px) {
  .dict-wrap {
    flex-direction: column;
  }

  .type-card,
  .item-card {
    flex: none;
    width: 100%;
  }
}
</style>
