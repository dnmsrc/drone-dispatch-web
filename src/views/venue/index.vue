<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 场地管理（UI 完全复刻原型 admin/src/views/venue/list.vue）
//
// 正式版规范落地：
//   - 散装 el-table → ProTable 配置式（columns + actions + auto-fit）
//   - 新增/编辑 el-dialog → 公共 createFormDialog 配置式表单弹窗，
//     open() 传初始值区分新增/编辑，await 结果用 DialogAction 判断
//   - 删除确认 → 操作列 confirm 二次确认（内部走 ElMessageBox，外观与全站一致）
//   - 数据走 ./mock.ts 的内存 CRUD（种子对齐 seed.js VENUES），刷新回滚
// 经纬度用 input-number（3 位小数、step 0.001、范围限制），启用状态用 switch。
// TODO(server): 接 /admin/venues CRUD 后仅替换 mock.ts，本页与弹窗不改名。
// ─────────────────────────────────────────────────────────────
import { h, onMounted, ref } from 'vue'
import { ElMessage, ElTag } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { createFormDialog, DialogAction, ProTable } from '@/components/pro'
import type { FormFieldConfig, TableActions, TableColumn } from '@/components/pro'
import { createVenue, deleteVenue, queryVenues, updateVenue } from './mock'
import type { VenueForm, VenueRow } from './types'

/* ═══ 列表状态（原型无搜索/分页，一次加载全量）═══ */
const loading = ref(false)
const rows = ref<VenueRow[]>([])

async function load(): Promise<void> {
  loading.value = true
  await new Promise((r) => window.setTimeout(r, 300))
  rows.value = queryVenues()
  loading.value = false
}

onMounted(() => void load())

/* ═══ 新增/编辑表单弹窗（替代原型 el-dialog + 手工 formRef 校验）═══ */
// 新增默认坐标取原型 form 初值（杭州 120.2 / 30.25），编辑时由 open 入参覆盖
const DEFAULT_LNG = 120.2
const DEFAULT_LAT = 30.25

const venueFields: FormFieldConfig[] = [
  {
    prop: 'name',
    label: '场地名称',
    placeholder: '例如：滨江世纪广场',
    required: true,
    rules: [{ required: true, message: '请填写场地名称', trigger: 'blur' }],
    props: { maxlength: 30 },
  },
  {
    prop: 'address',
    label: '详细地址',
    placeholder: '例如：杭州市滨江区江南大道 100 号',
    required: true,
    rules: [{ required: true, message: '请填写详细地址', trigger: 'blur' }],
    props: { maxlength: 60 },
  },
  {
    prop: 'lng',
    label: '经度',
    control: 'input-number',
    // 3 位小数、步进 0.001、经度范围 -180~180（对齐原型 el-input-number）
    props: { precision: 3, step: 0.001, min: -180, max: 180, controlsPosition: 'right' },
  },
  {
    prop: 'lat',
    label: '纬度',
    control: 'input-number',
    // 纬度范围 -90~90
    props: { precision: 3, step: 0.001, min: -90, max: 90, controlsPosition: 'right' },
  },
  {
    prop: 'enabled',
    label: '启用状态',
    control: 'switch',
    defaultValue: true,
    props: { activeText: '启用', inactiveText: '停用' },
  },
]

const venueDialog = createFormDialog<VenueForm>({
  name: 'venue-form',
  width: 480,
  labelWidth: '90px',
  defaultSpan: 24,
  okText: '保存',
  fields: venueFields,
})

/** 当前编辑的场地 id（空串表示新增） */
const editingId = ref('')

async function openForm(row?: VenueRow): Promise<void> {
  editingId.value = row?.id ?? ''
  const result = await venueDialog.open({
    title: row ? '编辑场地' : '新增场地',
    // open 入参覆盖默认 model；新增给空白 + 默认坐标/启用，编辑回填该行
    name: row?.name ?? '',
    address: row?.address ?? '',
    lng: row?.lng ?? DEFAULT_LNG,
    lat: row?.lat ?? DEFAULT_LAT,
    enabled: row?.enabled ?? true,
  })
  if (result.action !== DialogAction.Confirm || !result.data) return

  const form = result.data as VenueForm
  if (editingId.value) {
    updateVenue(editingId.value, form)
    ElMessage.success('场地已保存')
  } else {
    createVenue(form)
    ElMessage.success('场地已新增')
  }
  void load()
}

/* ═══ 表格列（配置式；列宽逐字对齐原型）═══ */
const columns: TableColumn[] = [
  {
    prop: 'name',
    label: '场地名称',
    minWidth: 160,
    render: ({ row }) =>
      h('span', { class: 'ellipsis', title: (row as VenueRow).name }, (row as VenueRow).name),
  },
  {
    prop: 'address',
    label: '地址',
    minWidth: 240,
    render: ({ row }) =>
      h('span', { class: 'ellipsis', title: (row as VenueRow).address }, (row as VenueRow).address),
  },
  { prop: 'lng', label: '经度', width: 110 },
  { prop: 'lat', label: '纬度', width: 110 },
  {
    label: '启用状态',
    width: 100,
    align: 'center',
    render: ({ row }) => {
      const enabled = (row as VenueRow).enabled
      return h(ElTag, { type: enabled ? 'success' : 'info' }, () => (enabled ? '启用' : '停用'))
    },
  },
]

/* ═══ 操作列：编辑 / 删除（删除走二次确认）═══ */
const actions: TableActions = {
  width: 140,
  fixed: 'right',
  buttons: [
    {
      text: '编辑',
      type: 'primary',
      icon: 'Edit',
      onClick: (row) => void openForm(row as VenueRow),
    },
    {
      text: '删除',
      type: 'danger',
      icon: 'Delete',
      // confirm 由 ProTable 内部弹 ElMessageBox，确认后才执行 onClick
      confirm: (row) => `确认删除场地「${(row as VenueRow).name}」？删除后不可恢复。`,
      confirmButtonText: '删除',
      onClick: (row) => {
        deleteVenue((row as VenueRow).id)
        ElMessage.success('已删除')
        void load()
      },
    },
  ],
}
</script>

<template>
  <div class="page">
    <div class="card">
      <h3 class="card-title">
        场地管理<span class="sub">预设表演场地，用户下单时可直接选择</span>
        <el-button type="primary" :icon="Plus" @click="openForm()">新增场地</el-button>
      </h3>

      <ProTable
        :columns="columns"
        :data="rows"
        :loading="loading"
        :actions="actions"
        stripe
        row-key="id"
        :auto-fit="true"
        empty-text="暂无场地"
      />
    </div>
  </div>
</template>
