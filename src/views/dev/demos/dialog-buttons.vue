<script setup lang="ts">
// 弹窗 · 按钮内聚在组件 + 组件重写包裹器方法 + Props 三层默认
//
// 核心原则：按钮一律写在弹窗组件内部，open() 只传数据、不传按钮写法。
//   ① 包裹器（useDialog）只提供方法：visible / confirm / cancel / close
//   ② 按钮有几个、叫什么、点了调哪个方法，全在弹窗组件的模板里决定
//   ③ 组件还能 defineExpose({ open, close }) 重写包裹器的默认打开 / 关闭方法
//   ④ 入参走标准 defineProps，三层默认：组件 withDefaults ＜ options.props ＜ open() 入参
import { ref } from 'vue'
import { ElMessage, ElTag } from 'element-plus'
import { DialogAction, confirmDialog, wrapDialog } from '@/components/pro'
import type { DialogResult } from '@/components/pro'
import { messageDialog } from '../dialogs/message.dialog'
import MessageDialog from '../dialogs/MessageDialog.vue'
import type { MessageDialogParams } from '../dialogs/message.dialog'
import { tripleConfirmDialog } from '../dialogs/triple-confirm.dialog'
import { ApproveAction, approveDialog } from '../dialogs/approve.dialog'
import { overrideDialog } from '../dialogs/override.dialog'
import DemoBlock from '../components/DemoBlock.vue'

const lastResult = ref('（还没有操作）')

/** DialogAction 中文语义（演示显示用） */
const ACTION_LABEL: Record<string, string> = {
  [DialogAction.Confirm]: '确认',
  [DialogAction.Cancel]: '取消',
  [DialogAction.Close]: '关闭（X / ESC / 遮罩 / 稍后处理）',
  [DialogAction.Timeout]: '超时自关',
  [DialogAction.Replace]: '被新的 open 顶掉',
  [DialogAction.Destroy]: '已销毁',
  [ApproveAction.Reject]: '业务动作·驳回',
  [ApproveAction.Transfer]: '业务动作·转审',
}

// 用 any 容纳「内置动作 + 业务自定义动作（ApproveAction）」两类结果
function record(label: string, result: DialogResult<any, any>) {
  const action = `${result.action}（${ACTION_LABEL[result.action] ?? '业务自定义动作'}）`
  const data = result.data === null ? 'null' : JSON.stringify(result.data)
  lastResult.value = `${label} → action: ${action}，data: ${data}`
}

// ── ① 内置确认框：通用「取消 / 确定」按钮，组件自带、无需自己写 ──────────
async function builtinConfirm() {
  const result = await confirmDialog.open({
    title: '内置确认框',
    content: '这两个按钮是 ConfirmDialog 组件内部写好的，open() 只传了内容数据。',
    type: 'info',
  })
  record('内置确认框', result)
}

// ── ② 自建三按钮组件：按钮内聚，三种关闭方式各走一个包裹器方法 ──────────
async function tripleButtons() {
  const result = await tripleConfirmDialog.open({
    content: '「稍后处理 / 取消 / 知道了」三个按钮都写在 TripleConfirmDialog.vue 里。',
  })
  record('三按钮确认框（自建组件）', result)
}

// ── ③ 自建审批组件：业务枚举动作也在组件里，调用方只按结果分支 ──────────
async function approveButtons() {
  const result = await approveDialog.open({
    content: '驳回 / 转审 / 通过三个按钮内聚在 ApproveDialog.vue；驳回转审以业务枚举动作关闭。',
  })
  if (result.action === ApproveAction.Reject) {
    ElMessage.error(`已驳回：${result.data}`)
  } else if (result.action === ApproveAction.Transfer) {
    ElMessage.warning(`已转审：${result.data}`)
  }
  record('审批弹窗（业务枚举动作）', result)
}

// ── ④ 组件重写包裹器方法：defineExpose({ open, close }) ────────────────
async function overrideMethods() {
  // OverrideDialog 自己实现了 open / close，包裹器调用时优先走组件的方法
  const result = await overrideDialog.open({ title: '组件重写了打开 / 关闭方法' })
  record('组件重写方法', result)
}

// ── ⑤ Props 三层默认 ───────────────────────────────────────────────────
// 不带 options.props 的包裹器：open 不传参时只能吃到组件 withDefaults 的默认值
const bareMessageDialog = wrapDialog<MessageDialogParams, boolean>(MessageDialog, {
  name: 'bare-message',
})

async function layerComponentDefault() {
  // 什么都不传：title 取组件 withDefaults 的「提示」，okText 取「知道了」
  const result = await bareMessageDialog.open({ content: '只传必填的 content，其余走组件默认值。' })
  record('第一层：组件 withDefaults 默认', result)
}

async function layerWrapProps() {
  // messageDialog 在 wrapDialog options.props 里配了 title 默认值，优先级高于组件默认
  const result = await messageDialog.open({ content: '没传 title，吃到 options.props 的默认标题。' })
  record('第二层：wrapDialog options.props', result)
}

