import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Layout from '@/layout/index.vue'
import { brand } from '@/config/brand'

// 路由 meta 约定：title 页面标题 / icon 菜单图标 / affix 固定页签 / hidden 不进菜单 / roles 角色可见
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    icon?: string
    affix?: boolean
    hidden?: boolean
    roles?: string[]
  }
}

// 主框架子路由（菜单数据同源：Sidebar 直接消费该数组）
// 页面目前是占位组件，迁移原型时逐个替换 component 即可，路由/菜单不动。
export const menuRoutes: RouteRecordRaw[] = [
  {
    path: 'index',
    component: () => import('@/views/dashboard/index.vue'),
    meta: { title: '首页', icon: 'HomeFilled', affix: true },
  },
  {
    path: 'consult',
    component: () => import('@/views/consult/index.vue'),
    meta: { title: '咨询受理', icon: 'ChatDotRound' },
  },
  {
    path: 'order/list',
    component: () => import('@/views/order/list.vue'),
    meta: { title: '订单管理', icon: 'Tickets' },
  },
  {
    path: 'refund/list',
    component: () => import('@/views/refund/list.vue'),
    meta: { title: '退款管理', icon: 'RefreshLeft' },
  },
  {
    path: 'schedule',
    component: () => import('@/views/schedule/index.vue'),
    meta: { title: '档期管理', icon: 'Calendar' },
  },
  {
    path: 'user/list',
    component: () => import('@/views/user/list.vue'),
    meta: { title: '用户管理', icon: 'User' },
  },
  {
    path: 'review/list',
    component: () => import('@/views/review/list.vue'),
    meta: { title: '评价管理', icon: 'Star' },
  },
  {
    path: 'venue/list',
    component: () => import('@/views/venue/list.vue'),
    meta: { title: '场地管理', icon: 'MapLocation' },
  },
  {
    path: 'system/config',
    component: () => import('@/views/system/config.vue'),
    meta: { title: '业务配置', icon: 'Setting' },
  },
  {
    path: 'system/dict',
    component: () => import('@/views/system/dict.vue'),
    meta: { title: '字典管理', icon: 'Collection' },
  },
  {
    path: 'user/profile',
    component: () => import('@/views/user/profile.vue'),
    meta: { title: '个人中心', icon: 'UserFilled', hidden: true },
  },
]

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: Layout,
    redirect: '/index',
    children: menuRoutes,
  },
  { path: '/:pathMatch(.*)*', redirect: '/index' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 登录/鉴权守卫留待服务端接入阶段（接入后在此按 token 与角色拦截）
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - ${brand.adminTitle}` : brand.adminTitle
})

export default router
