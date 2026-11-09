<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 管理员账号（对齐后端 admin_users 表；与 C 端用户管理区分）
//
// 写法与场地/收款账户页同构：
//   - 新增 / 编辑 → 两个 createFormDialog（新增含登录名+初始密码，
//     编辑登录名只读、不含密码）；重置密码 → 独立 password 弹窗
//   - 启停 → 状态列内联 ElSwitch，切换失败（自我保护/最后一个管理员）回滚
//   - 安全红线在 mock.ts 兜底，页面按当前登录人隐藏/禁用危险操作
//   - admin_users 无软删字段，不提供删除，离职账号用停用处理
// TODO(server): 接 /admin/admin-users 系列接口后仅替换 mock.ts，本页不改名。
// ─────────────────────────────────────────────────────────────
import { computed, h, onMounted, ref } from 'vue'
import { ElAvatar, ElMessage, ElSwitch, ElTag } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { createFormDialog, DialogAction, ProTable } from '@/components/pro'
import type { FormFieldConfig, OptionItem, TableActions, TableColumn } from '@/components/pro'
import { useAuthStore } from '@/stores/auth'
import { ADMIN_ROLE_LABELS } from '@/utils/format'
import { fmtTime } from '@/utils/format'
import {
  createAdminAccount,
  queryAdminAccounts,
  resetPassword,
  toggleAdminEnabled,
  updateAdminAccount,
} from './mock'
import type {
  AdminAccountCreateForm,
  AdminAccountRow,
  AdminAccountUpdateForm,
  AdminRole,
  ResetPasswordForm,
} from './types'

const authStore = useAuthStore()
/** 当前登录用户名（自我保护：不能停用/降级自己） */
const selfUsername = computed(() => authStore.admin?.username ?? '')

/* ═══ 列表状态 ═══ */
const loading = ref(false)
const rows = ref<AdminAccountRow[]>([])

async function load(): Promise<void> {
  loading.value = true
  await new Promise((r) => window.setTimeout(r, 260))
  rows.value = queryAdminAccounts()
  loading.value = false
}

onMounted(() => void load())

/* ═══ 角色下拉选项（字典同源，顺序固定管理员在前）═══ */
const roleOptions: OptionItem[] = (['ADMIN', 'OPERATOR'] as AdminRole[]).map((role) => ({
  label: ADMIN_ROLE_LABELS[role],
  value: role,
}))

/* ═══ 新增账号弹窗 ═══ */
const createFields: FormFieldConfig[] = [
  {
    prop: 'username',
    label: '登录名',
    placeholder: '3-32 位字母、数字或下划线，创建后不可改',
    required: true,
    rules: [
      { required: true, message: '请填写登录名', trigger: 'blur' },
      {
        pattern: /^[a-zA-Z0-9_]{3,32}$/,
        message: '仅支持 3-32 位字母、数字或下划线',
        trigger: 'blur',
      },
    ],
    props: { maxlength: 32 },
  },
  {
    prop: 'realName',
    label: '真实姓名',
    placeholder: '用于后台显示名',
    props: { maxlength: 32 },
  },
  {
    prop: 'role',
    label: '角色',
    control: 'select',
    defaultValue: 'OPERATOR',
    options: roleOptions,
    required: true,
  },
  {
    prop: 'password',
    label: '初始密码',
    control: 'password',
    placeholder: '至少 6 位，服务端 BCrypt 哈希入库',
    required: true,
    rules: [
      { required: true, message: '请填写初始密码', trigger: 'blur' },
      { min: 6, message: '密码至少 6 位', trigger: 'blur' },
    ],
    props: { maxlength: 64, showPassword: true },
  },
  {
    prop: 'enabled',
    label: '启用状态',
    control: 'switch',
    defaultValue: true,
    props: { activeText: '启用', inactiveText: '停用' },
  },
]

const createDialog = createFormDialog<AdminAccountCreateForm>({
  name: 'admin-create',
  width: 500,
  labelWidth: '90px',
  defaultSpan: 24,
  okText: '创建',
  fields: createFields,
})

