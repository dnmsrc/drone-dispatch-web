<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 评价管理（UI 完全复刻原型 admin/src/views/review/list.vue）
//
// 写法按正式版规范重构，不再照搬原型的散装 el-table：
//   - 表格 → ProTable 配置式（columns + auto-fit），头像 / 星级 / 双行单元格用 render 组装
//   - 头像：原型用 row.user.avatar 在线图片，静态页不依赖媒体服务，改用与
//     Navbar / 用户管理一致的「昵称首字符」圆形头像（中文取首字、英文取大写首字母）
//   - 星级：ElRate 只读（disabled），还原原型
//   - 评价内容：两行截断 + 悬浮 tooltip 看全文（原型 -webkit-line-clamp:2 同款观感）
//   - 数据取自 ./mock.ts，从订单 mock 实时派生，与订单管理页同源
// 原型无搜索区、无分页、无操作列，本页保持一致。
// 注意：render() 产出的 VNode 不归属本组件 scoped，自定义布局一律走行内 style
// （与退款页约定一致），不要在 <style scoped> 里写这些类。
// TODO(server): 接 GET /admin/reviews 后仅替换 load 内的数据调用，UI 与交互不动。
// ─────────────────────────────────────────────────────────────
import { h, onMounted, ref } from 'vue'
import { ElAvatar, ElRate, ElTooltip } from 'element-plus'
import { ProTable, twoLineCell } from '@/components/pro'
import type { TableColumn } from '@/components/pro'
import { fmtTime } from '@/utils/format'
import { queryReviews } from './mock'
import type { ReviewRow } from './types'

/* ═══ 列表状态（原型无搜索/分页，一次加载全量）═══ */
const loading = ref(false)
const rows = ref<ReviewRow[]>([])

/* ═══ 列表加载（等价 GET /admin/reviews，mock 内已按评价时间倒序）═══ */
async function load(): Promise<void> {
  loading.value = true
  await new Promise((r) => window.setTimeout(r, 300))
  rows.value = queryReviews()
  loading.value = false
}

onMounted(() => void load())

/* ═══ 头像首字符：中文取首字、英文取大写首字母（与 Navbar / 用户管理同款规则）═══ */
function avatarChar(nickname?: string): string {
  const n = nickname || '?'
  return /[a-zA-Z]/.test(n[0] ?? '') ? n[0].toUpperCase() : n.slice(0, 1)
}

/* ═══ 表格列（配置式；列宽逐字对齐原型）═══ */
// 无分页 + 无操作列，宽屏富余空间让给评价内容列（minWidth 240），
// 其余列保持原型固定宽，窄屏出横向滚动（观感同原型）。
const columns: TableColumn[] = [
  {
    prop: 'orderId',
    label: '订单号',
    minWidth: 150,
    render: ({ row }) =>
      h(
        'span',
        { class: 'ellipsis', title: (row as ReviewRow).orderId },
        (row as ReviewRow).orderId,
      ),
  },
  {
    label: '用户',
    minWidth: 130,
    render: ({ row }) => {
      const nickname = (row as ReviewRow).user?.nickname ?? '未知用户'
      // 行内样式规避 render VNode 不归属本组件 scoped 的问题（与退款页同款约定）
      return h('div', { style: 'display:flex;align-items:center;gap:8px;min-width:0' }, [
        h(ElAvatar, { size: 28 }, () => avatarChar(nickname)),
        h('span', { class: 'ellipsis', title: nickname }, nickname),
      ])
    },
  },
  {
    label: '星级',
    width: 150,
    render: ({ row }) => h(ElRate, { modelValue: (row as ReviewRow).stars, disabled: true }),
  },
  {
    label: '评价内容',
    minWidth: 240,
    render: ({ row }) => {
      const content = (row as ReviewRow).content
      // ElTooltip 包裹两行截断文本，悬浮看全文（还原原型 el-tooltip + line-clamp:2）；
      // 截断样式走行内，规避 render VNode 不归属本组件 scoped 的问题
      return h(
        ElTooltip,
        { content, placement: 'top', showAfter: 300 },
        {
          default: () =>
            h(
              'span',
              {
                style:
                  'display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;overflow:hidden',
              },
              content,
            ),
        },
      )
    },
  },
  {
    label: '关联场次',
    width: 170,
    // 主行「N 架」+ 副行场景（无场景兜底「—」），复用全局双行单元格口径
    render: ({ row }) =>
      twoLineCell(`${(row as ReviewRow).droneCount} 架`, (row as ReviewRow).occasion || ''),
  },
  {
    label: '评价时间',
    width: 160,
    render: ({ row }) => h('span', { class: 'nowrap' }, fmtTime((row as ReviewRow).createdAt)),
  },
]
</script>

<template>
  <div class="page">
    <!-- 评价列表（原型同款：单卡片 + 标题计数 + 表格，无搜索区、无分页、无操作列） -->
    <div class="card">
      <h3 class="card-title">
        评价管理<span class="sub">共 {{ rows.length }} 条用户评价</span>
      </h3>

      <!-- auto-fit：行数多时表格 body 钳到视口底内部滚动，行数少时撑开到
           不出现滚动条的最大（标准与开关语义见 ProTable / TableAutoFitOptions） -->
      <ProTable
        :columns="columns"
        :data="rows"
        :loading="loading"
        stripe
        row-key="orderId"
        :auto-fit="true"
        empty-text="暂无评价"
      />
    </div>
  </div>
</template>
