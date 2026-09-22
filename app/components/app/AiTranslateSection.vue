<script setup lang="ts">
import { dropdownPt } from '~/utils/dropdown-pt'
import { TRANSCRIPTION_LANGUAGES } from '~/utils/transcription-languages'

interface TranslateContent {
  text: string
  hasSubtitles: boolean
}

interface TranslateStatusResponse {
  status: 'empty' | 'generating' | 'ready' | 'failed'
  content?: TranslateContent
  generatedAt?: string
  error?: string | null
}

const props = defineProps<{ videoId: string; originalText: string }>()
const { t } = useI18n()

// idioma-alvo padrão diferente de pt — traduzir pro próprio idioma da
// transcrição não faz sentido como primeira sugestão
const language = ref('en')
const cachedLanguages = ref<string[]>([])

const languageOptions = computed(() =>
  TRANSCRIPTION_LANGUAGES.map((l) => ({
    code: l.code,
    name:
      t(
        `common.languageSwitcher.names.${l.nameKey}` as 'common.languageSwitcher.names.en',
      ) + (cachedLanguages.value.includes(l.code) ? ' ✓' : ''),
  })),
)

async function loadCachedLanguages() {
  try {
    const res = await $fetch<{ languages: string[] }>(
      `/api/videos/${props.videoId}/translate/languages`,
    )
    cachedLanguages.value = res.languages
  } catch {
    /* checkmark é só um indicador visual — sem problema falhar em silêncio */
  }
}
onMounted(loadCachedLanguages)

const {
  status,
  content,
  generatedAt,
  error,
  busy,
  generate,
  retry,
  refresh,
} = useAiGeneration<TranslateContent>({
  get: () =>
    $fetch<TranslateStatusResponse>(`/api/videos/${props.videoId}/translate`, {
      query: { language: language.value },
    }),
  post: () =>
    $fetch(`/api/videos/${props.videoId}/translate`, {
      method: 'POST',
      body: { language: language.value },
    }).then(() => undefined),
})

watch(language, () => {
  status.value = 'empty'
  content.value = undefined
  refresh()
})
watch(status, (s) => {
  if (s === 'ready') loadCachedLanguages()
})

const view = ref<'original' | 'translated'>('translated')
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1.5 sm:max-w-xs">
      <label
        for="translate-language"
        class="text-xs font-medium text-ink-soft"
      >
        {{ t('aiFeatures.translate.languageLabel') }}
      </label>
      <Dropdown
        v-model="language"
        input-id="translate-language"
        :options="languageOptions"
        option-label="name"
        option-value="code"
        :pt="dropdownPt"
      />
    </div>

    <AppAiGenerateCard
      icon="languages"
      :title="t('aiFeatures.translate.emptyTitle')"
      :description="t('aiFeatures.translate.emptyDescription')"
      :cta-label="t('aiFeatures.translate.cta')"
      :status="status"
      :generated-at="generatedAt"
      :error="error"
      :busy="busy"
      @generate="generate"
      @retry="retry"
    >
      <div class="flex flex-col gap-3">
        <div class="flex gap-1">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            :class="
              view === 'original'
                ? 'bg-brand-500 text-white'
                : 'border border-line text-ink-soft hover:bg-paper-2'
            "
            @click="view = 'original'"
          >
            {{ t('aiFeatures.translate.original') }}
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            :class="
              view === 'translated'
                ? 'bg-brand-500 text-white'
                : 'border border-line text-ink-soft hover:bg-paper-2'
            "
            @click="view = 'translated'"
          >
            {{ t('aiFeatures.translate.translated') }}
          </button>
        </div>

        <p
          class="max-h-128 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-ink"
        >
          {{ view === 'original' ? originalText : content?.text }}
        </p>

        <div class="flex flex-wrap gap-2">
          <BaseButton
            variant="outline"
            size="md"
            :href="`/api/videos/${videoId}/translate/export/txt?language=${language}`"
          >
            {{ t('aiFeatures.translate.downloadTxt') }}
          </BaseButton>
          <template v-if="content?.hasSubtitles">
            <BaseButton
              variant="outline"
              size="md"
              :href="`/api/videos/${videoId}/translate/export/srt?language=${language}`"
            >
              {{ t('aiFeatures.translate.downloadSrt') }}
            </BaseButton>
            <BaseButton
              variant="outline"
              size="md"
              :href="`/api/videos/${videoId}/translate/export/vtt?language=${language}`"
            >
              {{ t('aiFeatures.translate.downloadVtt') }}
            </BaseButton>
          </template>
        </div>
      </div>
    </AppAiGenerateCard>
  </div>
</template>