async function openCreate(): Promise<void> {
  const result = await createDialog.open({
    title: '新增账号',
    username: '',
    realName: '',
    role: 'OPERATOR',
    password: '',
    enabled: true,
  })
  if (result.action !== DialogAction.Confirm || !result.data) return
  try {
    createAdminAccount(result.data as AdminAccountCreateForm)
    ElMessage.success('账号已创建，可告知对方登录名与初始密码')
    void load()
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

/* ═══ 编辑账号弹窗（登录名不可改，不含密码）═══ */
const editFields: FormFieldConfig[] = [
  {
    prop: 'realName',
    label: '真实姓名',
    placeholder: '用于后台显示名',
    props: { maxlength: 32 },
  },
  {
    prop: 'role',
    label: '角色',
    control: 'select',
    options: roleOptions,
    required: true,
  },
  {
    prop: 'enabled',
    label: '启用状态',
    control: 'switch',
    props: { activeText: '启用', inactiveText: '停用' },
  },
]

const editDialog = createFormDialog<AdminAccountUpdateForm>({
  name: 'admin-edit',
  width: 500,
  labelWidth: '90px',
  defaultSpan: 24,
  okText: '保存',
  fields: editFields,
})

const editingId = ref('')

async function openEdit(row: AdminAccountRow): Promise<void> {
  editingId.value = row.id
  const result = await editDialog.open({
    title: `编辑账号 · ${row.username}`,
    realName: row.realName,
    role: row.role,
    enabled: row.enabled,
  })
  if (result.action !== DialogAction.Confirm || !result.data) return
  try {
    updateAdminAccount(editingId.value, result.data as AdminAccountUpdateForm, selfUsername.value)
    ElMessage.success('账号已保存')
    void load()
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

/* ═══ 重置密码弹窗 ═══ */
const resetDialog = createFormDialog<ResetPasswordForm>({
  name: 'admin-reset',
  width: 440,
  labelWidth: '90px',
  defaultSpan: 24,
  okText: '重置',
  fields: [
    {
      prop: 'password',
      label: '新密码',
      control: 'password',
      placeholder: '至少 6 位',
      required: true,
      rules: [
        { required: true, message: '请填写新密码', trigger: 'blur' },
        { min: 6, message: '密码至少 6 位', trigger: 'blur' },
      ],
      props: { maxlength: 64, showPassword: true },
    },
  ],
})

const resettingRow = ref<AdminAccountRow | null>(null)

async function openReset(row: AdminAccountRow): Promise<void> {
  resettingRow.value = row
  const result = await resetDialog.open({ title: `重置密码 · ${row.username}`, password: '' })
  if (result.action !== DialogAction.Confirm || !result.data) return
  try {
    resetPassword(row.id, (result.data as ResetPasswordForm).password)
    ElMessage.success(`已重置「${row.username}」的登录密码`)
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

/* ═══ 启停切换（失败回滚视觉）═══ */
async function handleToggle(row: AdminAccountRow, enabled: boolean): Promise<void> {
  try {
    toggleAdminEnabled(row.id, enabled, selfUsername.value)
    ElMessage.success(enabled ? '账号已启用' : '账号已停用')
    void load()
  } catch (e) {
    ElMessage.error((e as Error).message)
    void load()
  }
}

/* ═══ 头像首字符（与用户管理/Navbar 同款规则）═══ */
function avatarChar(name: string): string {
  const n = name || '?'
  return /[a-zA-Z]/.test(n[0] ?? '') ? n[0].toUpperCase() : n.slice(0, 1)
}

/* ═══ 表格列 ═══ */
const columns: TableColumn[] = [
  {
    label: '账号',
    minWidth: 200,
    render: ({ row }) => {
      const r = row as AdminAccountRow
      const isSelf = r.username === selfUsername.value
      return h('div', { class: 'admin-main' }, [
        h(ElAvatar, { size: 36 }, () => avatarChar(r.realName || r.username)),
        h('div', { class: 'admin-meta' }, [
          h('div', { class: 'admin-name' }, [
            h('span', { title: r.username }, r.username),
            isSelf
              ? h(ElTag, { type: 'primary', size: 'small', effect: 'plain' }, () => '当前')
              : null,
          ]),
          h('div', { class: 'admin-sub' }, r.realName || '—'),
        ]),
      ])
    },
  },
  {
    label: '角色',
    width: 110,
    align: 'center',
    render: ({ row }) => {
      const role = (row as AdminAccountRow).role
      const isAdmin = role === 'ADMIN'
      return h(
        ElTag,
        { type: isAdmin ? 'danger' : 'info', effect: isAdmin ? 'dark' : 'light' },
        () => ADMIN_ROLE_LABELS[role] ?? role,
      )
    },
  },
  {
    label: '启用状态',
    width: 110,
    align: 'center',
    render: ({ row }) => {
      const r = row as AdminAccountRow
      const isSelf = r.username === selfUsername.value
      return h(ElSwitch, {
        modelValue: r.enabled,
        // 当前登录人禁止停用自己
        disabled: isSelf,
        activeText: '',
        inactiveText: '',
        onChange: (val: boolean | string | number) => void handleToggle(r, Boolean(val)),
      })
    },
  },
  {
    label: '最近登录',
    width: 160,
    render: ({ row }) =>
      h('span', { class: 'nowrap' }, fmtTime((row as AdminAccountRow).lastLoginAt)),
  },
  {
    label: '创建时间',
    width: 160,
    render: ({ row }) =>
      h('span', { class: 'nowrap' }, fmtTime((row as AdminAccountRow).createdAt)),
  },
]

/* ═══ 操作列：编辑 / 重置密码 ═══ */
const actions: TableActions = {
  width: 150,
  fixed: 'right',
  buttons: [
    {
      text: '编辑',
      type: 'primary',
      icon: 'Edit',
      onClick: (row) => void openEdit(row as AdminAccountRow),
    },
    {
      text: '重置密码',
      type: 'warning',
      icon: 'Key',
      onClick: (row) => void openReset(row as AdminAccountRow),
    },
  ],
}
</script>

<template>
  <div class="page">
    <div class="card">
      <h3 class="card-title">
        管理员账号<span class="sub">后台登录账号，离职人员请停用而非删除</span>
        <el-button type="primary" :icon="Plus" @click="openCreate()">新增账号</el-button>
      </h3>

      <ProTable
        :columns="columns"
        :data="rows"
        :loading="loading"
        :actions="actions"
        stripe
        row-key="id"
        :auto-fit="true"
        empty-text="暂无账号"
      />
    </div>
  </div>
</template>

<style scoped>
.admin-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.admin-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.admin-sub {
  font-size: 12px;
  color: var(--app-text-secondary);
  font-weight: 400;
}
</style>
