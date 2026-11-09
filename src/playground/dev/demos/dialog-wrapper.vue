<script setup lang="ts">
// 弹窗 · 架构与职责：业务组件 + 平行 ts 配置文件，业务只 await「动作 + 数据」
//
// 关闭动作是 DialogAction 枚举（确认 / 取消 / 关闭 / 超时 / 被顶掉 / 销毁），
// 业务还可以定义自己的动作（本例的「稍后提醒」）。判断结果一律用 action。
import { computed, ref } from 'vue'
import { DialogAction, getDialogHandle } from '@/components/pro'
import {
  CONTROLLED_AUTO_VALUE,
  CONTROLLED_LATER_VALUE,
  CONTROLLED_OK_VALUE,
  ControlledAction,
  controlledDialog,
} from '../dialogs/controlled.dialog'
import { overrideDialog } from '../dialogs/override.dialog'
import DemoBlock from '../components/DemoBlock.vue'

/** 最近一次调用（按钮触发的动作） */
const lastCall = ref('（还没有调用）')
/** 最近一次 Promise / 回调的结果 */
const lastPromise = ref('（还没有结果）')
/** 覆盖动作演示的结果 */
const overrideResult = ref('（还没有操作）')

/** DialogAction 的中文语义（演示页显示用；业务里直接用枚举值判断即可） */
const ACTION_LABEL: Record<string, string> = {
  [DialogAction.Confirm]: '确认',
  [DialogAction.Cancel]: '取消',
  [DialogAction.Close]: '关闭（X / ESC / 遮罩）',
  [DialogAction.Timeout]: '超时自关',
  [DialogAction.Replace]: '被新的 open 顶掉',
  [DialogAction.Destroy]: '已销毁',
}

/** 把「动作 + 数据」格式化成一行 */
function formatResult(action: string, data: unknown) {
  const label = ACTION_LABEL[action] ?? '业务自定义动作'
  const value = data === null ? 'null' : `「${String(data)}」`
  return `action: ${action}（${label}），data: ${value}`
}

/** open 并 await：业务代码的标准写法（用 action 判断结果） */
async function openIt() {
  lastCall.value = 'await controlledDialog.open({ content: … })'
  const result = await controlledDialog.open({
    content: '打开后，关闭（确定/取消/X）都由弹窗自己做，调用方只等结果。',
  })
  lastPromise.value = formatResult(result.action, result.data)
}

/** 业务自定义动作：组件里点「稍后提醒」，回传的是业务枚举 + 数据 */
async function openRemindLater() {
  lastCall.value =
    'await controlledDialog.open(…) → 组件里 close(ControlledAction.RemindLater, 时间)'
  const result = await controlledDialog.open({
    content: '这次点底部「稍后提醒」：关闭动作是业务定义的 RemindLater，不是确认也不是取消。',
  })
  if (result.action === ControlledAction.RemindLater) {
    lastPromise.value = `${formatResult(result.action, result.data)} ← 调用方按业务动作分支处理`
    return
  }
  lastPromise.value = `${formatResult(result.action, result.data)}（这次没有走「稍后提醒」）`
}

/** 回调风格：onResult 拿完整结果，也可按动作拆成 onConfirm / onCancel / onClose / onTimeout */
async function openWithCallback() {
  lastCall.value = 'controlledDialog.open(params, { onResult, onConfirm, onCancel, onClose })'
  await controlledDialog.open(
    {
      content: '这次用回调写法：onResult 拿到完整结果，onConfirm / onCancel / onClose 按动作拆开。',
    },
    {
      onResult: (result) => {
        lastPromise.value = `onResult → ${formatResult(result.action, result.data)}`
      },
      onCancel: () => {
        lastPromise.value += '（同时触发了 onCancel）'
      },
      onClose: () => {
        lastPromise.value += '（同时触发了 onClose）'
      },
    },
  )
}

/** 弹窗自己倒计时关闭：调用方只是多传一个参数，仍然只 await 结果 */
async function openAutoClose() {
  lastCall.value = 'await controlledDialog.open({ autoClose: 3 })'
  const result = await controlledDialog.open({
    content: '这个弹窗会在 3 秒后由它自己关闭，调用方没有参与关闭。',
    autoClose: 3,
  })
  lastPromise.value = formatResult(result.action, result.data)
}

/** 覆盖默认动作：组件自己 defineExpose({ open, close }) */
async function overrideActions() {
  const result = await overrideDialog.open({
    title: '覆盖默认动作的弹窗',
    content: '看提示消息：打开、关闭都走组件里自己写的方法。',
  })
  overrideResult.value = formatResult(result.action, result.data)
}

// ── 下面只是「包裹器内部能力」的调试演示，业务代码不要这样写 ──
/** 内部句柄：只有调试 / 测试才需要拿它 */
const handle = getDialogHandle(controlledDialog)
const internalOpen = computed(() => handle.isOpen)

