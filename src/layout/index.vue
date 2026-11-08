<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import Navbar from './components/Navbar.vue'
import TagsView from './components/TagsView.vue'
import AppMain from './components/AppMain.vue'

const manualCollapsed = ref(false) // 桌面端手动折叠
const autoCollapsed = ref(false) // 窄屏（<992px）自动折叠
const isMobile = ref(false) // 手机端（<768px）：侧边栏变抽屉
const drawerOpen = ref(false)

const route = useRoute()

const collapsed = computed(() => manualCollapsed.value || autoCollapsed.value)

function onToggle() {
  if (isMobile.value) drawerOpen.value = !drawerOpen.value
  else manualCollapsed.value = !manualCollapsed.value
}

function onResize() {
  const w = window.innerWidth
  isMobile.value = w < 768
  autoCollapsed.value = w < 992
  if (!isMobile.value) drawerOpen.value = false
}

// 手机端点菜单跳转后自动收起抽屉
watch(
  () => route.path,
  () => {
    drawerOpen.value = false
  },
)

onMounted(() => {
  onResize()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
</script>

<template>
  <div class="app-layout">
    <div v-show="isMobile && drawerOpen" class="app-drawer-mask" @click="drawerOpen = false"></div>
    <Sidebar
      :collapsed="collapsed"
      :is-mobile="isMobile"
      :class="{ 'is-drawer-open': drawerOpen }"
    />
    <div class="app-main-wrap">
      <Navbar :collapsed="collapsed" :is-mobile="isMobile" @toggle="onToggle" />
      <TagsView />
      <AppMain />
    </div>
  </div>
</template>
