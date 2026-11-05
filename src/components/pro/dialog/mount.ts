// ─────────────────────────────────────────────────────────────
// 弹窗宿主挂载引擎（内部模块，业务不直接调用）
//
// 每个包裹器实例每次 open 都走一遍这里：
//   - 新建一个容器 div 挂到 body，用 render() 挂载 DialogHost
//   - DialogHost 关闭时回调 finish（带 action 与结果值），由 wrapper 去 resolve Promise
//   - 关闭动画播完（@closed）再卸载组件并移除容器；另有 400ms 兜底定时器
//   - 把宿主暴露的 api（程序化关闭）交回 wrapper，实现 wrapper.close() / destroy()
//
// 层级：不指定 zIndex 时不干预，交给 Element Plus 全局递增的 z-index 计数器，
//       嵌套弹窗、弹窗内下拉框的浮层层级都自动正确。
// ─────────────────────────────────────────────────────────────
import { h, render } from 'vue'
import type { AppContext, VNode } from 'vue'
import DialogHost from './DialogHost.vue'
import type { DialogAction, DialogHostApi, DialogHostOptions } from './types'

/** 全局 app 上下文：由 main.ts 注入，供弹窗内容组件使用全局注册的组件/指令 */
let sharedAppContext: AppContext | null = null

export function setDialogAppContext(context: AppContext | null): void {
  sharedAppContext = context
}

export interface MountDialogArgs {
  /** 已解析成具体值的弹窗配置 */
  options: DialogHostOptions
  /** 本次 open 的参数（组件 props / 表单初始值） */
  params: Record<string, unknown>
  /** 主流程结束（wrapper 在这里 resolve Promise、触发回调） */
  onFinish: (payload: { action: DialogAction; value: unknown }) => void
  /** 宿主控制能力就绪（可选） */
  onReady?: (api: DialogHostApi) => void
  /** DOM 卸载完成（可选） */
  onClosed?: () => void
}

/** 一次打开对应的句柄：wrapper 用它做程序化关闭 / 销毁 */
export interface MountedDialog {
  /** 走关闭流程（播动画），由 DialogHost 统一 settle */
  close: (action: DialogAction, value?: unknown) => void
  /** 立即卸载，不等动画（强制重置场景） */
  destroy: () => void
}

/**
 * 挂载一次弹窗，返回句柄。
 * 关闭动作只会生效一次（settle 有幂等保护），Promise 不会被 resolve 两次。
 */
export function mountDialog(args: MountDialogArgs): MountedDialog {
  const noop: MountedDialog = { close: () => undefined, destroy: () => undefined }
  // 非浏览器环境（SSR / 单测无 document）直接跳过，避免报错
  if (typeof document === 'undefined') return noop

  const container = document.createElement('div')
  container.className = 'pro-dialog-container'
  document.body.appendChild(container)

  let api: DialogHostApi | null = null
  let settled = false
  let cleaned = false
  let vnode: VNode | null = null
  let cleanupTimer: ReturnType<typeof setTimeout> | null = null

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

  /** 关闭后延迟卸载：先让关闭动画播完，400ms 兜底防止 @closed 未触发 */
  const scheduleCleanup = () => {
    cleanupTimer = setTimeout(cleanup, 400)
  }

  /** 主流程结束：只生效一次 */
  const settle = (action: DialogAction, value: unknown = null) => {
    if (settled) return
    settled = true
    scheduleCleanup()
    args.onFinish({ action, value })
  }

  const handleFinish = (payload: { action: DialogAction; value: unknown }) => {
    settle(payload.action, payload.value)
  }

  const handleReady = (hostApi: DialogHostApi) => {
    api = hostApi
    args.onReady?.(hostApi)
  }

  const hostProps: Record<string, unknown> = {
    options: args.options,
    params: args.params,
    onFinish: handleFinish,
    onClosed: cleanup,
    onReady: handleReady,
  }

  // h() 的重载要求 props 精确匹配组件 Props，这里 props 是动态构造的记录；
  // 断言成 never 仅为绕过类型检查，运行时就是普通 props 对象
  vnode = h(DialogHost, hostProps as never) as VNode
  if (sharedAppContext) vnode.appContext = sharedAppContext
  render(vnode, container)

  return {
    close: (action, value) => {
      if (api) api.close(action, value)
      else settle(action, value)
    },
    destroy: () => {
      settle('cancel', null)
      cleanup()
    },
  }
}