function handleClose() {
  const closed = handle.close()
  lastCall.value = closed
    ? 'handle.close() → true（内部能力，默认按取消结束；业务代码不用）'
    : 'handle.close() → false（当前没有打开的弹窗）'
}

function handleDestroy() {
  const destroyed = handle.destroy()
  lastCall.value = destroyed
    ? 'handle.destroy() → true（内部能力，业务代码不用）'
    : 'handle.destroy() → false（当前没有打开的弹窗）'
}

const configCode = `// ① 业务弹窗组件：src/views/order/OrderDialog.vue —— 正常写弹窗
const { visible, params, confirm, cancel } = useDialog<OrderParams, Order>()

<el-dialog v-model="visible" title="订单" width="640px">
  <el-input v-model="form.owner" />
  <template #footer>
    <el-button @click="cancel">取消</el-button>
    <el-button @click="confirm(form)">确定</el-button>
  </template>
</el-dialog>

// ② 平行位置的 ts：src/views/order/OrderDialog.dialog.ts —— 包裹器包起来
import { wrapDialog } from '@/components/pro'
import OrderDialog from './OrderDialog.vue'

export const orderDialog = wrapDialog<OrderParams, Order>(OrderDialog, {
  name: 'order',            // 包裹器名字（日志 / 调试用）
})

// ③ 业务里：只认这个 ts 文件，只调 open()，用 action 判断结果
import { DialogAction } from '@/components/pro'
import { orderDialog } from '@/views/order/OrderDialog.dialog'

const result = await orderDialog.open({ id: 1 })
if (result.action !== DialogAction.Confirm) return   // 取消 / X / 超时都在这
use(result.data)`

const usageCode = `// 业务侧只做一件事：await open()，拿到「动作枚举 + 数据」
const result = await controlledDialog.open({ content: '…' })

// DialogAction 内置语义（全部是明确的枚举成员，不用猜 null 的含义）
switch (result.action) {
  case DialogAction.Confirm: save(result.data); break   // 确认（data 收回来的值）
  case DialogAction.Cancel:  break                       // 点了取消按钮
  case DialogAction.Close:   break                       // 点 X / ESC / 遮罩
  case DialogAction.Timeout: break                       // 弹窗自己倒计时关的
  case DialogAction.Replace: break                       // 被新的 open 顶掉
  default:                   break                       // 业务自定义动作
}

// 业务自定义动作：在自己的平行 ts 里定义枚举，组件里 close(动作, 数据)
export enum ControlledAction { RemindLater = 'remind-later' }
close(ControlledAction.RemindLater, '明天 09:00')
if (result.action === ControlledAction.RemindLater) remindLater(result.data)

// 回调风格：onResult 拿完整结果；也可按动作拆成 onConfirm / onCancel / onClose / onTimeout
controlledDialog.open({ content: '…' }, {
  onConfirm: (data) => { … },
  onCancel: () => { … },
  onClose: () => { … },
})

// 没有 close() / destroy() —— 打开、关闭、销毁都是弹窗自己的事，
// 业务代码不关心弹窗的生命周期`

const overrideCode = `// 业务组件里自己定义打开 / 关闭动作（覆盖默认动作）
function open(p) {
  visible.value = true       // 最后一定要自己显示
}
function close(action, data) {
  if (action === DialogAction.Confirm) return settle(DialogAction.Confirm, data)
  if (action === DialogAction.Cancel) return cancel()
  settle(action, data)       // 其它动作原样交回
}
defineExpose({ open, close })  // ← 暴露后包裹器优先调它

// 优先级：组件 defineExpose > wrapDialog 的 options.open/close > 包裹器默认动作`

