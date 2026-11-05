<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTagsViewStore } from '@/stores/tags-view'

const route = useRoute()
const router = useRouter()
const tags = useTagsViewStore()

const menu = reactive({ visible: false, x: 0, y: 0, targetPath: '' })

// 路由变化时登记页签
watch(
  () => route.fullPath,
  () => tags.add(route.path, route.meta.title ?? '', route.meta.affix === true),
  { immediate: true },
)

function closeTag(path: string, affix: boolean) {
  if (affix) return
  const wasActive = route.path === path
  tags.close(path)
  if (wasActive) {
    const last = tags.visited[tags.visited.length - 1]
    router.push(last ? last.path : '/index')
  }
}

function openMenu(e: MouseEvent, path: string) {
  menu.visible = true
  menu.x = e.clientX
  menu.y = e.clientY
  menu.targetPath = path
}

function closeOthers() {
  tags.closeOthers(menu.targetPath)
  router.push(menu.targetPath)
  menu.visible = false
}

function hideMenu() {
  menu.visible = false
}

onMounted(() => document.addEventListener('click', hideMenu))
onBeforeUnmount(() => document.removeEventListener('click', hideMenu))
</script>

<template>
  <div class="app-tags-view">
    <div class="app-tags-view-scroll">
      <router-link
        v-for="tag in tags.visited"
        :key="tag.path"
        :to="tag.path"
        class="app-tag-item"
        :class="{ 'is-active': route.path === tag.path }"
        @contextmenu.prevent="openMenu($event, tag.path)"
      >
        <span v-if="route.path === tag.path" class="app-tag-item-dot"></span>
        {{ tag.title }}
        <el-icon
          v-if="!tag.affix"
          class="app-tag-item-close"
          @click.prevent.stop="closeTag(tag.path, tag.affix)"
        >
          <Close />
        </el-icon>
      </router-link>
    </div>

    <teleport to="body">
      <ul
        v-show="menu.visible"
        class="app-tags-context-menu"
        :style="{ left: menu.x + 'px', top: menu.y + 'px' }"
      >
        <li @click="closeOthers">关闭其他</li>
      </ul>
    </teleport>
  </div>
</template>
