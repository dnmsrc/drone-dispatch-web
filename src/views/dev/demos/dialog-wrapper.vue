<script setup lang="ts">
// 弹窗 · 包裹器机制：弹窗配置文件 + open / close / destroy
import { computed, ref } from 'vue'
import { CONTROLLED_OK_VALUE, controlledDialog } from '../dialogs/controlled.dialog'
import DemoBlock from '../components/DemoBlock.vue'

/** 最近一次调用（open / close / destroy 的返回值） */
const lastCall = ref('（还没有调用）')
/** 最近一次 Promise / 回调的结果 */
const lastPromise = ref('（还没有结果）')

/** isOpen 是 getter：在 computed 里读取可响应 */
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

const configCode = `// ① 弹窗配置文件：src/dialogs/controlled.dialog.ts
import { defineDialog } from '@/components/pro'

export const controlledDialog = defineDialog<{ content?: string }, string>({
  name: 'controlled',                    // 包裹器名字（日志 / 调试用）
  title: '被外部控制的弹窗',
  content: (params) => params.content ?? '默认文案',   // 参数 → 内容
  okValue: 'ok-result',                  // 非表单模式：确定时回传的值
})

// 弹窗组件不需要在 template 里挂，也不需要维护 visible 变量`

const usageCode = `// ② 业务里：import 配置文件，用包裹器的方法
import { controlledDialog } from '@/dialogs/controlled.dialog'

// 打开：await 拿结果（确定 → okValue，取消 / 关闭 → null）
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

</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="① 一个弹窗 = 一个配置文件（包裹器）"
      desc="defineDialog 把「弹窗组件 + 弹窗配置」包成带 open / close / destroy 的对象，导出后在业务里直接用"
      :code="configCode"
    >
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          包裹器就是弹窗的"句柄"：配置文件里描述它的样子（标题、宽度、内容、表单字段），
          业务代码里只关心什么时候打开、结果是什么。
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
</style>