const internalCode = `// 仅框架 / 调试使用：包裹器内部句柄（业务代码不要这样写）
import { getDialogHandle } from '@/components/pro'
const handle = getDialogHandle(controlledDialog)

handle.isOpen                             // 有没有打开中的实例（响应式）
handle.close()                            // 关闭 → 动作 = Cancel，结果 { action, data: null }
handle.close(DialogAction.Confirm, '值')  // 关闭 → 动作 = Confirm + 数据
handle.destroy()                          // 立即销毁（调用方收到 action = Destroy）

// 这些能力由包裹器自己在"重复 open 时销毁旧实例"等场景使用；
// 业务侧的正常路径只有 await open()。`
</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="① 架构：业务组件 + 平行位置的 ts 配置文件"
      desc="组件正常写（自己写 el-dialog、自己管 visible、自己决定何时关）；旁边一个 ts 用包裹器包成句柄"
      :code="configCode"
    >
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          <div class="wrapper-arch">
            <p>
              <b>业务弹窗组件</b>：完全正常的 Vue 组件，自己写
              <code>&lt;el-dialog&gt;</code>、自己写按钮和关闭逻辑。
            </p>
            <p><b>平行位置的 ts</b>：用 <code>wrapDialog(组件, { name })</code> 包成句柄并导出。</p>
            <p>
              <b>业务代码</b>：只 import 这个 ts，<code>await .open()</code> 拿到
              <code>{ action, data }</code>；打开、关闭、销毁都不归它管。
            </p>
            <p>
              包裹器负责挂载到 body、注入
              visible/params、收集结果；弹窗自己负责什么时候显示、什么时候关。
            </p>
          </div>
        </template>
      </el-alert>
    </DemoBlock>

    <DemoBlock
      title="② 业务代码只 await 结果：动作是枚举"
      desc="DialogAction 明确标识「确认 / 取消 / 关闭 / 超时」；业务还能定义自己的动作"
      :code="usageCode"
    >
      <div class="demo-actions">
        <el-button type="primary" @click="openIt">await open() 打开</el-button>
        <el-button type="success" plain @click="openRemindLater"
          >业务自定义动作（稍后提醒）</el-button
        >
        <el-button @click="openWithCallback">open() + 回调</el-button>
        <el-button type="warning" plain @click="openAutoClose"> 弹窗自己 3 秒后关闭 </el-button>
      </div>

      <div class="demo-result">
        <div class="demo-result-row">
          <span class="demo-result-title">最近一次调用</span>
          <pre class="demo-block-code">{{ lastCall }}</pre>
        </div>
        <div class="demo-result-row">
          <span class="demo-result-title">结果（动作 + 数据）</span>
          <pre class="demo-block-code">{{ lastPromise }}</pre>
        </div>
      </div>
    </DemoBlock>

    <DemoBlock
      title="③ 组件覆盖默认的打开 / 关闭"
      desc="组件 defineExpose({ open, close }) 后，包裹器优先调用组件自己的方法（close 收「动作 + 数据」）"
      :code="overrideCode"
    >
      <div class="demo-actions">
        <el-button type="primary" @click="overrideActions">打开（动作由组件自己实现）</el-button>
      </div>
      <div class="demo-result">
        <div class="demo-result-row">
          <span class="demo-result-title">open() 返回值</span>
          <pre class="demo-block-code">{{ overrideResult }}</pre>
        </div>
      </div>
    </DemoBlock>

    <DemoBlock
      title="④ 内部句柄（仅调试，业务代码不要用）"
      desc="包裹器自己用的机制层能力；正常业务路径只有 await open()"
      :code="internalCode"
    >
      <el-alert type="warning" :closable="false" show-icon>
        <template #title>
          <div class="wrapper-arch">
            <p>
              区块里的三个按钮走的是 <code>getDialogHandle()</code>，不属于业务 API ——
              业务代码不应该控制弹窗的关闭和销毁。
            </p>
          </div>
        </template>
      </el-alert>

      <div class="demo-actions" style="margin-top: 12px">
        <el-button @click="openIt">先打开（await）</el-button>
        <el-button :disabled="!internalOpen" @click="handleClose">handle.close()</el-button>
        <el-button type="danger" plain :disabled="!internalOpen" @click="handleDestroy">
          handle.destroy()
        </el-button>
        <el-tag :type="internalOpen ? 'success' : 'info'" size="small">
          handle.isOpen = {{ internalOpen }}
        </el-tag>
      </div>

      <div class="demo-result">
        <div class="demo-result-row">
          <span class="demo-result-title">最近一次调用</span>
          <pre class="demo-block-code">{{ lastCall }}</pre>
        </div>
        <div class="demo-result-row">
          <span class="demo-result-title">结果</span>
          <pre class="demo-block-code">{{ lastPromise }}</pre>
        </div>
      </div>

      <div class="demo-state">
        <el-tag type="info" size="small">确定回传「{{ CONTROLLED_OK_VALUE }}」</el-tag>
        <el-tag type="info" size="small">稍后提醒回传「{{ CONTROLLED_LATER_VALUE }}」</el-tag>
        <el-tag type="info" size="small">倒计时结束回传「{{ CONTROLLED_AUTO_VALUE }}」</el-tag>
      </div>
    </DemoBlock>
  </div>
</template>

<style scoped>
.demo-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.demo-state {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 14px;
  font-size: 12px;
  color: var(--app-text-secondary);
}

.demo-state-tip {
  line-height: 1.6;
}

.demo-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.demo-result-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-result-title {
  font-size: 12px;
  color: var(--app-text-secondary);
}

.wrapper-arch {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  line-height: 1.7;
}

.wrapper-arch p {
  margin: 0;
}

.wrapper-arch code {
  padding: 0 4px;
  border-radius: 3px;
  background: var(--app-fill-color);
  font-size: 12px;
}
</style>
