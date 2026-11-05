<script setup lang="ts">
// 弹窗 · 包裹器架构：业务组件 + 平行 ts 配置文件 + 句柄
import { computed, ref } from 'vue'
import { CONTROLLED_OK_VALUE, controlledDialog } from '../dialogs/controlled.dialog'
import { overrideDialog } from '../dialogs/override.dialog'
import DemoBlock from '../components/DemoBlock.vue'

/** 最近一次调用（open / close / destroy 的返回值） */
const lastCall = ref('（还没有调用）')
/** 最近一次 Promise / 回调的结果 */
const lastPromise = ref('（还没有结果）')
/** 覆盖动作演示的结果 */
const overrideResult = ref('（还没有操作）')

/** isOpen 是响应式的：在 computed 里读取会跟着变 */
const isOpen = computed(() => controlledDialog.isOpen)

/** open：这次故意不 await，用 then 记录 Promise 结果 */
function openIt() {
  lastCall.value = 'controlledDialog.open()'
  void controlledDialog.open({ content: '这个弹窗由页面上的按钮通过包裹器控制。' }).then((result) => {
    lastPromise.value = result === null ? 'null（取消 / 被外部关闭）' : `「${result}」`
  })
}

/** close()：视为取消，Promise 以 null 结束 */
function closeIt() {
  const closed = controlledDialog.close()
  lastCall.value = closed
    ? 'close() → true（开始播放关闭动画，结果 null）'
    : 'close() → false（当前没有打开的弹窗）'
}

/** destroy()：立即卸载，不等关闭动画 */
function destroyIt() {
  const destroyed = controlledDialog.destroy()
  lastCall.value = destroyed
    ? 'destroy() → true（已立即销毁，结果 null）'
    : 'destroy() → false（当前没有打开的弹窗）'
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

/** 覆盖默认动作：组件自己 defineExpose({ open, close }) */
async function overrideActions() {
  const result = await overrideDialog.open({
    title: '覆盖默认动作的弹窗',
    content: '看提示消息：打开、关闭都走组件里自己写的方法。',
  })
  overrideResult.value = result === null ? 'null（取消 / 关闭）' : `「${result}」`
}

const configCode = `// ① 业务弹窗组件：src/views/order/OrderDialog.vue —— 正常写弹窗
const { visible, params, close } = useDialog<OrderParams, Order>()

<el-dialog v-model="visible" title="订单" width="640px">
  <el-input v-model="paramsSchema" />
  <template #footer>
    <el-button @click="close(row)">确定</el-button>
  </template>
</el-dialog>

// ② 平行位置的 ts：src/views/order/OrderDialog.dialog.ts —— 包裹器包起来
import { wrapDialog } from '@/components/pro'
import OrderDialog from './OrderDialog.vue'

export const orderDialog = wrapDialog<OrderParams, Order>(OrderDialog, {
  name: 'order',            // 包裹器名字（日志 / 调试用）
})

// ③ 业务里：只认这个 ts 文件
import { orderDialog } from '@/views/order/OrderDialog.dialog'
const data = await orderDialog.open({ id: 1 })`

const usageCode = `// 打开：await 拿结果（组件 close(row) → row；取消 / 关闭 → null）
const result = await controlledDialog.open({ content: '…' })

// 打开：回调写法（第二个参数可以是对象，也可以直接是函数）
controlledDialog.open({ content: '…' }, {
  onOk: (result) => { … },
  onCancel: () => { … },
  onClose: () => { … },
})

// 程序化关闭：不传值 = 取消；传值 = 当"确定"把值交回
controlledDialog.close()
controlledDialog.close('ok-result')

// 立即销毁（不等关闭动画），用于页面卸载 / 强制重置
controlledDialog.destroy()

// 是否打开（在 computed 里读取可响应）
const isOpen = computed(() => controlledDialog.isOpen)`

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
</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="① 架构：业务组件 + 平行位置的 ts 配置文件"
      desc="组件正常写（自己写 el-dialog、自己管 visible）；旁边一个 ts 用包裹器包成句柄"
      :code="configCode"
    >
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          <div class="wrapper-arch">
            <p><b>业务弹窗组件</b>：完全正常的 Vue 组件，自己写 <code>&lt;el-dialog&gt;</code>、自己写按钮和关闭逻辑。</p>
            <p><b>平行位置的 ts</b>：用 <code>wrapDialog(组件, { name })</code> 把它包成句柄并导出。</p>
            <p><b>业务代码</b>：只 import 这个 ts，调 <code>.open()</code> 就能打开；打开后能用 <code>.close()</code> / <code>.destroy()</code>。</p>
            <p>包裹器负责挂载到 body、注入 visible/params、收集结果；组件负责长什么样、怎么关。</p>
          </div>
        </template>
      </el-alert>
    </DemoBlock>

    <DemoBlock
      title="② open / close / destroy"
      desc="打开后不需要任何变量记录状态；需要外部控制时，用包裹器的方法"
      :code="usageCode"
    >
      <div class="demo-actions">
        <el-button type="primary" :disabled="isOpen" @click="openIt">
          open() 打开（不 await）
        </el-button>
        <el-button :disabled="!isOpen" @click="closeIt">close() 关闭</el-button>
        <el-button type="danger" plain :disabled="!isOpen" @click="destroyIt">
          destroy() 立即销毁
        </el-button>
        <el-button :disabled="isOpen" @click="openWithCallback">open() + 回调</el-button>
      </div>

      <div class="demo-state">
        <el-tag :type="isOpen ? 'success' : 'info'" size="small">
          isOpen = {{ isOpen }}
        </el-tag>
        <span class="demo-state-tip">
          确定按钮回传「{{ CONTROLLED_OK_VALUE }}」，外部 close / destroy 回传 null
        </span>
      </div>

      <div class="demo-result">
        <div class="demo-result-row">
          <span class="demo-result-title">最近一次调用</span>
          <pre class="demo-block-code">{{ lastCall }}</pre>
        </div>
        <div class="demo-result-row">
          <span class="demo-result-title">最近一次结果</span>
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
  </div>
</template>

<style scoped>
.demo-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
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
