/**
 * `pt` (passthrough) do PrimeVue Dropdown pra combinar com o resto da UI
 * (inputs do projeto são todos `h-11 rounded-lg border border-line`) — sem
 * isso o skin padrão do tema (`lara-light-indigo`) usa uma borda cinza clara
 * quase invisível, bem diferente do resto do app.
 *
 * `!important` nas classes porque o CSS do tema do PrimeVue não entra nas
 * `@layer` do Tailwind 4 — sem `!`, as regras do tema (sem layer) vencem as
 * utilities do Tailwind mesmo com especificidade menor (mesmo padrão já
 * usado no `pt` do Toast em `AppToast.vue`).
 */
export const dropdownPt = {
  root: {
    class: '!h-11 !items-center !rounded-lg !border !border-line !bg-paper',
  },
  input: {
    class: '!flex !items-center !py-0 !pl-3 !pr-0 !text-sm !text-ink',
  },
  trigger: {
    class: '!w-10 !text-ink-soft',
  },
  panel: {
    class:
      '!mt-1 !overflow-hidden !rounded-lg !border !border-line !bg-paper !shadow-lg !shadow-ink/10',
  },
  list: {
    class: '!py-1.5',
  },
  item: {
    class: '!px-3 !py-2 !text-sm !text-ink',
  },
} as const
