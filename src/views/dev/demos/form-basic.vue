<script setup lang="ts">
// 表单 · 基础用法：字段配置 + 数据模型 + 提交/重置
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ProForm, type FormFieldConfig } from '@/components/pro'
import { VENUE_OPTIONS } from '../mock'
import DemoBlock from '../components/DemoBlock.vue'

const formRef = ref<InstanceType<typeof ProForm>>()
const submitting = ref(false)

const model = reactive({
  name: '',
  phone: '',
  venue: '',
  remark: '',
})

/** 字段配置：只写控件名与业务参数，不写任何 Element 标签 */
const fields: FormFieldConfig[] = [
  { prop: 'name', label: '客户姓名', control: 'input', required: true },
  {
    prop: 'phone',
    label: '手机号',
    control: 'input',
    required: true,
    rules: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
  },
  { prop: 'venue', label: '表演场地', control: 'select', options: VENUE_OPTIONS },
  { prop: 'remark', label: '备注', control: 'textarea', span: 24 },
]

async function onSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    ElMessage.success('校验通过，数据已提交（演示）')
  }, 600)
}

const code = `const model = reactive({ name: '', phone: '', venue: '', remark: '' })

const fields: FormFieldConfig[] = [
  { prop: 'name', label: '客户姓名', control: 'input', required: true },
  { prop: 'phone', label: '手机号', control: 'input', required: true,
    rules: [{ pattern: /^1[3-9]\\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }] },
  { prop: 'venue', label: '表演场地', control: 'select', options: VENUE_OPTIONS },
  { prop: 'remark', label: '备注', control: 'textarea', span: 24 },
]

<ProForm ref="formRef" :model="model" :fields="fields">
  <template #tail>
    <el-button type="primary" @click="onSubmit">提交</el-button>
    <el-button @click="formRef?.resetFields()">重置</el-button>
  </template>
</ProForm>`
</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="基础表单"
      desc="4 个字段默认三列栅格；备注 span=24 独占一行；无需写 el-form-item"
      :code="code"
    >
      <ProForm ref="formRef" :model="model" :fields="fields">
        <template #tail>
          <div class="demo-actions">
            <el-button type="primary" :loading="submitting" @click="onSubmit">提交</el-button>
            <el-button @click="formRef?.resetFields()">重置</el-button>
            <el-button @click="formRef?.clearValidate()">清除校验</el-button>
          </div>
        </template>
      </ProForm>

      <div class="demo-model">
        <div class="demo-model-title">当前表单数据</div>
        <pre class="demo-block-code">{{ JSON.stringify(model, null, 2) }}</pre>
      </div>
    </DemoBlock>
  </div>
</template>

<style scoped>
.demo-actions {
  display: flex;
  gap: 10px;
  padding-top: 4px;
}

.demo-model {
  margin-top: 16px;
}

.demo-model-title {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--app-text-secondary);
}
</style>
