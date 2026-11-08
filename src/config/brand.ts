import { env } from './env'

// 品牌外观常量：品牌名 / 后台标题来自环境变量（.env.* 的 VITE_APP_NAME / VITE_APP_TITLE），
// 便于按环境或品牌出不同的包。
// 接入服务端后改为启动时拉取 /api/config/profile（品牌驱动，零改前端代码）。
export const brand = {
  appName: env.appName,
  adminTitle: env.appTitle,
} as const
