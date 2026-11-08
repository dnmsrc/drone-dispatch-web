<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 弹窗运行时容器（内部组件，业务不直接使用）
//
// 每次 .open() 由 mountRunner 挂载一份，职责只有一个：
//   ① 把包裹器的运行时上下文（visible / params / confirm / cancel / close）注入给业务弹窗组件
//   ② 监听业务组件自己的定义：若组件 defineExpose({ open, close })，优先用组件的
//   ③ 把最终的「关闭动作 + 业务数据」交回包裹器
//   ④ 用 <component :is> 渲染业务弹窗组件，props = options.props 默认层 + 本次 open 入参
//
// 业务组件是完全正常的弹窗组件：自己写 <el-dialog v-model="visible">、
// 自己写按钮、自己写打开/关闭逻辑。按钮长什么样完全由业务组件决定，
// 包裹器与 Runner 都不参与 —— 这里也不透传任何外部插槽。
// ─────────────────────────────────────────────────────────────
import { computed, onMounted, provide, ref, watch } from 'vue'
import type { Component, PropType } from 'vue'
import { DIALOG_CONTEXT_KEY } from './context'
import { DialogAction } from './types'
import type { DialogExposed, DialogRuntime, RunnerHooks } from './types'

const props = defineProps({
  /** 业务弹窗组件 */
  component: { type: Object as PropType<Component>, required: true },
  /** 本次 open 传入的参数 */
  params: { type: Object as PropType<Record<string, unknown>>, required: true },
  /** 固定透传的 props（wrapDialog options.props，默认值层） */
  extraProps: { type: Object as PropType<Record<string, unknown>>, default: undefined },
  /** 包裹器配置里的默认动作覆盖 */
  hooks: { type: Object as PropType<RunnerHooks>, default: undefined },
  /** 关闭动作与业务数据（由 mountRunner 包装后交给包裹器） */
  onSettle: {
    type: Function as PropType<(payload: { action: DialogAction | string; data: unknown }) => void>,
    required: true,
  },
  /** 运行时就绪：把「程序化关闭」入口交给挂载引擎 */
  onReady: {
    type: Function as PropType<
      (api: { close: (action: DialogAction | string, data?: unknown) => void }) => void
    >,
    default: undefined,
  },
})

const visible = ref(false)
/** 业务组件实例（用于读取它的 defineExpose 方法） */
const innerRef = ref<unknown>(null)

/** 只允许关闭一次 */
let settled = false

/**
 * 以指定动作关闭弹窗，并把「动作 + 数据」交回调用方。
 * @param action 关闭动作（DialogAction 内置语义，或业务自定义动作）
 * @param data 业务数据，只有 Confirm（或业务自定义动作）才有值
 */
function settle(action: DialogAction | string, data: unknown = null) {
  if (settled) return
  settled = true
  visible.value = false
  props.onSettle({ action, data })
}

/** 注入给业务弹窗组件的运行时上下文：包裹器只提供「方法」，不提供按钮写法 */
const runtime: DialogRuntime<Record<string, unknown>, unknown, string> = {
  visible,
  params: props.params,
  // 确认：带着业务数据关闭
  confirm: (data: unknown) => settle(DialogAction.Confirm, data === undefined ? null : data),
  // 取消：用户点了取消按钮
  cancel: () => settle(DialogAction.Cancel, null),
  // 显式动作：弹窗自己决定关闭原因（超时 / 业务自定义动作…）
  close: (action: DialogAction | string, data?: unknown) =>
    settle(action, data === undefined ? null : data),
}
provide(DIALOG_CONTEXT_KEY, runtime)

/** 业务组件主动关闭（点 X / 遮罩 / ESC / 自己把 visible 置 false）也要走 settle */
watch(visible, (next) => {
  // 组件没有先调 confirm / cancel / close，只是把 visible 关了：
  // 说明用户点的是 X / 遮罩 / ESC —— 动作是 Close（没做任何决定）
  if (!next && !settled) settle(DialogAction.Close, null)
})

/** 读取业务组件 defineExpose 出来的 open / close */
function exposed(): DialogExposed<Record<string, unknown>, unknown, string> | null {
  const value = innerRef.value
  if (!value || typeof value !== 'object') return null
  return value as DialogExposed<Record<string, unknown>, unknown, string>
}

/** 透传给业务组件的 props：固定 props（默认层）+ 本次参数（高优先级） */
const mergedProps = computed<Record<string, unknown>>(() => ({
  ...(props.extraProps ?? {}),
  ...(props.params ?? {}),
}))

/**
 * 包裹器内部句柄的关闭入口（重复 open、调试销毁时用）。
 * 覆盖优先级：业务组件 exposed.close > 包裹器配置 close > 默认。
 */
function controllerClose(action: DialogAction | string, data?: unknown) {
  const ex = exposed()
  if (typeof ex?.close === 'function') {
    ex.close.call(ex, action, (data ?? null) as Record<string, unknown> | null, runtime)
    return
  }
  if (props.hooks?.close) {
    props.hooks.close(action, data ?? null, runtime)
    return
  }
  runtime.close(action, data ?? null)
}

defineExpose({
  /** 给包裹器用的关闭入口 */
  close: controllerClose,
})

onMounted(() => {
  // 先把程序化关闭入口交给挂载引擎，再执行打开动作
  props.onReady?.({ close: controllerClose })

  const ex = exposed()
  // 覆盖优先级：业务组件 exposed.open > 包裹器配置 open > 默认（visible = true）
  const openAction = typeof ex?.open === 'function' ? ex.open : props.hooks?.open
  if (openAction) {
    void openAction.call(ex, props.params, runtime)
    return
  }
  visible.value = true
})
</script>

<template>
  <!-- 业务弹窗组件：按钮、布局全部内聚在它自己内部，Runner 只负责挂载与注入上下文 -->
  <component :is="component" ref="innerRef" v-bind="mergedProps" />
</template>
