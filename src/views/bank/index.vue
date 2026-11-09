<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 公司收款账户（对齐后端 company_bank_accounts 表，对公转账到账核对的前置数据）
//
// 写法与场地管理同构：
//   - 新增/编辑 → createFormDialog 配置式表单弹窗，open() 传初始值区分新增/编辑
//   - 设为默认 / 启停 / 删除 → 操作列；危险动作 confirm 二次确认
//   - 业务校验（默认唯一、默认不可停用/删除、账号唯一）集中在 mock.ts，
//     页面只负责把抛出的错误用 ElMessage 呈现
//   - 数据走 ./mock.ts 的内存 CRUD，刷新回滚
// TODO(server): 接 /admin/bank-accounts CRUD 后仅替换 mock.ts，本页与弹窗不改名。
// ─────────────────────────────────────────────────────────────
import { h, onMounted, ref } from 'vue'
import { ElMessage, ElTag } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { createFormDialog, DialogAction, ProTable } from '@/components/pro'
import type { FormFieldConfig, TableActions, TableColumn } from '@/components/pro'
import {
  createAccount,
  deleteAccount,
  queryAccounts,
  setDefault,
  toggleEnabled,
  updateAccount,
} from './mock'
import type { BankAccountForm, BankAccountRow } from './types'

/* ═══ 列表状态（基础数据，一次加载全量）═══ */
const loading = ref(false)
const rows = ref<BankAccountRow[]>([])

async function load(): Promise<void> {
  loading.value = true
  await new Promise((r) => window.setTimeout(r, 260))
  rows.value = queryAccounts()
  loading.value = false
}

onMounted(() => void load())

/* ═══ 新增/编辑表单弹窗 ═══ */
const accountFields: FormFieldConfig[] = [
  {
    prop: 'accountName',
    label: '开户户名',
    placeholder: '公司全称，如：杭州承飞科技有限公司',
    required: true,
    rules: [{ required: true, message: '请填写开户户名', trigger: 'blur' }],
    props: { maxlength: 100 },
  },
  {
    prop: 'bankName',
    label: '开户行',
    placeholder: '如：中国工商银行杭州滨江支行',
    required: true,
    rules: [{ required: true, message: '请填写开户行', trigger: 'blur' }],
    props: { maxlength: 100 },
  },
  {
    prop: 'accountNo',
    label: '银行账号',
    placeholder: '对公银行账号',
    required: true,
    rules: [{ required: true, message: '请填写银行账号', trigger: 'blur' }],
    props: { maxlength: 40 },
  },
  {
    prop: 'isDefault',
    label: '默认账户',
    control: 'switch',
    defaultValue: false,
    props: { activeText: '默认', inactiveText: '否' },
    tip: '全表唯一：设为默认会自动取消原默认账户',
  },
  {
    prop: 'enabled',
    label: '启用状态',
    control: 'switch',
    defaultValue: true,
    props: { activeText: '启用', inactiveText: '停用' },
  },
  {
    prop: 'remark',
    label: '备注',
    control: 'textarea',
    placeholder: '选填',
    props: { maxlength: 255, rows: 2 },
  },
]

const accountDialog = createFormDialog<BankAccountForm>({
  name: 'bank-account-form',
  width: 520,
  labelWidth: '90px',
  defaultSpan: 24,
  okText: '保存',
  fields: accountFields,
})

/** 当前编辑的账户 id（空串表示新增） */
const editingId = ref('')

