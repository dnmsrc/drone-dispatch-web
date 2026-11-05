<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 内置配置式表单弹窗组件（一个"正常定义的弹窗组件"）
//
// 它自己写 <el-dialog>、自己写确定/取消按钮，并通过 defineExpose({ open })
// 覆盖包裹器的默认「打开」动作 —— 每次打开都重新灌入初始值、清空校验提示。
// 业务侧想用配置式表单时，直接 wrapDialog(FormDialog, { name, props: { fields } })。
// ─────────────────────────────────────────────────────────────
import { reactive, ref } from 'vue'
import { ElButton, ElDialog } from 'element-plus'
import ProForm from '../ProForm.vue'
import type { ProFormExpose } from '../types'
import { cloneValue, defaultValueOf, snapshotModel } from '../helpers'
import { useDialog } from './context'
import type { FormDialogProps } from './types'

defineOptions({ inheritAttrs: false })

const props = defineProps<FormDialogProps>()

const { visible, params, close, cancel } = useDialog<
  Record<string, unknown>,
  Record<string, unknown>
>()

const formRef = ref<ProFormExpose>()
const formModel = reactive<Record<string, unknown>>({})
const title = ref(props.title ?? '')

/** 应用一次初始值：props.model 作默认 → 本次 params 覆盖 → 字段默认值兜底 */
function applyModel() {
  for (const key of Object.keys(formModel)) delete formModel[key]
  if (props.model) {
    for (const key of Object.keys(props.model)) formModel[key] = cloneValue(props.model[key])
  }
  for (const key of Object.keys(params)) formModel[key] = cloneValue(params[key])
  for (const field of props.fields) {
    if (formModel[field.prop] === undefined) formModel[field.prop] = defaultValueOf(field)
  }
}

/**
 * 覆盖默认「打开」动作。
 * 业务组件可以按自己的需要在打开时做任何事（这里是重置表单状态），
 * 最后一定要把 visible 置 true —— 包裹器不会再帮你打开。
 */
function open() {
  applyModel()
  title.value = params.title as string | undefined || props.title || ''
  formRef.value?.clearValidate()
  visible.value = true
}
defineExpose({ open })

const okLoading = ref(false)

/**
 * 点确定：先跑本次 open 传入的 beforeOk 钩子（服务端校验、权限校验等），
 * 通过后再做表单校验，都通过才关闭并把数据交回。
 */
async function handleOk() {
  const hook = params.beforeOk as
    | (() => boolean | void | Promise<boolean | void>)
    | undefined
  if (hook) {
    okLoading.value = true
    try {
      const allowed = await hook()
      if (allowed === false) return
    } catch {
      return
    } finally {
      okLoading.value = false
    }
  }

  const valid = (await formRef.value?.validate()) ?? false
  if (!valid) return
  close(snapshotModel(formModel))
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    :title="title"
    :width="props.width ?? 640"
    align-center
  >
    <p v-if="props.description" class="pro-dialog-desc">{{ props.description }}</p>

    <ProForm
      ref="formRef"
      :model="formModel"
      :fields="props.fields"
      :label-width="props.labelWidth ?? '96px'"
      :default-span="props.defaultSpan ?? 24"
      :gutter="props.gutter ?? 16"
      :size="props.size ?? 'default'"
    />

    <template #footer>
      <el-button @click="cancel">{{ props.cancelText ?? '取消' }}</el-button>
      <el-button type="primary" :loading="okLoading" @click="handleOk">
        {{ props.okText ?? '确定' }}
      </el-button>
    </template>
  </el-dialog>
</template>
