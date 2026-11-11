<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 场地管理（UI 复刻原型 admin/src/views/venue/list.vue，录入方式升级为地图选点）
//
// 正式版规范落地：
//   - 散装 el-table → ProTable 配置式（columns + actions + auto-fit）
//   - 新增/编辑 → 自定义 VenueEditDialog（wrapDialog 命令式句柄），
//     内部 AMapPicker 支持高德地名搜索 + 地图点选，坐标统一 WGS-84；
//     未配置 Key / 加载失败时自动降级手动经纬度输入
//   - 删除确认 → 操作列 confirm 二次确认（内部走 ElMessageBox）
//   - 数据走 ./mock.ts 的内存 CRUD（种子对齐 seed.js VENUES），刷新回滚
// TODO(server): 接 /admin/venues CRUD 后仅替换 mock.ts，本页与弹窗不改名。
// ─────────────────────────────────────────────────────────────
import { h, onMounted, ref } from 'vue'
import { ElMessage, ElTag } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { DialogAction, ProTable } from '@/components/pro'
import type { TableActions, TableColumn } from '@/components/pro'
import { createVenue, deleteVenue, queryVenues, updateVenue } from './mock'
import { venueEditDialog } from './components/venue-edit.dialog'
import type { VenueRow } from './types'

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

/** 当前编辑的场地 id（空串表示新增） */
const editingId = ref('')

async function openForm(row?: VenueRow): Promise<void> {
  editingId.value = row?.id ?? ''
  const result = await venueEditDialog.open({ row: row ?? null })
  if (result.action !== DialogAction.Confirm || !result.data) return

  const form = result.data
  if (editingId.value) {
    updateVenue(editingId.value, form)
    ElMessage.success('场地已保存')
  } else {
    createVenue(form)
    ElMessage.success('场地已新增')
  }
  void load()
}

/* ═══ 表格列（配置式）═══ */
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
  {
    label: '坐标（WGS-84）',
    width: 200,
    render: ({ row }) => {
      const v = row as VenueRow
      return h('span', { class: 'cell-sub' }, `${v.lng.toFixed(6)}, ${v.lat.toFixed(6)}`)
    },
  },
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
        场地管理<span class="sub">预设表演场地，支持高德地图选点，用户下单时可直接选择</span>
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
