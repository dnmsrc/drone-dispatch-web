// ─────────────────────────────────────────────────────────────
// ECharts 统一入口（按需注册，控制产物体积）
//
// 全量 import 'echarts' 会带入全部图表与组件（gzip ≈ 170KB），
// 这里只注册当前用到的图表/组件/渲染器；新页面需要新类型（柱状图、
// 仪表盘等）时在此处补一行 use()，不要在页面里散着 import 'echarts'。
// ─────────────────────────────────────────────────────────────
import { init, use } from 'echarts/core'
import { LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

/** 图表实例类型（dispose/resize/setOption 等方法的类型来源） */
export type EChartsInstance = ReturnType<typeof init>

export { init }
