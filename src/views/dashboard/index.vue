<script setup lang="ts">
// 首页数据看板（UI 完全复刻原型 admin/src/views/dashboard/index.vue）
// 当前为静态实现：stats/trend/tierDist/latest 取自 ./mock.ts（mock-server 真实快照），
// TODO(server): 接 http.get('/admin/dashboard') 后仅替换数据源，模板与图表配置不动。
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import StatusTag from '@/components/StatusTag.vue'
import { fmtMoney } from '@/utils/format'
import { init, type EChartsInstance } from '@/utils/echarts'
import { mockLatest, mockStats, mockTierDist, mockTrend } from './mock'

const router = useRouter()

interface StatCard {
  label: string
  value: number | string
  /** main.ts 全量注册的 Element Plus 图标名 */
  icon: string
  color: string
  bg: string
  /** 可跳转的待办卡片路由（无则纯展示） */
  path?: string
}

// 统计卡片：图标/配色逐项对齐原型
const cards = computed<StatCard[]>(() => [
  {
    label: '今日订单',
    value: mockStats.todayOrders,
    icon: 'ShoppingCart',
    color: '#409EFF',
    bg: '#ecf5ff',
  },
  {
    label: '待接单',
    value: mockStats.pendingAccept,
    icon: 'BellFilled',
    color: '#F56C6C',
    bg: '#fef0f0',
  },
  {
    label: '待执行',
    value: mockStats.toExecute,
    icon: 'VideoPlay',
    color: '#8B5CF6',
    bg: '#f3effe',
  },
  {
    label: '本月营收',
    value: fmtMoney(mockStats.monthRevenue),
    icon: 'Money',
    color: '#67C23A',
    bg: '#f0f9eb',
  },
  {
    label: '退款待审批',
    value: mockStats.pendingRefunds,
    icon: 'RefreshLeft',
    color: '#E6A23C',
    bg: '#fdf6ec',
  },
  {
    label: '待接待咨询单',
    value: mockStats.pendingConsults,
    icon: 'ChatDotRound',
    color: '#13C2C2',
    bg: '#e6fffb',
    path: '/consult',
  },
])

// 待办卡片可点击跳转（咨询受理工作台）
function openStat(c: StatCard) {
  if (c.path) router.push(c.path)
}

const trendRef = ref<HTMLDivElement>()
const pieRef = ref<HTMLDivElement>()
let trendChart: EChartsInstance | null = null
let pieChart: EChartsInstance | null = null

function renderCharts() {
  if (trendRef.value) {
    trendChart = init(trendRef.value)
    // 近 7 日订单趋势：左轴订单数（面积蓝线）+ 右轴营收（面积绿线），配色对齐原型
    trendChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['订单数', '营收'], bottom: 0 },
      grid: { left: 50, right: 60, top: 30, bottom: 40 },
      xAxis: {
        type: 'category',
        data: mockTrend.map((d) => d.date.slice(5)),
        axisLine: { lineStyle: { color: '#dcdfe6' } },
      },
      yAxis: [
        {
          type: 'value',
          name: '订单数',
          minInterval: 1,
          splitLine: { lineStyle: { color: '#f0f2f5' } },
        },
        {
          type: 'value',
          name: '营收(¥)',
          splitLine: { show: false },
          axisLabel: { formatter: (v: number) => (v >= 10000 ? v / 10000 + 'w' : String(v)) },
        },
      ],
      series: [
        {
          name: '订单数',
          type: 'line',
          smooth: true,
          data: mockTrend.map((d) => d.orders),
          itemStyle: { color: '#409EFF' },
          areaStyle: { color: 'rgba(64,158,255,0.12)' },
        },
        {
          name: '营收',
          type: 'line',
          smooth: true,
          yAxisIndex: 1,
          data: mockTrend.map((d) => d.revenue),
          itemStyle: { color: '#67C23A' },
          areaStyle: { color: 'rgba(103,194,58,0.10)' },
        },
      ],
    })
  }
  if (pieRef.value) {
    pieChart = init(pieRef.value)
    // 架次营收分布：环形饼图，0 值档位不占图例（原型同款 filter）
    pieChart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: (p: { name: string; value: number | string; percent: number }) =>
          `${p.name}<br/>营收：¥${Number(p.value).toLocaleString('zh-CN')}（${p.percent}%）`,
      },
      legend: { bottom: 0, itemWidth: 12, itemHeight: 12, textStyle: { fontSize: 12 } },
      color: ['#409EFF', '#67C23A', '#E6A23C', '#8B5CF6', '#13C2C2'],
      series: [
        {
          type: 'pie',
          radius: ['42%', '68%'],
          center: ['50%', '44%'],
          label: { formatter: '{b}' },
          data: mockTierDist.filter((d) => d.value > 0),
        },
      ],
    })
  }
}

