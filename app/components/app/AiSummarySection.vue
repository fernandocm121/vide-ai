<script setup lang="ts">
type SummaryLength = 'short' | 'medium' | 'detailed'

interface SummaryStatusResponse {
  status: 'empty' | 'generating' | 'ready' | 'failed'
  content?: string
  generatedAt?: string
  error?: string | null
}

const props = defineProps<{ videoId: string }>()
const { t } = useI18n()

const length = ref<SummaryLength>('medium')

const {
  status,
  content,
  generatedAt,
  error,
  busy,
  generate,
  retry,
  refresh,
} = useAiGeneration<string>({
  get: () =>
    $fetch<SummaryStatusResponse>(`/api/videos/${props.videoId}/summary`, {
      query: { length: length.value },
    }),
  post: () =>
    $fetch(`/api/videos/${props.videoId}/summary`, {
      method: 'POST',
      body: { length: length.value },
    }).then(() => undefined),
})

// trocar o length é um recurso diferente (cacheado à parte) — refaz o fetch
// já mostrando vazio até a resposta chegar, em vez de piscar o conteúdo antigo
watch(length, () => {
  status.value = 'empty'
  content.value = undefined
  refresh()
})

const LENGTHS: { value: SummaryLength; labelKey: string }[] = [
  { value: 'short', labelKey: 'aiFeatures.summary.short' },
  { value: 'medium', labelKey: 'aiFeatures.summary.medium' },
  { value: 'detailed', labelKey: 'aiFeatures.summary.detailed' },
]

async function copyText() {
  if (!content.value) return
  try {
    await navigator.clipboard.writeText(content.value)
  } catch {
    /* clipboard indisponível */
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex justify-end gap-1">
      <button
        v-for="l in LENGTHS"
        :key="l.value"
        type="button"
        class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
        :class="
          l.value === length
            ? 'bg-brand-500 text-white'
            : 'border border-line text-ink-soft hover:bg-paper-2'
        "
        @click="length = l.value"
      >
        {{ t(l.labelKey) }}
      </button>
    </div>

    <AppAiGenerateCard
      icon="file-text"
      :title="t('aiFeatures.summary.emptyTitle')"
      :description="t('aiFeatures.summary.emptyDescription')"
      :cta-label="t('aiFeatures.summary.cta')"
      :status="status"
      :generated-at="generatedAt"
      :error="error"
      :busy="busy"
      @generate="generate"
      @retry="retry"
    >
      <div class="flex flex-col gap-3">
        <p class="whitespace-pre-wrap text-sm leading-relaxed text-ink">
          {{ content }}
        </p>
        <div class="flex justify-end">
          <button
            class="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
            @click="copyText"
          >
            {{ t('aiFeatures.common.copy') }}
          </button>
        </div>
      </div>
    </AppAiGenerateCard>
  </div>
</template>
