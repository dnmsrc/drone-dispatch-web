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
    component: () => import('@/views/order/index.vue'),
    meta: { title: '订单管理', icon: 'Tickets' },
  },
  {
    path: 'contract/list',
    component: () => import('@/views/contract/index.vue'),
    meta: { title: '合同管理', icon: 'Document' },
  },
  {
    path: 'payment/list',
    component: () => import('@/views/payment/index.vue'),
    meta: { title: '支付流水', icon: 'Money' },
  },
  {
    path: 'media/list',
    component: () => import('@/views/media/index.vue'),
    meta: { title: '媒体库', icon: 'Picture' },
  },
  {
    path: 'refund/list',
    component: () => import('@/views/refund/index.vue'),
    meta: { title: '退款管理', icon: 'RefreshLeft' },
  },
  {
    path: 'schedule',
    component: () => import('@/views/schedule/index.vue'),
    // 配置四域之档期域：全局接单时段/预约窗口/每日档期，仅管理员可写（页面内按钮再按 isAdmin 收口）
    meta: { title: '档期管理', icon: 'Calendar', roles: ['ADMIN'] },
  },
  {
    path: 'user/list',
    component: () => import('@/views/user/index.vue'),
    meta: { title: '用户管理', icon: 'User' },
  },
  {
    path: 'review/list',
    component: () => import('@/views/review/index.vue'),
    meta: { title: '评价管理', icon: 'Star' },
  },
  {
    path: 'venue/list',
    component: () => import('@/views/venue/index.vue'),
    meta: { title: '场地管理', icon: 'MapLocation' },
  },
  {
    path: 'admin/list',
    component: () => import('@/views/admin/index.vue'),
    meta: { title: '账号管理', icon: 'Avatar' },
  },
  {
    path: 'bank/list',
    component: () => import('@/views/bank/index.vue'),
    meta: { title: '收款账户', icon: 'CreditCard' },
  },
  {
    path: 'pricing',
    component: () => import('@/views/pricing/index.vue'),
    // 配置四域之计价域：带价格/影响下单金额的规则（架次/时长/附加/图案/定制/退款），仅管理员
    meta: { title: '计价管理', icon: 'PriceTag', roles: ['ADMIN'] },
  },
  {
    path: 'payment-config',
    component: () => import('@/views/payment-config/index.vue'),
    // 配置四域之支付域：只管「钱怎么付」（支付时限；渠道/收款账户为即将上线骨架），仅管理员
    meta: { title: '支付管理', icon: 'Wallet', roles: ['ADMIN'] },
  },
  {
    path: 'system/dict',
    component: () => import('@/views/system/dict.vue'),
    // 配置四域之字典域：收窄为不带价的系统级纯枚举（如 order_status），仅管理员
    meta: { title: '字典管理', icon: 'Collection', roles: ['ADMIN'] },
  },
  {
    path: 'user/profile',
    component: () => import('@/views/user/profile.vue'),
    meta: { title: '个人中心', icon: 'UserFilled', hidden: true },
  },
]

const routes: RouteRecordRaw[] = [
  // 登录页脱离 Layout 全屏展示；鉴权守卫接入后未登录访问受保护路由将重定向到此
  {
    path: '/login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', hidden: true },
  },
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
