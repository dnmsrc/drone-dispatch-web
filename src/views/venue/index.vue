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
//   - 完整 CRUD 已接真实后端 /api/venues（@/api/venue 完成 DTO 适配）：
//     列表 GET、新增 POST、编辑 PUT/:id、软删除 DELETE/:id；写操作成功后统一重新拉列表
// ─────────────────────────────────────────────────────────────
import { h, onMounted, ref } from 'vue'
import { ElMessage, ElTag } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { DialogAction, ProTable } from '@/components/pro'
import type { TableActions, TableColumn } from '@/components/pro'
import { createVenue, deleteVenue, getVenues, updateVenue } from '@/api/venue'
import { venueEditDialog } from './components/venue-edit.dialog'
import type { VenueRow } from './types'

/* ═══ 列表状态（后端接口一次返回全部启用场地，无搜索/分页）═══ */
const loading = ref(false)
const rows = ref<VenueRow[]>([])

async function load(): Promise<void> {
  loading.value = true
  try {
    // http 层已剥离 Result 信封并在失败时全局弹错；这里只负责取数与兜底
    rows.value = await getVenues()
  } catch {
    // 失败时保持空表（ProTable 展示 empty-text），避免残留上一页数据
    rows.value = []
  } finally {
    loading.value = false
  }
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
    // 编辑走真实后端 PUT /api/venues/:id（只改 name/address/lng/lat，enabled 服务端保持原值）。
    // 失败时拦截器已全局弹错，这里捕获后直接 return，避免误弹「已保存」、也不刷新列表。
    try {
      await updateVenue(editingId.value, form)
    } catch {
      return
    }
    ElMessage.success('场地已保存')
    // 后端返回 Void，重新拉列表才能呈现编辑后的名称/地址/坐标
    void load()
    return
  }

  // 新增走真实后端：POST /api/venues。失败时 http 拦截器已全局弹错，
  // 这里捕获后直接 return，避免再误弹「已新增」、也不刷新列表。
  try {
    await createVenue(form)
  } catch {
    return
  }
  ElMessage.success('场地已新增')
  // 后端返回 Void、不回传新 id，重新拉列表才能拿到自增主键并呈现新场地
  void load()
}

/** 删除场地：DELETE /api/venues/:id 软删除。失败由 http 拦截器弹错，本函数捕获后不刷新列表 */
async function handleDelete(id: string): Promise<void> {
  try {
    await deleteVenue(id)
  } catch {
    return
  }
  ElMessage.success('已删除')
  // 软删除后该场地不再出现在启用列表，重新拉取
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
    render: ({ row }) => {
      const address = (row as VenueRow).address
      // 地址选填，留空落库为空串，列表用占位符避免空白格
      const text = address?.trim() ? address : '—'
      return h('span', { class: 'ellipsis', title: text }, text)
    },
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
      onClick: (row) => void handleDelete((row as VenueRow).id),
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
