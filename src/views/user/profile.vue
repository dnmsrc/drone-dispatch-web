<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 个人中心（UI 复刻原型 admin/src/views/user/profile.vue）
//
// 左右两栏：
//   左：当前登录人资料卡（头像 / 姓名 / 角色标签 / 账号信息 descriptions）
//   右：修改密码表单（原密码 / 新密码 6-20 位 / 确认新密码，含一致性校验）
// 与原型的两处正式版调整：
//   - 头像：原型用 /api/media/avatar/admin-:username 在线图，静态页不依赖媒体服务，
//     改用与 Navbar / 用户管理一致的「昵称首字符」圆形头像
//   - 数据：直接读 stores/auth 的当前登录人（后端 /auth/me 同源），不再走原型 mock
// 后端暂无修改密码接口，提交仅做前端校验，通过后给演示提示（与原型行为一致）。
// TODO(server): 后端提供改密接口后，把 submitPwd 的提示换成真实请求即可。
// ─────────────────────────────────────────────────────────────
import { computed, reactive, ref } from 'vue'
import type { FormInstance, FormItemRule } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

/** 头像首字符：中文取首字、英文取大写首字母（与 Navbar / 用户管理同款规则） */
const avatarChar = computed(() => {
  const n = auth.displayName || '?'
  return /[a-zA-Z]/.test(n[0] ?? '') ? n[0].toUpperCase() : n.slice(0, 1)
})

/** 角色标签文案 */
const roleText = computed(() => (auth.isAdmin ? '管理员' : '操作员'))
/** 权限范围说明（对齐原型文案） */
const permissionText = computed(() =>
  auth.isAdmin
    ? '全部功能（接单执行 / 退款审批 / 档期与系统配置）'
    : '接单执行、档期查看（无退款审批与配置权限）',
)

/* ═══ 修改密码表单 ═══ */
const pwdRef = ref<FormInstance>()
const pwd = reactive({ oldPwd: '', newPwd: '', confirmPwd: '' })

const pwdRules: Record<string, FormItemRule[]> = {
  oldPwd: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPwd: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度为 6-20 位', trigger: 'blur' },
  ],
  confirmPwd: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value === pwd.newPwd) callback()
        else callback(new Error('两次输入的密码不一致'))
      },
      trigger: 'blur',
    },
  ],
}

async function submitPwd(): Promise<void> {
  const valid = await pwdRef.value?.validate().catch(() => false)
  if (!valid) return
  // 后端暂无改密接口：校验通过即提示（与原型演示行为一致），并清空表单
  ElMessage.info('演示环境不支持修改密码')
  pwdRef.value?.resetFields()
}
</script>

<template>
  <div class="page">
    <el-row :gutter="16">
      <!-- 左：资料卡 -->
      <el-col :xs="24" :md="10">
        <div class="card profile-card">
          <el-avatar :size="88">{{ avatarChar }}</el-avatar>
          <h2 class="name">{{ auth.displayName }}</h2>
          <el-tag :type="auth.isAdmin ? 'danger' : 'primary'" effect="light">
            {{ roleText }}
          </el-tag>
          <el-descriptions :column="1" border class="profile-desc">
            <el-descriptions-item label="登录账号">
              {{ auth.admin?.username }}
            </el-descriptions-item>
            <el-descriptions-item label="姓名">{{ auth.displayName }}</el-descriptions-item>
            <el-descriptions-item label="角色">{{ auth.admin?.role }}</el-descriptions-item>
            <el-descriptions-item label="权限范围">{{ permissionText }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </el-col>

      <!-- 右：修改密码 -->
      <el-col :xs="24" :md="14">
        <div class="card">
          <h3 class="card-title">修改密码</h3>
          <el-form ref="pwdRef" :model="pwd" :rules="pwdRules" label-width="90px" class="pwd-form">
            <el-form-item label="原密码" prop="oldPwd">
              <el-input
                v-model="pwd.oldPwd"
                type="password"
                show-password
                placeholder="请输入原密码"
              />
            </el-form-item>
            <el-form-item label="新密码" prop="newPwd">
              <el-input
                v-model="pwd.newPwd"
                type="password"
                show-password
                placeholder="6-20 位字符"
              />
            </el-form-item>
            <el-form-item label="确认新密码" prop="confirmPwd">
              <el-input
                v-model="pwd.confirmPwd"
                type="password"
                show-password
                placeholder="再次输入新密码"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="submitPwd">保存修改</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px;
}

.name {
  margin: 14px 0 8px;
  font-size: 20px;
  color: #303133;
}

.profile-desc {
  width: 100%;
  margin-top: 22px;
}

.pwd-form {
  max-width: 420px;
}
</style>
