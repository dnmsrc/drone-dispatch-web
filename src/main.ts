import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
// 全局样式入口：主题包 + Element Plus 全量样式（SCSS 定制版）+ 控件重写 + 布局 + 公共组件
import './styles/index.scss'

/**
 * 应用启动
 * 用 async 包装的原因：开发环境要先异步加载「组件测试场」路由，再挂载应用，
 * 否则首次直接访问 /dev/playground 时路由还没注册，会落到 404 重定向。
 */
async function bootstrap() {
  const app = createApp(App)

  app.use(createPinia())

  // 组件测试场：仅开发环境注册（生产构建时该分支被静态剔除，演示代码不会进产物）
  if (import.meta.env.DEV) {
    const { devRoutes } = await import('./router/dev')
    for (const route of devRoutes) router.addRoute(route)
  }

  app.use(router)
  app.use(ElementPlus, { locale: zhCn })

  // 图标全量注册：菜单/顶栏通过 meta.icon 的字符串名动态渲染图标
  for (const [name, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(name, component)
  }

  app.mount('#app')
}

void bootstrap()
