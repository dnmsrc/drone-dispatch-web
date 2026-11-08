<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { menuRoutes } from '@/router'
import { brand } from '@/config/brand'

defineProps<{
  collapsed: boolean
  isMobile: boolean
}>()

const route = useRoute()
const router = useRouter()

// 菜单与路由同源，过滤隐藏路由（如个人中心）
const menus = computed(() => menuRoutes.filter((r) => !r.meta?.hidden))

function goHome() {
  router.push('/index')
}
</script>

<template>
  <aside class="app-sidebar" :style="{ width: isMobile ? '210px' : collapsed ? '64px' : '210px' }">
    <div class="app-sidebar-logo" @click="goHome">
      <span class="app-sidebar-logo-icon">
        <svg viewBox="0 0 48 48" width="30" height="30" fill="none">
          <circle cx="10" cy="10" r="7" stroke="#7db9ff" stroke-width="2.5" />
          <circle cx="38" cy="10" r="7" stroke="#7db9ff" stroke-width="2.5" />
          <circle cx="10" cy="38" r="7" stroke="#7db9ff" stroke-width="2.5" />
          <circle cx="38" cy="38" r="7" stroke="#7db9ff" stroke-width="2.5" />
          <rect x="18" y="18" width="12" height="12" rx="3" fill="#409EFF" />
          <path
            d="M15 15l5 5M33 15l-5 5M15 33l5-5M33 33l-5-5"
            stroke="#7db9ff"
            stroke-width="2.5"
            stroke-linecap="round"
          />
        </svg>
      </span>
      <span v-show="!collapsed || isMobile" class="app-sidebar-logo-text">{{
        brand.adminTitle
      }}</span>
    </div>

    <el-scrollbar class="app-sidebar-menu">
      <el-menu
        class="app-menu"
        :collapse="isMobile ? false : collapsed"
        :default-active="route.path"
        router
        :collapse-transition="false"
      >
        <el-menu-item v-for="item in menus" :key="item.path" :index="'/' + item.path">
          <el-icon><component :is="item.meta?.icon" /></el-icon>
          <template #title>{{ item.meta?.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-scrollbar>
  </aside>
</template>
