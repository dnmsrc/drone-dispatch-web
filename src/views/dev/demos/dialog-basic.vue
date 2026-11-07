<script setup lang="ts">
// 弹窗 · 基础用法：包裹器 Promise 风格、回调风格、内置确认框
//
// 结果统一是 { action, data }：action 是 DialogAction 枚举。
// 业务判断请用 action（确认 / 取消 / 关闭 / 超时 / 被顶掉），不要判 data 是否为 null。
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DialogAction, confirmDialog } from '@/components/pro'
import type { DialogResult } from '@/components/pro'
import { messageDialog } from '../dialogs/message.dialog'
import DemoBlock from '../components/DemoBlock.vue'

const lastResult = ref('（还没有操作）')

/** DialogAction 的中文语义（只是演示页用来显示，业务里直接用枚举值判断） */
const ACTION_LABEL: Record<string, string> = {
  [DialogAction.Confirm]: '确认',
  [DialogAction.Cancel]: '取消',
  [DialogAction.Close]: '关闭（X / ESC / 遮罩）',
  [DialogAction.Timeout]: '超时自关',
  [DialogAction.Replace]: '被新的 open 顶掉',
  [DialogAction.Destroy]: '已销毁',
  // 业务自定义动作（如稍后提醒）不在内置枚举里，会显示成 action 原值
}

/** 统一记录结果，方便肉眼验证「动作 + 数据」 */
function record(label: string, result: DialogResult<unknown>) {
  const action = `${result.action}（${ACTION_LABEL[result.action] ?? '业务自定义动作'}）`
  const data = result.data === null ? 'null' : JSON.stringify(result.data)
  lastResult.value = `${label} → action: ${action}，data: ${data}`
}

/** 最常用：await 弹窗结果，用 action 判断用户做了什么 */
async function openBasic() {
  const result = await messageDialog.open({
    title: '普通弹窗',
    description: '打开后 script 停在这一行，结果回来后继续往下执行。',
    content: '点「确定」→ action = Confirm；点「取消」→ Cancel；右上角 X / ESC → Close。',
    okText: '知道了',
  })
  if (result.action === DialogAction.Confirm) {
    ElMessage.success('收到确认动作，data = true')
  }
  record('messageDialog.open()', result)
}

/** 确认框也是一个包裹器：结果同样是 { action, data } */
async function removeOrder() {
  const result = await confirmDialog.open({
    title: '删除订单',
    content: '删除后订单数据不可恢复，确认删除「DD202511050001」？',
    type: 'danger',
    okText: '删除',
  })
  if (result.action !== DialogAction.Confirm) {
    // 取消 / 点 X / 超时……都落在这里，语义由 action 明确给出
    record('删除订单（未确认）', result)
    return
  }
  ElMessage.success('已删除（演示，实际这里调删除接口）')
  lastResult.value = '删除订单 → action: confirm（用户明确点了删除），继续执行删除逻辑'
}

/** 回调风格：不 await，结果走 onConfirm / onCancel / onClose（也可统一用 onResult） */
function callbackStyle() {
  void messageDialog.open(
    {
      title: '回调风格',
      content: '不 await 也能用，结果通过 onConfirm / onCancel / onClose 回调交回。',
      okText: '继续',
    },
    {
      onConfirm: () => {
        ElMessage.success('onConfirm 收到确认动作')
        record('回调风格', { action: DialogAction.Confirm, data: true })
      },
      onCancel: () => record('回调风格', { action: DialogAction.Cancel, data: null }),
      onClose: () =>
        record('回调风格', { action: DialogAction.Close, data: null }),
    },
  )
}

const code = `// ① 业务弹窗组件：MessageDialog.vue —— 入参用标准 defineProps，运行时能力用 useDialog
const props = withDefaults(defineProps<MessageDialogParams>(), { title: '提示', okText: '知道了' })
const { visible, confirm, cancel } = useDialog<MessageDialogParams, boolean>()

<el-dialog v-model="visible" :title="props.title" width="480px">
  {{ props.content }}
  <template #footer>
    <el-button @click="cancel">取消</el-button>
    <el-button type="primary" @click="confirm(true)">{{ props.okText }}</el-button>
  </template>
</el-dialog>

// ② 平行位置的 ts：message.dialog.ts —— 包裹器包成句柄（options.props 是中间层默认值）
import MessageDialog from './MessageDialog.vue'
export const messageDialog = wrapDialog<MessageDialogParams, boolean>(MessageDialog, {
  name: 'message',
  props: { title: '默认标题（options.props，可被 open 入参覆盖）' },
})

// ③ 业务里只认这个 ts：await 拿「动作 + 数据」，用枚举判断
//    入参三层默认：组件 withDefaults ＜ options.props ＜ open() 入参
import { DialogAction, messageDialog } from './message.dialog'
const result = await messageDialog.open({ title: '普通弹窗', content: '…' })
if (result.action !== DialogAction.Confirm) return   // 取消 / X / 超时 都在这
use(result.data)                                     // 确认时 data 才一定有值

// ④ 回调风格（不 await 也行）：onConfirm / onCancel / onClose，或统一用 onResult
messageDialog.open(
  { title: '回调风格', content: '…' },
  { onConfirm: (data) => save(data), onCancel: () => ElMessage.info('已取消') },
)

// ⑤ 内置确认框同样是包裹器：结果一样是 { action, data }
const result = await confirmDialog.open({ content: '确认删除？', type: 'danger' })
if (result.action === DialogAction.Confirm) remove()
`

</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="包裹器：引入配置文件，调 .open() 打开"
      desc="弹窗逻辑与业务逻辑写在一起；结果是「动作枚举 + 数据」，不用猜 null 的含义"
      :code="code"
    >
      <div class="demo-actions">
        <el-button type="primary" @click="openBasic">打开普通弹窗</el-button>
        <el-button type="danger" plain @click="removeOrder">删除前确认</el-button>
        <el-button @click="callbackStyle">回调风格</el-button>
      </div>

      <div class="demo-result">
        <div class="demo-result-title">最近一次结果</div>
        <pre class="demo-block-code">{{ lastResult }}</pre>
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

.demo-result {
  margin-top: 16px;
}

.demo-result-title {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--app-text-secondary);
}
</style>