async function layerOpenParams() {
  // open 入参优先级最高，覆盖前两层
  const result = await messageDialog.open({
    title: 'open 入参标题（最高优先级）',
    okText: '我改了按钮文字',
    content: 'title 和 okText 都被 open 入参覆盖。',
  })
  record('第三层：open() 入参', result)
}

const code = `// ① 自建弹窗组件：按钮写在模板里，点击只调 useDialog() 给的方法
// TripleConfirmDialog.vue
const { visible, confirm, cancel, close } = useDialog<TripleConfirmParams, boolean>()
<el-button @click="close(DialogAction.Close, note)">稍后处理</el-button>
<el-button @click="cancel">取消</el-button>
<el-button type="primary" @click="confirm(true)">知道了</el-button>

// ② 业务自定义动作：useDialog 第三泛型传业务枚举，按钮里 close(枚举, 数据)
// ApproveDialog.vue
const { visible, confirm, close } = useDialog<Params, ApproveData, ApproveAction>()
<el-button type="danger" @click="close(ApproveAction.Reject, '资料不全')">驳回</el-button>
<el-button @click="close(ApproveAction.Transfer, '转张三复核')">转审</el-button>
<el-button type="primary" @click="confirm(true)">通过</el-button>

// ③ 平行位置 .dialog.ts 用 wrapDialog 包起来，open() 只传数据、不传按钮
export const approveDialog = wrapDialog<Params, Data, ApproveAction>(ApproveDialog, { name: 'approve' })
const result = await approveDialog.open({ content: '…' })
if (result.action === ApproveAction.Reject) { /* 按枚举分支 */ }

// ④ 组件重写包裹器的默认打开 / 关闭方法：defineExpose
function open(params) { /* 自己的打开逻辑 */ visible.value = true }
function close(action, data) { /* 自己的关闭逻辑 */ settle(action, data) }
defineExpose({ open, close })   // 优先级：组件 > wrapDialog options > 默认

// ⑤ Props 三层默认：组件 withDefaults ＜ wrapDialog { props } ＜ open() 入参
const d = wrapDialog<P, R>(MessageDialog, { name: 'm', props: { title: '中间层默认' } })
d.open()                       // 组件默认 / options.props 兜底
d.open({ title: '最高优先' })   // open 入参覆盖一切
`
</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="按钮内聚在弹窗组件（open 只传数据，不传按钮）"
      desc="包裹器 useDialog 只提供 confirm / cancel / close 方法；按钮数量、文字、布局全部写在弹窗组件模板里"
      :code="code"
    >
      <div class="demo-actions">
        <el-button @click="builtinConfirm">内置确认框（通用两按钮）</el-button>
        <el-button type="primary" @click="tripleButtons">自建三按钮组件</el-button>
        <el-button type="warning" plain @click="approveButtons">自建审批组件（业务枚举）</el-button>
      </div>
    </DemoBlock>

    <DemoBlock
      title="弹窗组件重写包裹器的方法"
      desc="组件 defineExpose({ open, close }) 后，包裹器优先调用组件自己的方法；包裹器只负责提供默认实现与运行时能力"
    >
      <div class="demo-actions">
        <el-button type="success" plain @click="overrideMethods">组件重写 open / close</el-button>
      </div>
      <div class="layer-note">
        <ElTag size="small">优先级</ElTag>
        <span>组件 <code>defineExpose</code> 方法 ＞ <code>wrapDialog</code> 的 <code>options.open/close</code> ＞ 包裹器默认动作</span>
      </div>
    </DemoBlock>

    <DemoBlock
      title="Props 三层默认值"
      desc="组件 withDefaults 默认 ＜ wrapDialog options.props ＜ open() 入参；组件统一用 defineProps 接收"
    >
      <div class="demo-actions">
        <el-button @click="layerComponentDefault">第一层：组件默认（无 options.props）</el-button>
        <el-button @click="layerWrapProps">第二层：options.props 默认标题</el-button>
        <el-button type="primary" @click="layerOpenParams">第三层：open 入参覆盖</el-button>
      </div>
      <div class="layer-note">
        <ElTag size="small">优先级</ElTag>
        <span>组件 <code>withDefaults</code> 最低 → 包裹器 <code>options.props</code> 居中 → <code>open()</code> 入参最高</span>
      </div>
    </DemoBlock>

    <div class="demo-result">
      <div class="demo-result-title">最近一次结果（动作 + 数据，判断只看 action）</div>
      <pre class="demo-block-code">{{ lastResult }}</pre>
    </div>
  </div>
</template>

<style scoped>
.demo-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.layer-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.layer-note code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--app-fill-light, rgba(0, 0, 0, 0.05));
}

.demo-result {
  margin-top: 16px;
}

.demo-result-title {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--app-text-secondary);
}
</style>