function onResize() {
  trendChart?.resize()
  pieChart?.resize()
}

onMounted(async () => {
  // 等 DOM（含 el-col 栅格）完成布局后再 init，容器才有真实宽度
  await nextTick()
  renderCharts()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  trendChart?.dispose()
  pieChart?.dispose()
  trendChart = null
  pieChart = null
})
</script>

<template>
  <div class="page">
    <!-- 统计卡片 -->
    <el-row :gutter="16">
      <el-col v-for="c in cards" :key="c.label" :xs="12" :sm="12" :md="8" :lg="4" style="flex: 1">
        <div class="stat-card" :class="{ 'stat-card-link': c.path }" @click="openStat(c)">
          <div class="stat-icon" :style="{ background: c.bg, color: c.color }">
            <el-icon :size="26"><component :is="c.icon" /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ c.value }}</div>
            <div class="stat-label">{{ c.label }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表 -->
    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :xs="24" :md="16">
        <div class="card" style="margin-bottom: 0">
          <h3 class="card-title">近 7 日订单趋势<span class="sub">订单量与营收走势</span></h3>
          <div ref="trendRef" class="chart"></div>
        </div>
      </el-col>
      <el-col :xs="24" :md="8">
        <div class="card" style="margin-bottom: 0">
          <h3 class="card-title">架次营收分布<span class="sub">按架次档位统计</span></h3>
          <div ref="pieRef" class="chart"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 最新订单 -->
    <div class="card" style="margin-top: 16px">
      <h3 class="card-title">
        最新订单
        <el-button link type="primary" @click="router.push('/order/list')">查看全部</el-button>
      </h3>
      <el-table :data="mockLatest" stripe>
        <el-table-column prop="id" label="订单号" min-width="150" />
        <el-table-column label="用户" min-width="130">
          <template #default="{ row }">{{ row.user?.nickname || '—' }}</template>
        </el-table-column>
        <el-table-column label="金额" width="120">
          <template #default="{ row }"
            ><span class="amount-text">{{ fmtMoney(row.totalAmount) }}</span></template
          >
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><StatusTag :status="row.status" /></template>
        </el-table-column>
        <el-table-column prop="performDate" label="表演日期" width="120">
          <template #default="{ row }">{{ row.performDate }} {{ row.timeSlot }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: var(--app-bg-card);
  border-radius: var(--app-radius-base);
  box-shadow: var(--app-shadow-card);
  padding: 18px 16px;
  display: flex;
  align-items: center;
  margin-bottom: 0;
}

/* 可点击的待办卡片：鼠标手型 + 悬停加深阴影 */
.stat-card-link {
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.stat-card-link:hover {
  box-shadow: 0 3px 10px rgba(0, 21, 41, 0.16);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-info {
  margin-left: 14px;
  min-width: 0;
}

.stat-value {
  font-size: var(--app-font-size-xl);
  font-weight: 700;
  color: var(--app-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-label {
  font-size: var(--app-font-size-sm);
  color: var(--app-text-secondary);
  margin-top: 4px;
}

.chart {
  height: 320px;
  width: 100%;
}
</style>
