import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
// 全局样式入口：主题包 + Element Plus 全量样式（SCSS 定制版）+ 控件重写
import './styles/index.scss'

const app = createApp(App)

app.use(ElementPlus, { locale: zhCn })
app.mount('#app')
