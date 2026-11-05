// ─────────────────────────────────────────────────────────────
// 命令式弹窗核心：openDialog
//
// 实现方式：
//   - 每次调用创建一个容器 div 挂到 body，用 render() 挂载 DialogHost 组件
//   - 弹窗关闭时 DialogHost emit finish（带 action 与结果值），这里 resolve Promise
//   - 关闭动画播完（@closed）再卸载组件并移除容器；另有 400ms 兜底定时器
//   - 传了 appContext 时把全局 app 上下文挂到 vnode，弹窗内的内容组件可用全局注册的组件
//
// 层级：不指定 zIndex 时不干预，交给 Element Plus 全局递增的 z-index 计数器，
//       这样嵌套弹窗、弹窗内的下拉框（select / date-picker 的浮层）层级都自动正确。
// ─────────────────────────────────────────────────────────────
import { h, render } from 'vue'
import type { AppContext, VNode } from 'vue'
import DialogHost from './DialogHost.vue'
import type { DialogAction, DialogOptions } from './types'

/** 全局 app 上下文：由 main.ts 注入，供弹窗内的内容组件使用全局注册的组件/指令 */
let sharedAppContext: AppContext | null = null

export function setDialogAppContext(context: AppContext | null): void {
  sharedAppContext = context
}

/**
 * 打开弹窗（命令式），返回 Promise：
 *   - 确定（或内容组件调 dialog.close 传值）→ resolve 结果
 *   - 取消 / 右上角关闭 / 遮罩 / ESC → resolve null
 * 同时支持回调风格（onOk / onCancel / onClose），两种写法都会触发。
 */
export function openDialog<T = unknown>(options: DialogOptions<T>): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    // 非浏览器环境直接返回，避免 SSR / 单测无 document 时报错
    if (typeof document === 'undefined') {
      resolve(null)
      return
    }

    const container = document.createElement('div')
    container.className = 'pro-dialog-container'
    document.body.appendChild(container)

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
    }

    /** 关闭后延迟卸载：先让关闭动画播完，400ms 兜底防止 @closed 未触发 */
    const scheduleCleanup = () => {
      cleanupTimer = setTimeout(cleanup, 400)
    }

    /** DialogHost 关闭时回调：统一出口 */
    const finish = (payload: { action: DialogAction; value: unknown }) => {
      if (settled) return
      settled = true

      const isOk = payload.action === 'ok'
      const value = (isOk ? payload.value : null) as T | null

      scheduleCleanup()

      // 回调风格（与 Promise 并存）：回调里抛错不影响 Promise 结果，只打日志
      try {
        if (isOk) options.onOk?.(payload.value)
        else if (payload.action === 'cancel') options.onCancel?.()
        else (options.onClose ?? options.onCancel)?.()
      } catch (error) {
        console.error('[ProDialog] 关闭回调执行出错', error)
      }

      resolve(value)
    }

    const hostProps: Record<string, unknown> = {
      options,
      onFinish: finish,
      onClosed: cleanup,
    }

    // h() 的重载要求 props 精确匹配组件 Props，这里 props 是动态构造的记录；
    // 断言成 never 仅为绕过类型检查，运行时就是普通 props 对象
    vnode = h(DialogHost, hostProps as never)
    if (sharedAppContext) vnode.appContext = sharedAppContext
    render(vnode, container)
  })
}