async function openForm(row?: BankAccountRow): Promise<void> {
  editingId.value = row?.id ?? ''
  const result = await accountDialog.open({
    title: row ? '编辑收款账户' : '新增收款账户',
    accountName: row?.accountName ?? '',
    bankName: row?.bankName ?? '',
    accountNo: row?.accountNo ?? '',
    isDefault: row?.isDefault ?? false,
    enabled: row?.enabled ?? true,
    remark: row?.remark ?? '',
  })
  if (result.action !== DialogAction.Confirm || !result.data) return

  const form = result.data as BankAccountForm
  try {
    if (editingId.value) {
      updateAccount(editingId.value, form)
      ElMessage.success('收款账户已保存')
    } else {
      createAccount(form)
      ElMessage.success('收款账户已新增')
    }
    void load()
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

/* ═══ 设为默认（默认账户行隐藏该按钮）═══ */
function handleSetDefault(row: BankAccountRow): void {
  try {
    setDefault(row.id)
    ElMessage.success(`已将「${row.bankName}」设为默认收款账户`)
    void load()
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

/* ═══ 启停切换 ═══ */
function handleToggle(row: BankAccountRow): void {
  try {
    toggleEnabled(row.id, !row.enabled)
    ElMessage.success(row.enabled ? '账户已停用' : '账户已启用')
    void load()
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

/* ═══ 表格列 ═══ */
const columns: TableColumn[] = [
  {
    label: '账户',
    minWidth: 220,
    render: ({ row }) => {
      const r = row as BankAccountRow
      return h('div', { class: 'bank-main' }, [
        h('div', { class: 'bank-name' }, [
          h('span', { class: 'ellipsis', title: r.accountName }, r.accountName),
          r.isDefault
            ? h(ElTag, { type: 'warning', size: 'small', effect: 'light' }, () => '默认')
            : null,
        ]),
        h('div', { class: 'bank-sub ellipsis', title: r.bankName }, r.bankName),
      ])
    },
  },
  {
    prop: 'accountNo',
    label: '银行账号',
    minWidth: 200,
    render: ({ row }) =>
      h(
        'span',
        { class: 'account-no nowrap', title: (row as BankAccountRow).accountNo },
        (row as BankAccountRow).accountNo,
      ),
  },
  {
    label: '状态',
    width: 100,
    align: 'center',
    render: ({ row }) => {
      const enabled = (row as BankAccountRow).enabled
      return h(ElTag, { type: enabled ? 'success' : 'info' }, () => (enabled ? '启用' : '停用'))
    },
  },
  {
    prop: 'remark',
    label: '备注',
    minWidth: 160,
    render: ({ row }) => {
      const remark = (row as BankAccountRow).remark
      return h('span', { class: 'ellipsis', title: remark || '' }, remark || '—')
    },
  },
]

/* ═══ 操作列：设为默认 / 编辑 / 启停 / 删除 ═══ */
const actions: TableActions = {
  width: 210,
  fixed: 'right',
  buttons: [
    {
      text: '设为默认',
      type: 'warning',
      icon: 'StarFilled',
      // 默认账户本身不显示「设为默认」
      show: (row) => !(row as BankAccountRow).isDefault,
      onClick: (row) => handleSetDefault(row as BankAccountRow),
    },
    {
      text: '编辑',
      type: 'primary',
      icon: 'Edit',
      onClick: (row) => void openForm(row as BankAccountRow),
    },
    {
      // 文字随当前状态切换（与原型 switch 语义一致，但走确认更稳妥）
      text: '停用',
      type: 'info',
      icon: 'TurnOff',
      show: (row) => (row as BankAccountRow).enabled,
      confirm: (row) =>
        `确认停用「${(row as BankAccountRow).bankName}」？停用后不再作为可选收款账户。`,
      onClick: (row) => handleToggle(row as BankAccountRow),
    },
    {
      text: '启用',
      type: 'success',
      show: (row) => !(row as BankAccountRow).enabled,
      onClick: (row) => handleToggle(row as BankAccountRow),
    },
    {
      text: '删除',
      type: 'danger',
      icon: 'Delete',
      confirm: (row) => `确认删除收款账户「${(row as BankAccountRow).bankName}」？删除后不可恢复。`,
      confirmButtonText: '删除',
      onClick: (row) => {
        try {
          deleteAccount((row as BankAccountRow).id)
          ElMessage.success('已删除')
          void load()
        } catch (e) {
          ElMessage.error((e as Error).message)
        }
      },
    },
  ],
}
</script>

<template>
  <div class="page">
    <div class="card">
      <h3 class="card-title">
        收款账户<span class="sub">对公转账到账核对用，默认账户全表唯一</span>
        <el-button type="primary" :icon="Plus" @click="openForm()">新增账户</el-button>
      </h3>

      <ProTable
        :columns="columns"
        :data="rows"
        :loading="loading"
        :actions="actions"
        stripe
        row-key="id"
        :auto-fit="true"
        empty-text="暂无收款账户"
      />
    </div>
  </div>
</template>

<style scoped>
/* 账户主行：户名 + 默认标签横向排列 */
.bank-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bank-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.bank-sub {
  font-size: 12px;
  color: var(--app-text-secondary);
  font-weight: 400;
}

.account-no {
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
}
</style>
