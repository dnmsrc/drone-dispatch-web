<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 创建派单弹窗（UI 复刻原型 consult/index.vue 的「创建派单」el-dialog）
//
// 写法按正式版规范重构：
//   - 按钮内聚在组件里，结果经 useDialog 的 confirm/cancel 回传（不再操作 ref + v-model）
//   - 表单走 ProForm 配置式：报价上下限两列栅格、六项合同条款、客服备注
//   - 每次打开重置表单并按 open 入参预填报价上下限（原型 destroy-on-close 的等效行为）
// 调用方只 `await dispatchDialog.open(params)` 拿「动作 + 数据」。
// ─────────────────────────────────────────────────────────────
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ProForm, useDialog } from '@/components/pro'
import type { FormFieldConfig, ProFormExpose } from '@/components/pro'
import { dispatchTermFields } from '../constants'
import type { DispatchDialogParams, DispatchFormData } from '../types'

defineOptions({ inheritAttrs: false })

const { visible, params, confirm, cancel } = useDialog<DispatchDialogParams, DispatchFormData>()

/** 六项条款默认空值 + 保额默认 100 万（与 mock-server 派单口径一致） */
function emptyTerms(): Record<string, string | number> {
  return {
    approvalOwner: '',
    approvalFailLiability: '',
    subcontractApproved: '',
    depositNature: '',
    insuranceAmount: 1000000,
    scaleBasis: '',
  }
}

const form = reactive<Record<string, any>>({
  quoteLo: 0,
  quoteHi: 0,
  terms: emptyTerms(),
  note: '',
})

const formRef = ref<ProFormExpose>()

/** 报价上下限（数字输入，span 12 两列并排） */
const quoteFields: FormFieldConfig[] = [
  {
    prop: 'quoteLo',
    label: '报价下限（元）',
    control: 'input-number',
    span: 12,
    required: true,
    rules: [{ required: true, message: '请填写报价下限', trigger: 'blur' }],
    props: { min: 0, step: 100, controlsPosition: 'right' },
  },
  {
    prop: 'quoteHi',
    label: '报价上限（元）',
    control: 'input-number',
    span: 12,
    required: true,
    rules: [{ required: true, message: '请填写报价上限', trigger: 'blur' }],
    props: { min: 0, step: 100, controlsPosition: 'right' },
  },
]

/** 责任保险保额（数字项，必须大于 0；与原型一致不画红星，仅 validator 强校验） */
const insuranceField: FormFieldConfig = {
  prop: 'terms.insuranceAmount',
  label: '责任保险保额（元）',
  control: 'input-number',
  rules: [
    {
      validator: (_rule, value, callback) => {
        const n = Number(value)
        if (Number.isFinite(n) && n > 0) callback()
        else callback(new Error('请填写责任保险保额（大于 0 的数字）'))
      },
      trigger: 'blur',
    },
  ],
  props: { min: 0, step: 10000, precision: 0, controlsPosition: 'right' },
}

const noteField: FormFieldConfig = {
  prop: 'note',
  label: '客服备注',
  control: 'textarea',
  placeholder: '对用户的补充说明，例如沟通结论、待补材料、签署注意事项',
  props: { rows: 3, maxlength: 200, showWordLimit: true },
}

const fields: FormFieldConfig[] = [
  ...quoteFields,
  ...dispatchTermFields(),
  insuranceField,
  noteField,
]

/** 每次打开重置为初始值，并预填该行报价区间（原型 openDispatch 同款逻辑） */
watch(visible, (open) => {
  if (!open) return
  form.quoteLo = params.quoteLo ?? 0
  form.quoteHi = params.quoteHi ?? 0
  form.terms = emptyTerms()
  form.note = ''
  formRef.value?.clearValidate()
})

async function submit() {
  const ok = (await formRef.value?.validate()) ?? false
  if (!ok) return
  const lo = Number(form.quoteLo)
  const hi = Number(form.quoteHi)
  if (lo > hi) {
    ElMessage.warning('报价下限不能大于报价上限')
    return
  }
  confirm({
    quoteLo: lo,
    quoteHi: hi,
    terms: { ...form.terms, insuranceAmount: Number(form.terms.insuranceAmount) },
    note: String(form.note ?? '').trim(),
  })
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    title="创建派单"
    width="min(660px, 94vw)"
    :close-on-click-modal="false"
  >
    <!-- 咨询单摘要（原型顶部 descriptions 同款） -->
    <el-descriptions :column="2" border size="small" style="margin-bottom: 16px">
      <el-descriptions-item label="咨询单号" :span="2">{{ params.consultId }}</el-descriptions-item>
      <el-descriptions-item label="用户">
        {{ params.nickname || '—' }}（{{ params.phone || '—' }}）
      </el-descriptions-item>
      <el-descriptions-item label="场地">{{ params.venueName || '—' }}</el-descriptions-item>
      <el-descriptions-item label="申请日期">
        {{ params.performDate || '—' }} {{ params.timeSlot }}
      </el-descriptions-item>
      <el-descriptions-item label="用户预估区间">{{
        params.quoteHint || '—'
      }}</el-descriptions-item>
    </el-descriptions>

    <ProForm
      ref="formRef"
      :model="form"
      :fields="fields"
      label-position="top"
      :default-span="24"
      :gutter="12"
    />

    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="submit">确认创建派单</el-button>
    </template>
  </el-dialog>
</template>
