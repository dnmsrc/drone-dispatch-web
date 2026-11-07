<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 业务弹窗组件示例：按钮全部内聚在组件里，点击只调包裹器给的方法
//
// 这就是「按钮不由外部传入、弹窗可以重写包裹器方法」的标准写法：
//   - 包裹器（useDialog）只提供 visible / confirm / cancel / close 这些「方法」
//   - 按钮有几个、叫什么、什么类型，全在本组件的模板里写死
//   - 点「驳回 / 转审」用 close(业务动作枚举, 数据)，点「通过」用 confirm(true)
//
// 调用方只管 await open()，然后按 result.action 的枚举分支处理，
// 完全不需要知道按钮长什么样、也不往 open() 里传任何渲染函数。
// ─────────────────────────────────────────────────────────────
import { ElButton, ElDialog } from 'element-plus'
import { useDialog } from '@/components/pro'
import { ApproveAction } from './approve.constants'
import type { ApproveData, ApproveDialogParams } from './approve.constants'

defineOptions({ inheritAttrs: false })

// 标准 props：open() 入参 / options.props 合并后从这里进来
const props = withDefaults(defineProps<ApproveDialogParams>(), {
  title: '订单审批',
  rejectText: '驳回',
  transferText: '转审',
  okText: '通过',
})

// 第三个泛型传入业务动作枚举：close() 才允许收 ApproveAction
const { visible, confirm, close } = useDialog<ApproveDialogParams, ApproveData, ApproveAction>()

/** 驳回：以业务动作 Reject 关闭，带回驳回原因 */
function reject() {
  close(ApproveAction.Reject, '资料不全')
}

/** 转审：以业务动作 Transfer 关闭，带回转交人 */
function transfer() {
  close(ApproveAction.Transfer, '转张三复核')
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    :title="props.title"
    width="480px"
    :close-on-click-modal="false"
  >
    <div class="pro-dialog-text">{{ props.content }}</div>

    <!-- 三个按钮都内聚在这里：业务动作由 close(枚举, 数据) 回传，通过走 confirm -->
    <template #footer>
      <el-button type="danger" plain @click="reject">{{ props.rejectText }}</el-button>
      <el-button @click="transfer">{{ props.transferText }}</el-button>
      <el-button type="primary" @click="confirm(true)">{{ props.okText }}</el-button>
    </template>
  </el-dialog>
</template>
