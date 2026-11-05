<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 弹窗运行时容器（内部组件，业务不直接使用）
//
// 每次 .open() 由 mountRunner 挂载一份，职责只有一个：
//   ① 把包裹器的运行时上下文（visible / params / close / cancel）注入给业务弹窗组件
//   ② 监听业务组件自己的定义：若组件 defineExpose({ open, close })，优先用组件的
//   ③ 把最终的关闭动作与结果值交回包裹器
//
// 业务组件是完全正常的弹窗组件：自己写 <el-dialog v-model="visible">、
// 自己写按钮、自己写打开/关闭逻辑。
// ─────────────────────────────────────────────────────────────
import { computed, onMounted, provide, ref, watch } from 'vue'
import type { Component } from 'vue'
import { DIALOG_CONTEXT_KEY } from './context'
import type { DialogAction, DialogExposed, DialogRuntime, RunnerHooks } from './types'

const props = defineProps<{
  /** 业务弹窗组件 */
  component: Component
  /** 本次 open 传入的参数 */
  params: Record<string, unknown>
  /** 固定透传的 props */
  extraProps?: Record<string, unknown>
  /** 包裹器配置里的默认动作覆盖 */
  hooks?: RunnerHooks
  /** 关闭动作与结果值（由 mountRunner 包装后交给包裹器） */
  onSettle: (payload: { action: DialogAction; value: unknown }) => void
  /** 运行时就绪：把「程序化关闭」入口交给挂载引擎 */
  onReady?: (api: { close: (result?: unknown) => void }) => void
}>()

const visible = ref(false)
const loading = ref(false)
/** 业务组件实例（用于读取它的 defineExpose 方法） */
const innerRef = ref<unknown>(null)

/** 只允许关闭一次 */
let settled = false
function settle(action: DialogAction, value: unknown = null) {
  if (settled) return
  settled = true
  visible.value = false
  props.onSettle({ action, value })
}

/** 注入给业务弹窗组件的运行时上下文 */
const runtime: DialogRuntime = {
  visible,
  params: props.params,
  // 不传值视为"确定"（结果 true）；传值原样交回
  close: (value?: unknown) => settle('ok', value === undefined ? true : value),
  cancel: () => settle('cancel', null),
  setLoading: (value: boolean) => {
    loading.value = value
  },
}
provide(DIALOG_CONTEXT_KEY, runtime)

/** 业务组件主动关闭（点 X / 遮罩 / 自己把 visible 置 false）也要走 settle */
watch(visible, (next) => {
  if (!next && !settled) settle('close', null)
})

/** 读取业务组件 defineExpose 出来的 open / close */
function exposed(): DialogExposed | null {
  const value = innerRef.value
  if (!value || typeof value !== 'object') return null
  return value as DialogExposed
}

/** 透传给业务组件的 props：固定 props + 本次参数 */
const mergedProps = computed<Record<string, unknown>>(() => ({
  ...(props.extraProps ?? {}),
  ...props.params,
}))

onMounted(() => {
  // 先把程序化关闭入口交给挂载引擎，再执行打开动作
  props.onReady?.({ close: controllerClose })

  const ex = exposed()
  // 覆盖优先级：业务组件 exposed.open > 包裹器配置 open > 默认（visible = true）
  const openAction =
    typeof ex?.open === 'function' ? ex.open : props.hooks?.open
  if (openAction) {
    void openAction.call(ex, props.params, runtime)
    return
  }
  visible.value = true
})

/**
 * 包裹器的 close() 入口。
 * 覆盖优先级：业务组件 exposed.close > 包裹器配置 close > 默认。
 */
function controllerClose(result?: unknown) {
  const ex = exposed()
  if (typeof ex?.close === 'function') {
    ex.close.call(ex, result, runtime)
    return
  }
  if (props.hooks?.close) {
    props.hooks.close(result, runtime)
    return
  }
  // 默认：不传值 = 取消；传值 = 当"确定"回传
  if (result === undefined) runtime.cancel()
  else runtime.close(result)
}

defineExpose({
  /** 给包裹器用的关闭入口 */
  close: controllerClose,
  /** 供包裹器读取按钮 loading（内置表单/确认框用） */
  isLoading: loading,
})
</script>

<template>
  <component :is="component" ref="innerRef" v-bind="mergedProps" />
</template>
