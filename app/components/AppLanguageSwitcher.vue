<script setup lang="ts">
// Idioma anônimo persiste no cookie do @nuxtjs/i18n automaticamente (dentro
// de `setLocale`, via `detectBrowserLanguage.useCookie`); usuário logado
// sincroniza também no banco (`users.preferredLocale`) via PATCH abaixo, pra
// a preferência atravessar dispositivos.
const { t, locale, locales, setLocale } = useI18n()
const { user } = useAuth()

// código do idioma -> código de país do pacote `flag-icons` (classe `fi fi-<code>`)
const FLAG_COUNTRY: Record<string, string> = {
  'pt-BR': 'br',
  en: 'us',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  ja: 'jp',
  ko: 'kr',
}

const options = computed(() =>
  locales.value.map((l) => {
    const code = typeof l === 'string' ? l : l.code
    const name = typeof l === 'string' ? l : (l.name ?? l.code)
    return {
      code,
      name,
      flagClass: `fi fi-${FLAG_COUNTRY[code] ?? 'xx'}`,
      // nome do idioma traduzido pro idioma ativo (ex.: UI em pt-BR mostra
      // "Inglês" do lado de "English") — some pro próprio idioma ativo.
      translated:
        code === locale.value
          ? ''
          : (t(
              `common.languageSwitcher.names.${code}` as 'common.languageSwitcher.names.en',
            ) ?? ''),
    }
  }),
)

const current = computed(
  () => options.value.find((o) => o.code === locale.value) ?? options.value[0],
)

const open = ref(false)
const rootEl = ref<HTMLElement>()

async function select(code: string) {
  open.value = false
  if (code === locale.value) return
  await setLocale(code as typeof locale.value)
  if (user.value) {
    try {
      await $fetch('/api/auth/locale', {
        method: 'PATCH',
        body: { locale: code },
      })
    } catch {
      // idioma já trocou na tela; falha ao sincronizar com o servidor não bloqueia a UI
    }
  }
}

function onClickOutside(e: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="rootEl" class="relative">
    <button
      type="button"
      class="flex h-9 items-center gap-2 rounded-lg border border-line bg-paper px-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper-2"
      :aria-label="$t('common.languageSwitcher.label')"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span
        :class="current?.flagClass"
        class="rounded-[3px] text-lg leading-none"
        aria-hidden="true"
      />
      <span class="hidden sm:inline">{{ current?.name }}</span>
      <AppIcon name="chevron-down" class="size-3.5 text-ink-soft" />
    </button>

    <ul
      v-if="open"
      class="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-paper py-1.5 shadow-xl shadow-ink/10"
    >
      <li v-for="o in options" :key="o.code">
        <button
          type="button"
          class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors"
          :class="
            o.code === locale
              ? 'bg-brand-500 font-semibold text-white'
              : 'text-ink hover:bg-paper-2'
          "
          @click="select(o.code)"
        >
          <span
            :class="o.flagClass"
            class="shrink-0 rounded-[3px] text-lg leading-none"
            aria-hidden="true"
          />
          <span class="font-medium">{{ o.name }}</span>
          <span
            v-if="o.translated"
            class="ml-auto shrink-0 text-xs"
            :class="o.code === locale ? 'text-white/80' : 'text-ink-soft'"
          >
            {{ o.translated }}
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
