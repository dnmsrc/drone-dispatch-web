// ─────────────────────────────────────────────────────────────
// ProCell · 单元格渲染壳（极小）
//
// 为什么需要它：
//   Vue 模板里不能直接把「函数返回值」当内容渲染（<template>{{ fn() }}</template>
//   只会把函数当文本处理），而 TableColumn.render 返回的是 VNodeChild（VNode /
//   字符串 / 数组）。所以用一个 1 行的 defineComponent 把 render(ctx) 的返回值
//   作为组件自身的 render 输出，模板里写 <ProCell :render="col.render" :ctx="..." /> 即可。
// ─────────────────────────────────────────────────────────────
import { defineComponent, type PropType, type VNodeChild } from 'vue'
import type { CellContext } from './types'

export default defineComponent({
  name: 'ProCell',
  props: {
    /**
     * 列配置里的自定义渲染函数。
     * 声明为可选：调用方（ProTable）拿到的是 TableColumn['render']（可能为 undefined），
     * 由 v-if 保证有值再渲染，这里保持宽松以免类型断言。
     */
    render: {
      type: Function as PropType<(ctx: CellContext) => VNodeChild>,
    },
    /** 单元格上下文：{ row, column, value, index } */
    ctx: {
      type: Object as PropType<CellContext>,
      required: true,
    },
  },
  setup(props) {
    // 直接返回 render(ctx) 的结果，VNode / 字符串 / 片段数组都能被 Vue 正常渲染
    return () => props.render?.(props.ctx)
  },
})
