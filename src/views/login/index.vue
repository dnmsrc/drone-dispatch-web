<script setup lang="ts">
/**
 * 登录页（静态版）—— UI 与交互完全参照原型 drone-dispatch-prototype/admin/src/views/login/index.vue。
 *
 * 与原型版的差异仅两处：
 *   1. 移除「原型专用」的 ProtoTip 悬浮评审说明（原型注释即注明正式系统删除）；
 *   2. 登录动作暂由本页的演示账号逻辑完成（原型走 mock-server /admin/login）。
 *
 * 接入服务端后：此处替换为 auth store 调 POST /admin/login，
 * 拿到的 token 经 setToken()（AES-GCM 加密写 Cookie，见 utils/http）持久化，
 * 「记住密码」等体验逻辑不变。
 */
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Key, Lock, User } from '@element-plus/icons-vue'
import { brand } from '@/config/brand'
import { useAuthStore } from '@/stores/auth'

/** 表单模型（与原型字段一致） */
interface LoginForm {
  username: string
  password: string
  captcha: string
  remember: boolean
}

/** 伪验证码的单个字符：内容固定，视觉随机（旋转/偏移/颜色），还原原型手绘感 */
interface CaptchaChar {
  text: string
  deg: number
  dy: number
  color: string
}

/** 演示账号（原型 mock-server 同款）；接入服务端后随真实登录接口移除 */
const DEMO_ACCOUNTS: Record<string, string> = {
  admin: 'admin123',
  operator: 'operator123',
}

/** 演示验证码固定内容 */
const CAPTCHA_TEXT = '1234'

/** 「记住密码」本地存储键（存的是演示账号回显，非 token；原型同款 remember_account，
 *  注意不可与登录态键 admin_info 同名，否则 remember=false 的 removeItem 会把登录态抹掉） */
const REMEMBER_KEY = 'remember_account'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive<LoginForm>({ username: '', password: '', captcha: '', remember: false })

const rules: FormRules<LoginForm> = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  captcha: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
}

const captchaChars = ref<CaptchaChar[]>([])

/** 刷新验证码视觉样式（内容恒为 1234，仅字符角度/位移/颜色随机） */
function shuffle(): void {
  const colors = ['#2b5876', '#4e4376', '#409EFF', '#7b5ea7']
  captchaChars.value = CAPTCHA_TEXT.split('').map((text, i) => ({
    text,
    deg: Math.floor(Math.random() * 30) - 15,
    dy: Math.floor(Math.random() * 6) - 3,
    color: colors[(i + Math.floor(Math.random() * 4)) % colors.length],
  }))
}

onMounted(() => {
  shuffle()
  try {
    const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null') as {
      username?: string
      password?: string
    } | null
    if (saved) {
      form.username = saved.username ?? ''
      form.password = saved.password ?? ''
      form.remember = true
    }
  } catch {
    localStorage.removeItem(REMEMBER_KEY)
  }
})

/** 模拟一次登录请求：校验演示账号密码（错误文案与原型 mock-server 一致） */
async function mockLogin(username: string, password: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 600))
  if (DEMO_ACCOUNTS[username] !== password) {
    throw new Error('账号或密码错误')
  }
}

async function submit(): Promise<void> {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return // 字段级红字已提示，无需额外弹层
  }
  if (form.captcha !== CAPTCHA_TEXT) {
    ElMessage.error(`验证码错误，演示验证码为 ${CAPTCHA_TEXT}`)
    shuffle()
    return
  }
  loading.value = true
  try {
    await mockLogin(form.username, form.password)
    // 写入登录态（角色控制依据，如退款审批仅 ADMIN 可见）；键名与原型 admin_info 一致
    auth.loginAs(form.username)
    // TODO(接入服务端): auth store 登录后调用 setToken(token) 完成加密持久化
    if (form.remember) {
      localStorage.setItem(
        REMEMBER_KEY,
        JSON.stringify({ username: form.username, password: form.password }),
      )
    } else {
      localStorage.removeItem(REMEMBER_KEY)
    }
    ElMessage.success('登录成功，欢迎回来')
    // redirect query 只接受站内绝对路径，防开放重定向
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    router.push(redirect.startsWith('/') ? redirect : '/')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '登录失败，请稍后重试')
    shuffle()
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
        <el-form-item prop="captcha">
          <div class="captcha-row">
            <el-input
              v-model="form.captcha"
              placeholder="验证码"
              :prefix-icon="Key"
              maxlength="4"
              @keyup.enter="submit"
            />
            <div class="captcha-img" title="演示验证码固定为 1234" @click="shuffle">
              <span
                v-for="(ch, i) in captchaChars"
                :key="i"
                :style="{
                  transform: `rotate(${ch.deg}deg) translateY(${ch.dy}px)`,
                  color: ch.color,
                }"
                >{{ ch.text }}</span
              >
            </div>
          </div>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="form.remember">记住密码</el-checkbox>
        </el-form-item>
        <el-button class="login-btn" type="primary" size="large" :loading="loading" @click="submit">
          登 录
        </el-button>
      </el-form>

      <div class="demo-tip">
        <p>演示账号：admin / admin123（管理员）</p>
        <p>operator / operator123（操作员）</p>
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

.captcha-row {
  display: flex;
  width: 100%;
  gap: 10px;
}

.captcha-img {
  width: 118px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 4px;
  background: linear-gradient(120deg, #eef2fb, #e6e9f5);
  border: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  position: relative;
}

.captcha-img::after {
  content: '';
  position: absolute;
  left: 6px;
  right: 6px;
  top: 50%;
  height: 1px;
  background: rgba(78, 67, 118, 0.35);
  transform: rotate(-4deg);
}

.captcha-img span {
  display: inline-block;
  font-size: 20px;
  font-weight: 700;
  font-style: italic;
  margin: 0 3px;
  font-family: Georgia, serif;
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
