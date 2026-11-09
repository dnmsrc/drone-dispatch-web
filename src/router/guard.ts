// ─────────────────────────────────────────────────────────────
// 登录鉴权路由守卫 + 全局 401 处理
//
// 两件事在一处装配，共享同一套「未登录 → 跳登录页并带回跳地址」规则：
//   1. router.beforeEach：受保护路由无登录态时拦截；已登录访问登录页时回首页；
//      并预留 meta.roles 角色控制。
//   2. setUnauthorizedHandler：任意业务请求收到 401（token 过期/篡改）时，
//      由请求层回调清登录态并跳登录页。
//
// 登录态判定以 auth store 的 admin 是否存在为准（localStorage 同步可读，首屏不闪）；
// token 真实有效性由请求层在接口 401 时兜底，并在应用启动时 auth.restore() 主动校正。
// 必须在 app.use(createPinia()) 之后调用本方法（内部要取 auth store）。
// ─────────────────────────────────────────────────────────────
import type { Router } from 'vue-router'
import { setUnauthorizedHandler } from '@/utils/http'
import { useAuthStore } from '@/stores/auth'

/** 匿名可访问的路由白名单 */
const WHITE_LIST = ['/login']

/** 登录页路径集中常量，避免散落硬编码 */
export const LOGIN_PATH = '/login'

export function setupAuthGuard(router: Router): void {
  // 全局 401：请求层已清掉加密 token，这里清登录人信息并跳登录页（携带回跳地址）
  setUnauthorizedHandler(() => {
    const auth = useAuthStore()
    auth.clearAdmin()
    const current = router.currentRoute.value
    // 已在登录页则不再重复 replace（如并发多请求同时 401）
    if (current.path === LOGIN_PATH) return
    router.replace({ path: LOGIN_PATH, query: { redirect: current.fullPath } })
  })

  router.beforeEach((to) => {
    const auth = useAuthStore()
    const isLoggedIn = Boolean(auth.admin)

    // 白名单路由：已登录再访问登录页时直接回首页，否则放行
    if (WHITE_LIST.includes(to.path)) {
      if (isLoggedIn && to.path === LOGIN_PATH) return { path: '/' }
      return true
    }

    // 受保护路由未登录：记下来源路径，登录成功后回跳
    if (!isLoggedIn) {
      return { path: LOGIN_PATH, query: { redirect: to.fullPath } }
    }

    // 角色控制（预留）：路由 meta.roles 声明允许角色，不满足则回首页
    const roles = to.meta.roles
    if (roles && roles.length > 0 && !roles.includes(auth.admin?.role ?? '')) {
      return { path: '/index' }
    }

    return true
  })
}
