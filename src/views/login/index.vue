<script setup lang="ts">
/**
 * 登录页 —— 对接后端 JWT 登录（POST /api/auth/login）。
 *
 * UI 沿用原型 admin/src/views/login/index.vue 的视觉与布局，按正式系统调整：
 *   1. 移除「原型专用」的 ProtoTip 悬浮评审说明；
 *   2. 移除原型的本地伪验证码与演示账号 mock，改为 auth store 真实登录；
 *   3. 「记住账号」仅回显上次登录账号（不再回显明文密码），体验保留、更安全。
 *
 * 登录成功后 token 由 store 经 setToken()（AES-GCM 加密写 Cookie）持久化，
 * 用户信息写 localStorage；请求层后续自动注入 Authorization: Bearer。
 */
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'
import { brand } from '@/config/brand'
import { useAuthStore } from '@/stores/auth'

/** 表单模型（后端 LoginRequest 只需要 username/password） */
interface LoginForm {
  username: string
  password: string
  remember: boolean
}

/** 「记住账号」本地存储键（只存账号名；不可与登录态键 admin_info 同名） */
const REMEMBER_KEY = 'remember_account'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive<LoginForm>({ username: '', password: '', remember: false })

const rules: FormRules<LoginForm> = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

onMounted(() => {
  // 仅回显账号名；密码不在本地留存
  const savedUsername = localStorage.getItem(REMEMBER_KEY)
  if (savedUsername) {
    form.username = savedUsername
    form.remember = true
  }
})

async function submit(): Promise<void> {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return // 字段级红字已提示，无需额外弹层
  }
  loading.value = true
  try {
    await auth.login({
      username: form.username.trim(),
      password: form.password,
    })
    // 记住账号：仅存账号名；取消勾选则清除
    if (form.remember) {
      localStorage.setItem(REMEMBER_KEY, form.username.trim())
    } else {
      localStorage.removeItem(REMEMBER_KEY)
    }
    ElMessage.success('登录成功，欢迎回来')
    // redirect query 只接受站内绝对路径，防开放重定向
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    router.push(redirect.startsWith('/') ? redirect : '/')
  } catch {
    // 账号密码错误/停用等提示已由请求层统一弹出（HttpError.message 即后端 message），
    // 这里无需重复提示，仅结束 loading
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="glow glow-1"></div>
    <div class="glow glow-2"></div>

    <div class="login-card">
      <div class="brand">
        <svg viewBox="0 0 48 48" width="44" height="44" fill="none">
          <circle cx="10" cy="10" r="7" stroke="var(--el-color-primary)" stroke-width="2.5" />
          <circle cx="38" cy="10" r="7" stroke="var(--el-color-primary)" stroke-width="2.5" />
          <circle cx="10" cy="38" r="7" stroke="var(--el-color-primary)" stroke-width="2.5" />
          <circle cx="38" cy="38" r="7" stroke="var(--el-color-primary)" stroke-width="2.5" />
          <rect x="18" y="18" width="12" height="12" rx="3" fill="var(--el-color-primary)" />
          <path
            d="M15 15l5 5M33 15l-5 5M15 33l5-5M33 33l-5-5"
            stroke="var(--el-color-primary)"
            stroke-width="2.5"
            stroke-linecap="round"
          />
        </svg>
        <h1>{{ brand.appName }}</h1>
        <p>{{ brand.adminTitle }}</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" size="large" @submit.prevent>
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入账号" :prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
            :prefix-icon="Lock"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="form.remember">记住账号</el-checkbox>
        </el-form-item>
        <el-button class="login-btn" type="primary" size="large" :loading="loading" @click="submit">
          登 录
        </el-button>
      </el-form>

      <div class="demo-tip">
        <p>初始管理员：admin / admin123</p>
        <p>首次登录后请尽快修改默认密码</p>
      </div>
    </div>

    <div class="footer">{{ brand.footer }}</div>
  </div>
</template>

<style scoped>
/* 以下样式逐条复刻原型 login/index.vue，仅将品牌主色 #409EFF 改用 EP 主题变量，
   默认主题下视觉完全一致，切换主题包时自动适配 */
.login-page {
  height: 100vh;
  background: linear-gradient(135deg, #2b5876 0%, #4e4376 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.35;
}

.glow-1 {
  width: 420px;
  height: 420px;
  background: var(--el-color-primary);
  top: -120px;
  left: -100px;
}

.glow-2 {
  width: 380px;
  height: 380px;
  background: #9b59b6;
  bottom: -100px;
  right: -80px;
}

.login-card {
  width: 400px;
  max-width: calc(100vw - 32px);
  background: #fff;
  border-radius: 8px;
  padding: 36px 36px 28px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
  position: relative;
  z-index: 1;
}

@media (max-width: 480px) {
  .login-card {
    padding: 28px 22px 22px;
  }
}

.brand {
  text-align: center;
  margin-bottom: 26px;
}

.brand h1 {
  margin: 10px 0 4px;
  font-size: 24px;
  color: #303133;
  letter-spacing: 2px;
}

.brand p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.login-btn {
  width: 100%;
  letter-spacing: 8px;
  font-size: 16px;
}

.demo-tip {
  margin-top: 18px;
  background: #f4f6fb;
  border: 1px dashed #c8d0e0;
  border-radius: 4px;
  padding: 8px 14px;
}

.demo-tip p {
  margin: 4px 0;
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.footer {
  position: absolute;
  bottom: 18px;
  width: 100%;
  text-align: center;
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  letter-spacing: 1px;
}
</style>
