<script setup lang="ts">
// 表单 · 校验规则：required 简写 / 自定义校验 / 联动显隐与禁用
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ProForm, type FormFieldConfig } from '@/components/pro'
import { VENUE_OPTIONS } from '../mock'
import DemoBlock from '../components/DemoBlock.vue'

const formRef = ref<InstanceType<typeof ProForm>>()

const model = reactive({
  account: '',
  password: '',
  confirmPassword: '',
  notify: false,
  notifyPhone: '',
  venue: '',
  venueRemark: '',
})

const fields: FormFieldConfig[] = [
  { prop: 'account', label: '账号', control: 'input', required: true },
  {
    prop: 'password',
    label: '密码',
    control: 'password',
    required: true,
    rules: [{ min: 6, max: 20, message: '密码长度 6~20 位', trigger: 'blur' }],
  },
  {
    prop: 'confirmPassword',
    label: '确认密码',
    control: 'password',
    rules: [
      {
        // 跨字段校验：validator 里直接读同一份 model
        validator: (_rule, value, callback) => {
          if (value !== model.password) callback(new Error('两次输入的密码不一致'))
          else callback()
        },
        trigger: 'blur',
      },
    ],
  },
  { prop: 'venue', label: '场地', control: 'select', options: VENUE_OPTIONS },
  {
    prop: 'venueRemark',
    label: '场地备注',
    control: 'input',
    disabled: (m) => !m.venue,
    tip: '选择场地后才可填写',
  },
  { prop: 'notify', label: '短信通知', control: 'switch', span: 24 },
  {
    prop: 'notifyPhone',
    label: '通知手机号',
    control: 'input',
    required: true,
    hidden: (m) => m.notify !== true,
    rules: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
  },
]

async function onSubmit() {
  const valid = await formRef.value?.validate()
  ElMessage[valid ? 'success' : 'error'](valid ? '校验通过' : '存在校验不通过的字段')
}

const code = `const fields: FormFieldConfig[] = [
  // 必填简写：自动生成「请输入xxx」规则
  { prop: 'account', label: '账号', control: 'input', required: true },

  // 长度规则
  { prop: 'password', label: '密码', control: 'password', required: true,
    rules: [{ min: 6, max: 20, message: '密码长度 6~20 位', trigger: 'blur' }] },

  // 跨字段校验：validator 直接读同一份 model
  { prop: 'confirmPassword', label: '确认密码', control: 'password',
    rules: [{ validator: (_rule, value, callback) => {
      if (value !== model.password) callback(new Error('两次输入的密码不一致'))
      else callback()
    }, trigger: 'blur' }] },

  // 联动禁用：没选场地时禁用备注
  { prop: 'venueRemark', label: '场地备注', control: 'input',
    disabled: (m) => !m.venue, tip: '选择场地后才可填写' },

  // 联动显隐：打开「短信通知」才显示手机号
  { prop: 'notifyPhone', label: '通知手机号', control: 'input', required: true,
    hidden: (m) => m.notify !== true },
]`
</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="校验与联动"
      desc="required 简写自动生成提示；validator 做跨字段校验；hidden/disabled 支持函数按 model 联动"
      :code="code"
    >
      <ProForm ref="formRef" :model="model" :fields="fields">
        <template #tail>
          <div class="demo-actions">
            <el-button type="primary" @click="onSubmit">校验并提交</el-button>
            <el-button @click="formRef?.resetFields()">重置</el-button>
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
