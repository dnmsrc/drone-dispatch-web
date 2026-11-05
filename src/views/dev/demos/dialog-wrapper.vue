<script setup lang="ts">
// 弹窗 · 包裹器架构：业务组件 + 平行 ts 配置文件，业务只 await open() 拿结果
import { computed, ref } from 'vue'
import { getDialogHandle } from '@/components/pro'
import {
  CONTROLLED_AUTO_VALUE,
  CONTROLLED_OK_VALUE,
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

/** open 并 await：业务代码的标准写法 */
async function openIt() {
  lastCall.value = 'await controlledDialog.open({ content: … })'
  const result = await controlledDialog.open({
    content: '打开后，关闭（确定/取消/X）都由弹窗自己做，调用方只等结果。',
  })
  lastPromise.value = result === null ? 'null（取消 / 点了 X）' : `「${result}」`
}

/** 回调风格：不 await，结果走回调 */
function openWithCallback() {
  lastCall.value = 'controlledDialog.open(params, { onOk, onCancel, onClose })'
  void controlledDialog.open(
    { content: '这次用回调写法，结果通过 onOk / onCancel / onClose 交回。' },
    {
      onOk: (result) => {
        lastPromise.value = `onOk 收到「${result}」`
      },
      onCancel: () => {
        lastPromise.value = 'onCancel 被调用'
      },
      onClose: () => {
        lastPromise.value = 'onClose 被调用（点 X / 遮罩 / ESC）'
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
  lastPromise.value = result === null ? 'null（取消 / 点了 X）' : `「${result}」`
}

/** 覆盖默认动作：组件自己 defineExpose({ open, close }) */
async function overrideActions() {
  const result = await overrideDialog.open({
    title: '覆盖默认动作的弹窗',
    content: '看提示消息：打开、关闭都走组件里自己写的方法。',
  })
  overrideResult.value = result === null ? 'null（取消 / 关闭）' : `「${result}」`
}

// ── 下面只是「包裹器内部能力」的调试演示，业务代码不要这样写 ──
/** 内部句柄：只有调试 / 测试才需要拿它 */
const handle = getDialogHandle(controlledDialog)
const internalOpen = computed(() => handle.isOpen)

function handleClose() {
  const closed = handle.close()
  lastCall.value = closed
    ? 'handle.close() → true（内部能力，业务代码不用）'
    : 'handle.close() → false（当前没有打开的弹窗）'
}

function handleDestroy() {
  const destroyed = handle.destroy()
  lastCall.value = destroyed
    ? 'handle.destroy() → true（内部能力，业务代码不用）'
    : 'handle.destroy() → false（当前没有打开的弹窗）'
}

const configCode = `// ① 业务弹窗组件：src/views/order/OrderDialog.vue —— 正常写弹窗
const { visible, params, close, cancel } = useDialog<OrderParams, Order>()

<el-dialog v-model="visible" title="订单" width="640px">
  <el-input v-model="form.owner" />
  <template #footer>
    <el-button @click="cancel">取消</el-button>
    <el-button @click="close(form)">确定</el-button>
  </template>
</el-dialog>

// ② 平行位置的 ts：src/views/order/OrderDialog.dialog.ts —— 包裹器包起来
import { wrapDialog } from '@/components/pro'
import OrderDialog from './OrderDialog.vue'

export const orderDialog = wrapDialog<OrderParams, Order>(OrderDialog, {
  name: 'order',            // 包裹器名字（日志 / 调试用）
})

// ③ 业务里：只认这个 ts 文件，只调 open()
import { orderDialog } from '@/views/order/OrderDialog.dialog'
const data = await orderDialog.open({ id: 1 })   // null = 取消 / 关闭`

const usageCode = `// 业务侧只做一件事：await open()，拿弹窗里出来的结果
const result = await controlledDialog.open({ content: '…' })
if (!result) return                  // null = 用户取消 / 点了 X

// 回调写法（第二个参数可以是对象，也可以直接是函数）
controlledDialog.open({ content: '…' }, {
  onOk: (result) => { … },
  onCancel: () => { … },
  onClose: () => { … },
})

// 弹窗自己决定何时关：这里只是告诉它「打开后自己倒计时 3 秒」
await controlledDialog.open({ content: '…', autoClose: 3 })

// 没有 close() / destroy() —— 打开、关闭、销毁都是弹窗自己的事，
// 业务代码不关心弹窗的生命周期`

const overrideCode = `// 业务组件里自己定义打开 / 关闭动作
function open(p) {
  // 组件自己的准备逻辑（埋点、拉数据…）
  visible.value = true       // 最后一定要自己显示
}
function close(result) {
  if (result === undefined) cancel()
  else finish(result)        // finish = useDialog().close，负责 settle 结果
}
defineExpose({ open, close })  // ← 暴露后包裹器优先调它

// 优先级：组件 defineExpose > wrapDialog 的 options.open/close > 包裹器默认动作`

const internalCode = `// 仅框架 / 调试使用：包裹器内部句柄（业务代码不要这样写）
import { getDialogHandle } from '@/components/pro'
const handle = getDialogHandle(controlledDialog)

handle.isOpen                    // 有没有打开中的实例（响应式）
handle.close()                   // 关闭 → 视为取消，结果 null
handle.close('value')            // 关闭 → 视为"确定"，回传 value
handle.destroy()                 // 立即销毁，不等关闭动画

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
            <p><b>业务弹窗组件</b>：完全正常的 Vue 组件，自己写 <code>&lt;el-dialog&gt;</code>、自己写按钮和关闭逻辑。</p>
            <p><b>平行位置的 ts</b>：用 <code>wrapDialog(组件, { name })</code> 包成句柄并导出。</p>
            <p><b>业务代码</b>：只 import 这个 ts，<code>await .open()</code> 拿结果；打开、关闭、销毁都不归它管。</p>
            <p>包裹器负责挂载到 body、注入 visible/params、收集结果；弹窗自己负责什么时候显示、什么时候关。</p>
          </div>
        </template>
      </el-alert>
    </DemoBlock>

    <DemoBlock
      title="② 业务代码只 await 结果"
      desc="没有 close() / destroy()：弹窗自己关，调用方只拿数据"
      :code="usageCode"
    >
      <div class="demo-actions">
        <el-button type="primary" @click="openIt">await open() 打开</el-button>
        <el-button @click="openWithCallback">open() + 回调</el-button>
        <el-button type="warning" plain @click="openAutoClose">
          弹窗自己 3 秒后关闭
        </el-button>
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
    </DemoBlock>

    <DemoBlock
      title="③ 组件覆盖默认的打开 / 关闭"
      desc="组件 defineExpose({ open, close }) 后，包裹器优先调用组件自己的方法"
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
        <el-tag type="info" size="small">确定按钮回传「{{ CONTROLLED_OK_VALUE }}」</el-tag>
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
