// ─────────────────────────────────────────────────────────────
// ESLint 9 扁平配置（Flat Config）
//
// 职责分工：
//   - ESLint / typescript-eslint / eslint-plugin-vue：管代码质量与潜在 bug；
//   - Prettier：只管格式化。末尾引入 eslint-config-prettier 关闭与 Prettier 冲突的
//     风格规则，避免「保存时两边互相打架」。
//
// 说明：TS 采用「非类型感知」的 recommended 规则集，重型类型检查交给构建期的
// vue-tsc（build 已强制），避免 lint 与 tsc 双重类型感知拖慢日常体验。
// ─────────────────────────────────────────────────────────────
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  // 全局忽略：产物、覆盖率、依赖不参与 lint
  {
    ignores: ['dist/**', 'dev-dist/**', 'coverage/**', 'node_modules/**'],
  },

  // JS 基础推荐规则
  js.configs.recommended,

  // TypeScript 推荐规则（非类型感知）
  ...tseslint.configs.recommended,

  // Vue 3 推荐规则（flat config 形态）
  ...pluginVue.configs['flat/recommended'],

  // 浏览器侧源码（.ts / .vue 通用）
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2024,
      },
    },
    rules: {
      // 项目存在大量单词命名的页面/组件（dashboard、consult、order 等），
      // 关闭多词组件名限制，与现有命名约定保持一致
      'vue/multi-word-component-names': 'off',
      // 未使用变量主要交给 TS 的 noUnusedLocals 兜底；这里降为 warn 并放行 _ 前缀
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // 前端开发期保留 console；如需在生产收敛，另在 CI 单独约定
      'no-console': 'off',

      // ── 渐进式接入：存量代码暂以 warning 留痕，不阻塞 CI 门禁（0 error）──────────
      // Pro 泛型组件库（ProForm/ProTable/ProSearch 等）以 any 作类型逃逸，共约 40 处，
      // 属通用组件的常见取舍；后续单独开「类型收敛」重构逐个改 unknown/泛型，再提回 error。
      '@typescript-eslint/no-explicit-any': 'warn',
      // ProForm 以「修改传入响应式 model 的属性 + emit change」实现受控表单，
      // 是 Vue3 官方认可的对象属性写法（非整体替换 prop），规则保守误报，降为提示。
      'vue/no-mutating-props': 'warn',
      // Vue3 + TS 下默认值由 withDefaults 承担，Object/Array 非必设 default，降为提示。
      'vue/require-default-prop': 'warn',
    },
  },

  // .vue 文件：以 vue-eslint-parser 为外壳，内部 TS 交给 typescript-eslint 解析
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },

  // Node 侧工程配置文件：放开 Node 全局变量（process、__dirname 等）
  {
    files: ['*.config.js', '*.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // 单元测试：Vitest 采用显式 import，这里补充 Node 全局以防工具函数用到
  {
    files: ['src/**/__tests__/**/*.test.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // 必须置于最后：关闭所有与 Prettier 冲突的风格规则
  prettier,
)
