<script setup lang="ts">
import { formatTimestamp } from '~/utils/media'

interface Chapter {
  title: string
  description: string | null
  startMs: number
}

interface ChaptersStatusResponse {
  status: 'empty' | 'generating' | 'ready' | 'failed'
  content?: Chapter[]
  generatedAt?: string
  error?: string | null
}

const props = defineProps<{ videoId: string }>()
const emit = defineEmits<{ seek: [ms: number] }>()
const { t } = useI18n()

const { status, content, generatedAt, error, busy, generate, retry } =
  useAiGeneration<Chapter[]>({
    get: () =>
      $fetch<ChaptersStatusResponse>(`/api/videos/${props.videoId}/chapters`),
    post: () =>
      $fetch(`/api/videos/${props.videoId}/chapters`, {
        method: 'POST',
      }).then(() => undefined),
  })
</script>

<template>
  <AppAiGenerateCard
    icon="list"
    :title="t('aiFeatures.chapters.emptyTitle')"
    :description="t('aiFeatures.chapters.emptyDescription')"
    :cta-label="t('aiFeatures.chapters.cta')"
    :status="status"
    :generated-at="generatedAt"
    :error="error"
    :busy="busy"
    @generate="generate"
    @retry="retry"
  >
    <ul v-if="content" class="flex flex-col divide-y divide-line">
      <li
        v-for="(chapter, i) in content"
        :key="i"
        class="flex cursor-pointer items-start gap-3 py-3 first:pt-0 last:pb-0"
        @click="emit('seek', chapter.startMs)"
      >
        <span
          class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-white"
        >
          {{ i + 1 }}
        </span>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-ink">
            {{ chapter.title }}
            <span class="font-mono text-xs font-normal text-ink-soft">
              · {{ formatTimestamp(chapter.startMs) }}
            </span>
          </p>
          <p v-if="chapter.description" class="mt-0.5 text-xs text-ink-soft">
            {{ chapter.description }}
          </p>
        </div>
      </li>
    </ul>
  </AppAiGenerateCard>
</template>
