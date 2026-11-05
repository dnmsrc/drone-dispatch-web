import { defineStore } from 'pinia'

export interface TagView {
  path: string
  title: string
  affix: boolean
}

// 多标签页状态（对齐原型 admin/src/store/tagsView.js）
export const useTagsViewStore = defineStore('tagsView', {
  state: () => ({
    visited: [] as TagView[],
  }),
  actions: {
    add(path: string, title: string, affix = false) {
      if (!title) return
      if (this.visited.some((v) => v.path === path)) return
      this.visited.push({ path, title, affix })
    },
    close(path: string) {
      const i = this.visited.findIndex((v) => v.path === path)
      const target = this.visited[i]
      if (i > -1 && target && !target.affix) {
        this.visited.splice(i, 1)
      }
    },
    closeOthers(path: string) {
      this.visited = this.visited.filter((v) => v.affix || v.path === path)
    },
  },
})
