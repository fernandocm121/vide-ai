// @ts-check
import prettier from 'eslint-config-prettier'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Páginas/layouts de nome único são idiomáticos no Nuxt.
    'vue/multi-word-component-names': 'off',
    // Props tipadas via `defineProps<T>()` já documentam o opcional; a regra
    // só gera ruído pedindo `default: undefined`.
    'vue/require-default-prop': 'off',
  },
})
  .prepend({
    ignores: [
      '.nuxt/**',
      '.output/**',
      '.data/**',
      'dist/**',
      'server/db/migrations/**',
    ],
  })
  // Desliga regras de formatação que conflitam com o Prettier — deve vir por último.
  .append(prettier)
