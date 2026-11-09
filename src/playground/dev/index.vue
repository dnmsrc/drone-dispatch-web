<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 组件测试场 · 外壳
//
// 只在开发环境存在（路由由 main.ts 在 DEV 分支动态注册，生产构建整段剔除）：
//   - 不进入业务菜单、不参与业务路由
//   - 左侧沿用后台同款深色菜单，按组件分组；右侧演示内容
// ─────────────────────────────────────────────────────────────
import { useRoute, useRouter } from 'vue-router'
import { Back } from '@element-plus/icons-vue'
import { devMenuGroups } from './menu'

const route = useRoute()
const router = useRouter()

const HOME_PATH = '/dev/playground/form/basic'

/** 窄屏时侧栏隐藏，用顶部横向导航代替（同一份菜单数据） */
const flatMenuItems = devMenuGroups.flatMap((group) => group.items)

function backToAdmin() {
  router.push('/index')
}
</script>

<template>
  <div class="dev-layout">
    <aside class="app-sidebar dev-sidebar">
      <div class="app-sidebar-logo" @click="router.push(HOME_PATH)">
        <el-icon class="app-sidebar-logo-icon" :size="26"><Monitor /></el-icon>
        <span class="app-sidebar-logo-text">组件测试场</span>
      </div>

      <el-scrollbar class="app-sidebar-menu">
        <el-menu class="app-menu" :default-active="route.path" router>
          <el-menu-item-group v-for="group in devMenuGroups" :key="group.title">
            <template #title>
              <span class="dev-menu-group">
                <el-icon><component :is="group.icon" /></el-icon>
                {{ group.title }}
              </span>
            </template>
            <el-menu-item v-for="item in group.items" :key="item.path" :index="item.path">
              {{ item.title }}
            </el-menu-item>
          </el-menu-item-group>
        </el-menu>
      </el-scrollbar>
    </aside>

    <div class="dev-main">
      <header class="dev-navbar">
        <div class="dev-navbar-left">
          <el-tag type="warning" effect="dark" size="small">仅开发环境</el-tag>
          <span class="dev-navbar-title">公共组件测试场</span>
          <span class="dev-navbar-desc"
            >内部演示与验收页面，不进入业务菜单；生产环境不注册路由</span
          >
        </div>
        <div class="dev-navbar-right">
          <el-button link type="primary" :icon="Back" @click="backToAdmin">
            <span class="dev-back-text">返回业务后台</span>
          </el-button>
        </div>
      </header>

      <nav class="dev-mobile-nav">
        <router-link
          v-for="item in flatMenuItems"
          :key="item.path"
          :to="item.path"
          class="dev-mobile-nav-item"
          :class="{ 'is-active': route.path === item.path }"
        >
          {{ item.title }}
        </router-link>
      </nav>

      <main class="dev-content">
        <router-view />
      </main>
    </div>
  </div>
</template>
