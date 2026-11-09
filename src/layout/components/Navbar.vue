<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

defineProps<{
  collapsed: boolean
  isMobile: boolean
}>()

defineEmits<{
  toggle: []
}>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// 登录态来自 stores/auth（登录成功写入；未登录会被路由守卫拦在登录页，这里仅做兜底展示）
const userName = computed(() => auth.displayName)
/** 头像首字符：中文取首字、英文取大写首字母 */
const avatarChar = computed(() => {
  const n = userName.value
  return /[a-zA-Z]/.test(n[0] ?? '') ? n[0].toUpperCase() : n.slice(0, 1)
})

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}

async function onCommand(cmd: string) {
  if (cmd === 'profile') {
    router.push('/user/profile')
    return
  }
  if (cmd === 'logout') {
    await ElMessageBox.confirm('确认退出登录吗？', '提示', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    })
    // JWT 无状态、后端暂无登出接口：store.logout 清除加密 token 密文与本地登录人后回登录页
    auth.logout()
    router.push('/login')
    ElMessage.success('已退出登录')
  }
}
</script>

<template>
  <div class="app-navbar">
    <div class="app-navbar-left">
      <el-icon class="app-navbar-fold" @click="$emit('toggle')">
        <Expand v-if="collapsed" />
        <Fold v-else />
      </el-icon>

      <el-breadcrumb separator="/" class="app-navbar-breadcrumb">
        <el-breadcrumb-item :to="{ path: '/index' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item v-if="route.meta.title && route.path !== '/index'">
          {{ route.meta.title }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="app-navbar-right">
      <el-tooltip content="全屏" placement="bottom">
        <el-icon class="app-navbar-action" @click="toggleFullscreen"><FullScreen /></el-icon>
      </el-tooltip>

      <el-dropdown trigger="click" @command="onCommand">
        <div class="app-navbar-user">
          <el-avatar :size="30">{{ avatarChar }}</el-avatar>
          <span class="app-navbar-user-nick">{{ userName }}</span>
          <el-icon><CaretBottom /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">
              <el-icon><UserFilled /></el-icon>个人中心
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><SwitchButton /></el-icon>退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>
