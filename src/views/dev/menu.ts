// ─────────────────────────────────────────────────────────────
// 组件测试场 · 菜单配置
// 每个组件一个分组，分组内按"用法"分页；与 router/dev.ts 的路由一一对应。
// 增删演示页时：这里加一条 + router/dev.ts 加一条路由 + demos/ 下建文件。
// ─────────────────────────────────────────────────────────────

export interface DevMenuItem {
  /** 菜单文字（与路由 meta.title 保持一致） */
  title: string
  /** 完整路由路径 */
  path: string
}

export interface DevMenuGroup {
  /** 分组标题（组件名） */
  title: string
  /** 分组图标（@element-plus/icons-vue 注册名） */
  icon: string
  /** 演示页 */
  items: DevMenuItem[]
}

export const devMenuGroups: DevMenuGroup[] = [
  {
    title: '表单 ProForm',
    icon: 'EditPen',
    items: [
      { title: '基础用法', path: '/dev/playground/form/basic' },
      { title: '栅格布局', path: '/dev/playground/form/grid' },
      { title: '校验规则', path: '/dev/playground/form/rules' },
      { title: '控件总览', path: '/dev/playground/form/controls' },
    ],
  },
  {
    title: '表格 ProTable',
    icon: 'Grid',
    items: [
      { title: '基础表格', path: '/dev/playground/table/basic' },
      { title: '列与操作', path: '/dev/playground/table/features' },
    ],
  },
  {
    title: '搜索 ProSearch',
    icon: 'Search',
    items: [
      { title: '基础搜索', path: '/dev/playground/search/basic' },
      { title: '搜索 + 表格', path: '/dev/playground/search/table' },
    ],
  },
  {
    title: '弹窗 ProDialog',
    icon: 'ChatLineSquare',
    items: [
      { title: '基础用法', path: '/dev/playground/dialog/basic' },
      { title: '包裹器机制', path: '/dev/playground/dialog/wrapper' },
      { title: '表单弹窗', path: '/dev/playground/dialog/form' },
      { title: '自定义内容', path: '/dev/playground/dialog/component' },
      { title: '进阶用法', path: '/dev/playground/dialog/advanced' },
    ],
  },
]
