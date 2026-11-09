<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 用户管理（UI 完全复刻原型 admin/src/views/user/list.vue）
//
// 写法按正式版规范重构，不再照搬原型的散装 el-table：
//   - 表格 → ProTable 配置式（columns + auto-fit），头像列用 render 组装
//     el-avatar；订单数 / 累计消费保留原型的本地排序（sortable）
//   - 头像：原型用 /api/media/avatar/:id 图片，静态页不依赖在线媒体服务，
//     改用与 Navbar 一致的「昵称首字符」圆形头像（中文取首字、英文取大写首字母）
//   - 数据取自 ./mock.ts，订单聚合字段由 order/mock 的 orderStore 实时派生，
//     与订单管理页同源；接真接口后只替换 queryUsers 调用
// 原型无搜索区、无分页、无操作列，本页保持一致。
// TODO(server): 接 GET /admin/users 后仅替换 load 内的数据调用，UI 与交互不动。
// ─────────────────────────────────────────────────────────────
import { h, onMounted, ref } from 'vue'
import { ElAvatar } from 'element-plus'
import { ProTable } from '@/components/pro'
import type { TableColumn } from '@/components/pro'
import { fmtMoney, fmtTime } from '@/utils/format'
import { queryUsers } from './mock'
import type { UserRow } from './types'

/* ═══ 列表状态（原型无搜索/分页，一次加载全量）═══ */
const loading = ref(false)
const rows = ref<UserRow[]>([])

/* ═══ 列表加载（等价 GET /admin/users，mock 内已按累计消费降序）═══ */
async function load(): Promise<void> {
  loading.value = true
  await new Promise((r) => window.setTimeout(r, 300))
  rows.value = queryUsers()
  loading.value = false
}

onMounted(() => void load())

/* ═══ 头像首字符：中文取首字、英文取大写首字母（与 Navbar 头像同款规则）═══ */
function avatarChar(nickname: string): string {
  const n = nickname || '?'
  return /[a-zA-Z]/.test(n[0] ?? '') ? n[0].toUpperCase() : n.slice(0, 1)
}

/* ═══ 表格列（配置式；列宽与对齐逐字对齐原型）═══ */
// 无分页 + 无操作列，宽屏右侧富余空间让给昵称/手机号两列（minWidth），
// 其余列保持原型固定宽，窄屏出横向滚动（观感同原型）。
const columns: TableColumn[] = [
  {
    label: '头像',
    width: 80,
    align: 'center',
    render: ({ row }) => h(ElAvatar, { size: 36 }, () => avatarChar((row as UserRow).nickname)),
  },
  {
    prop: 'nickname',
    label: '昵称',
    minWidth: 140,
    render: ({ row }) =>
      h('span', { class: 'ellipsis', title: (row as UserRow).nickname }, (row as UserRow).nickname),
  },
  {
    prop: 'phone',
    label: '手机号',
    minWidth: 130,
    render: ({ row }) =>
      h('span', { class: 'ellipsis', title: (row as UserRow).phone }, (row as UserRow).phone),
  },
  {
    prop: 'orderCount',
    label: '订单数',
    width: 90,
    align: 'center',
    sortable: true,
  },
  {
    prop: 'totalSpent',
    label: '累计消费',
    width: 140,
    sortable: true,
    // ProTable 本地排序默认按 prop 取数，金额为数字可直接排；金额红字强调
    render: ({ row }) =>
      h(
        'span',
        { class: 'amount-text', title: fmtMoney((row as UserRow).totalSpent) },
        fmtMoney((row as UserRow).totalSpent),
      ),
  },
  {
    label: '最近下单时间',
    width: 170,
    render: ({ row }) => {
      const v = (row as UserRow).lastOrderAt
      return h('span', { class: 'nowrap' }, v ? fmtTime(v) : '—')
    },
  },
  {
    label: '注册时间',
    width: 170,
    render: ({ row }) => h('span', { class: 'nowrap' }, fmtTime((row as UserRow).createdAt)),
  },
]
</script>

<template>
  <div class="page">
    <!-- 用户列表（原型同款：单卡片 + 标题计数 + 表格，无搜索区、无分页、无操作列） -->
    <div class="card">
      <h3 class="card-title">
        用户管理<span class="sub">共 {{ rows.length }} 位用户</span>
      </h3>

      <!-- auto-fit：行数多时表格 body 钳到视口底内部滚动，行数少时撑开到
           不出现滚动条的最大（标准与开关语义见 ProTable / TableAutoFitOptions） -->
      <ProTable
        :columns="columns"
        :data="rows"
        :loading="loading"
        stripe
        row-key="id"
        :auto-fit="true"
        empty-text="暂无注册用户"
      />
    </div>
  </div>
</template>
