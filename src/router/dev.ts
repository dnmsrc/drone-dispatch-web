// ─────────────────────────────────────────────────────────────
// 组件测试场路由（仅开发环境）
//
// 由 main.ts 在 `import.meta.env.DEV` 分支里动态注册：
//   - 生产构建时该分支被静态剔除，本文件与演示页不会进入产物
//   - 路由为独立顶层路由（不挂在业务 Layout 下），页面自带侧栏菜单
//   - 菜单入口不在 menuRoutes 中，正常业务导航看不到它
// ─────────────────────────────────────────────────────────────
import type { RouteRecordRaw } from 'vue-router'

export const devRoutes: RouteRecordRaw[] = [
  {
    path: '/dev/playground',
    component: () => import('@/views/dev/index.vue'),
    redirect: '/dev/playground/form/basic',
    children: [
      {
        path: 'form/basic',
        component: () => import('@/views/dev/demos/form-basic.vue'),
        meta: { title: '表单 · 基础用法' },
      },
      {
        path: 'form/grid',
        component: () => import('@/views/dev/demos/form-grid.vue'),
        meta: { title: '表单 · 栅格布局' },
      },
      {
        path: 'form/rules',
        component: () => import('@/views/dev/demos/form-rules.vue'),
        meta: { title: '表单 · 校验规则' },
      },
      {
        path: 'form/controls',
        component: () => import('@/views/dev/demos/form-controls.vue'),
        meta: { title: '表单 · 控件总览' },
      },
      {
        path: 'table/basic',
        component: () => import('@/views/dev/demos/table-basic.vue'),
        meta: { title: '表格 · 基础表格' },
      },
      {
        path: 'table/features',
        component: () => import('@/views/dev/demos/table-features.vue'),
        meta: { title: '表格 · 列与操作' },
      },
      {
        path: 'search/basic',
        component: () => import('@/views/dev/demos/search-basic.vue'),
        meta: { title: '搜索 · 基础搜索' },
      },
      {
        path: 'search/table',
        component: () => import('@/views/dev/demos/search-table.vue'),
        meta: { title: '搜索 · 搜索 + 表格' },
      },
      {
        path: 'dialog/basic',
        component: () => import('@/views/dev/demos/dialog-basic.vue'),
        meta: { title: '弹窗 · 基础用法' },
      },
      {
        path: 'dialog/form',
        component: () => import('@/views/dev/demos/dialog-form.vue'),
        meta: { title: '弹窗 · 表单弹窗' },
      },
      {
        path: 'dialog/component',
        component: () => import('@/views/dev/demos/dialog-component.vue'),
        meta: { title: '弹窗 · 自定义内容' },
      },
      {
        path: 'dialog/advanced',
        component: () => import('@/views/dev/demos/dialog-advanced.vue'),
        meta: { title: '弹窗 · 进阶用法' },
      },
      {
        path: 'dialog/wrapper',
        component: () => import('@/views/dev/demos/dialog-wrapper.vue'),
        meta: { title: '弹窗 · 架构与句柄' },
      },
    ],
  },
]
