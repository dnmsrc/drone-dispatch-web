import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import { setDialogAppContext } from './components/pro/dialog'
// 全局样式入口：主题包 + Element Plus 全量样式（SCSS 定制版）+ 控件重写 + 布局 + 公共组件
import './styles/index.scss'

/**
 * 应用启动
 * 用 async 包装的原因：开发环境要先异步加载「组件测试场」路由，再挂载应用，
 * 否则首次直接访问 /dev/playground 时路由还没注册，会落到 404 重定向。
 */
async function bootstrap() {
  const app = createApp(App)

  // 命令式弹窗通过 render() 挂载在 app 之外，显式注入应用上下文，
  // 弹窗内容组件才能使用全局注册的组件（图标等）与全局配置
  setDialogAppContext(app._context)

  app.use(createPinia())

  // 组件测试场：仅在 VITE_ENABLE_DEV_PANEL=true 时注册（开发 .env 开、生产 .env 关）。
  // 直接用字面量 import.meta.env.VITE_* 判断，生产构建时该变量被静态替换为 'false'，
  // 整个分支连同动态 import 一起被剔除，演示代码不会进正式产物。
  if (import.meta.env.VITE_ENABLE_DEV_PANEL === 'true') {
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
