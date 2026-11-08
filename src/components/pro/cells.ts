// ─────────────────────────────────────────────────────────────
// 配置式表格 columns[].render 的公共 VNode 构造器
//
// 列表页里的多行/省略单元格不再各页手写 h() 散装结构：
// 类名（.cell-sub / .ellipsis）是主题包全局公共类，这里统一组装口径，
// 咨询 / 订单 / 退款等列表页 import 即用，观感自动一致。
// ─────────────────────────────────────────────────────────────
import { h, type VNode } from 'vue'

/**
 * 双行单元格：主行 + 灰色副行（原型 .cell-sub 结构）。
 * ellipsis=true 时主行也压缩省略（用户名列等两行都可能变长的场景），
 * 完整值放 title 悬浮提示（原型同款）。
 */
export function twoLineCell(main: string, sub: string, ellipsis = false): VNode {
  return h('div', {}, [
    h(
      'div',
      { class: ellipsis ? 'ellipsis' : undefined, title: ellipsis ? main : undefined },
      main || '—',
    ),
    h('div', { class: 'cell-sub ellipsis', title: sub }, sub || '—'),
  ])
}
