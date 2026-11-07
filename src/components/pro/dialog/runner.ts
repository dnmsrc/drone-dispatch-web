// ─────────────────────────────────────────────────────────────
// 弹窗挂载引擎（内部模块，业务不直接调用）
//
// 每次包裹器 .open() 都走一遍这里：
//   - 新建一个容器 div 挂到 body（弹窗不占业务页面的 DOM 层级）
//   - 用 render() 挂载 Runner，由 Runner 注入上下文并渲染业务弹窗组件
//   - 关闭动作发生后延迟 400ms 卸载（让 el-dialog 关闭动画播完，另有兜底）
//   - 把 Runner 暴露的 close 入口交回包裹器内部句柄（重复 open 时销毁旧实例 / 调试用）
// ─────────────────────────────────────────────────────────────
import { h, render } from 'vue'
import type { AppContext, Component, VNode } from 'vue'
import Runner from './Runner.vue'
import type { DialogAction, RunnerHooks } from './types'

/** 全局 app 上下文：由 main.ts 注入，让弹窗组件能用全局注册的组件/指令 */
let sharedAppContext: AppContext | null = null

export function setDialogAppContext(context: AppContext | null): void {
  sharedAppContext = context
}

export interface MountRunnerArgs {
  /** 业务弹窗组件 */
  component: Component
  /** 本次 open 的参数 */
  params: Record<string, unknown>
  /** 固定透传的 props（wrapDialog options.props，作为默认值） */
  extraProps?: Record<string, unknown>
  /** 包裹器配置里的默认动作覆盖 */
  hooks?: RunnerHooks
  /** 关闭动作与业务数据（包裹器在这里 resolve Promise / 触发回调） */
  onSettle: (payload: { action: DialogAction | string; data: unknown }) => void
  /** DOM 卸载完成（可选） */
  onClosed?: () => void
}

/** 一次打开对应的句柄：包裹器用它做程序化关闭 / 销毁 */
export interface MountedRunner {
  /** 走关闭流程（由业务组件或默认动作决定），动作 + 数据语义见 DialogRuntime */
  close: (action: DialogAction | string, data?: unknown) => void
  /** 立即卸载，不等关闭动画 */
  destroy: () => void
}

/** Runner 暴露给挂载引擎的接口 */
interface RunnerExposed {
  close: (action: DialogAction | string, data?: unknown) => void
}

/**
 * 挂载一次弹窗，返回句柄。
 * 关闭动作只会生效一次（Runner 内部有幂等保护），Promise 不会被 resolve 两次。
 */
export function mountRunner(args: MountRunnerArgs): MountedRunner {
  // 非浏览器环境（SSR / 单测无 document）直接跳过
  if (typeof document === 'undefined') {
    return { close: () => undefined, destroy: () => undefined }
  }

  const container = document.createElement('div')
  container.className = 'pro-dialog-container'
  document.body.appendChild(container)

  let runner: RunnerExposed | null = null
  let cleaned = false
  let cleanupTimer: ReturnType<typeof setTimeout> | null = null
  let vnode: VNode | null = null

  /** 卸载组件并移除容器（幂等） */
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    if (cleanupTimer) {
      clearTimeout(cleanupTimer)
      cleanupTimer = null
    }
    const node = vnode
    vnode = null
    if (node) render(null, container)
    container.remove()
    args.onClosed?.()
  }

  const hostProps: Record<string, unknown> = {
    component: args.component,
    params: args.params,
    extraProps: args.extraProps,
    hooks: args.hooks,
    onSettle: (payload: { action: DialogAction | string; data: unknown }) => {
      if (cleanupTimer === null) cleanupTimer = setTimeout(cleanup, 400)
      args.onSettle(payload)
    },
    // Runner 就绪：拿到程序化关闭入口（不用函数 ref —— h() 里不保证生效）
    onReady: (api: RunnerExposed) => {
      runner = api
    },
  }

  // h() 的重载要求 props 精确匹配组件 Props，这里 props 是动态构造的记录；
  // 断言成 never 仅为绕过类型检查，运行时就是普通 props 对象
  vnode = h(Runner, hostProps as never) as VNode
  if (sharedAppContext) vnode.appContext = sharedAppContext
  render(vnode, container)

  return {
    close: (action, data) => {
      runner?.close(action, data)
    },
    destroy: () => {
      cleanup()
    },
  }
}
