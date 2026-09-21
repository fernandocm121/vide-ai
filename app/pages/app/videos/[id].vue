<script setup lang="ts">
import { IN_PROGRESS, formatDuration, type VideoStatus } from '~/utils/media'

definePageMeta({ layout: 'app' })
const { t } = useI18n()

interface VideoDetail {
  id: string
  title: string
  status: VideoStatus
  mediaKind: 'audio' | 'video'
  originalFilename: string | null
  durationSeconds: number | null
  sizeBytes: number | null
  language: string | null
  error: string | null
  createdAt: string
  mediaUrl: string | null
  transcript: {
    text: string
    language: string | null
    provider: string | null
    segments: {
      id: string
      idx: number
      startMs: number
      endMs: number
      text: string
    }[]
    wordCount: number
  } | null
}

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const {
  data: video,
  refresh,
  error,
} = await useFetch<VideoDetail>(() => `/api/videos/${id}`)

useHead(() => ({
  title: `${video.value?.title ?? t('app.videoDetail.back')} — Vide AI`,
}))

const statusLabel = computed(() => {
  if (!video.value) return ''
  const key = `statusBadge.${video.value.status}` as 'statusBadge.queued'
  return t(key)
})

// transcrições feitas antes da migração para o Scribe v2 não têm timestamps,
// então não dá para gerar legenda a partir delas
const hasSubtitles = computed(
  () => (video.value?.transcript?.segments?.length ?? 0) > 0,
)

/* polling enquanto está processando ------------------------------------ */
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    if (video.value && IN_PROGRESS.includes(video.value.status)) refresh()
  }, 3000)
})
onBeforeUnmount(() => timer && clearInterval(timer))

/* ações --------------------------------------------------------------- */
const busy = ref(false)
const actionError = ref<string | null>(null)
// evita reexibir o botão de processar enquanto o job já foi solicitado
// mas o status ainda não saiu de `queued` (curta janela de corrida)
const requested = ref(false)

async function transcribe() {
  busy.value = true
  actionError.value = null
  try {
    await $fetch(`/api/videos/${id}/transcribe`, { method: 'POST' })
    requested.value = true
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    actionError.value =
      err?.data?.statusMessage ??
      err?.message ??
      t('app.videoDetail.startError')
  } finally {
    busy.value = false
  }
}

/* player ---------------------------------------------------------------- */
const mediaEl = ref<HTMLAudioElement>()

function seekTo(ms: number) {
  if (!mediaEl.value) return
  mediaEl.value.currentTime = ms / 1000
  mediaEl.value.play()
}

async function remove() {
  if (!confirm(t('app.videoDetail.deleteConfirm'))) return
  busy.value = true
  try {
    await $fetch(`/api/videos/${id}`, { method: 'DELETE' })
    await router.push('/app')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div
    v-if="error"
    class="rounded-xl border border-line bg-paper p-6 text-sm text-ink-soft"
  >
    {{ $t('app.videoDetail.loadError') }}
    <NuxtLink to="/app" class="font-medium text-brand-600">{{
      $t('app.videoDetail.back')
    }}</NuxtLink>
  </div>

  <div v-else-if="video" class="flex flex-col gap-6">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <NuxtLink
          to="/app"
          class="text-xs font-medium text-ink-soft hover:text-ink"
        >
          {{ $t('app.videoDetail.backLink') }}
        </NuxtLink>
        <h1
          class="mt-1 truncate text-2xl font-extrabold tracking-tight text-ink"
        >
          {{ video.title }}
        </h1>
        <p class="mt-1 text-xs text-ink-soft">
          {{ video.originalFilename }}
          <span v-if="video.durationSeconds">
            · {{ formatDuration(video.durationSeconds) }}</span
          >
          <span v-if="video.language"> · {{ video.language }}</span>
        </p>
      </div>
      <AppStatusBadge :status="video.status" />
    </div>

    <!-- player: sempre áudio — para vídeo, é a trilha já extraída -->
    <audio
      v-if="video.mediaUrl"
      ref="mediaEl"
      :src="video.mediaUrl"
      controls
      preload="metadata"
      class="w-full"
    />

    <!-- ações por status -->
    <div class="rounded-xl border border-line bg-paper p-5">
      <template v-if="video.status === 'queued' && !requested">
        <p class="text-sm text-ink">
          {{
            video.mediaKind === 'audio'
              ? $t('app.videoDetail.audioReady')
              : $t('app.videoDetail.videoReady')
          }}
          {{ $t('app.videoDetail.estimatedCost', { cost: 'US$ 0,006' }) }}
        </p>
        <BaseButton class="mt-3" :loading="busy" @click="transcribe">
          {{
            video.mediaKind === 'audio'
              ? $t('app.videoDetail.transcribeAudio')
              : $t('app.videoDetail.processVideo')
          }}
        </BaseButton>
      </template>

      <template
        v-else-if="
          (video.status === 'queued' && requested) ||
          video.status === 'extracting' ||
          video.status === 'transcribing'
        "
      >
        <div class="flex items-center gap-3 text-sm text-ink">
          <span class="size-2 animate-pulse rounded-full bg-amber-500" />
          {{ statusLabel }}…
          <span class="text-ink-soft">{{
            $t('app.videoDetail.processingHint')
          }}</span>
        </div>
      </template>

      <template v-else-if="video.status === 'failed'">
        <p class="text-sm font-medium text-brand-600">
          {{ $t('app.videoDetail.processingFailed') }}
        </p>
        <p v-if="video.error" class="mt-1 text-xs text-ink-soft">
          {{ video.error }}
        </p>
        <BaseButton
          variant="outline"
          class="mt-3"
          :loading="busy"
          @click="transcribe"
        >
          {{ $t('app.videoDetail.retry') }}
        </BaseButton>
      </template>

      <template v-else-if="video.status === 'ready'">
        <p class="text-sm text-ink">
          {{ $t('app.videoDetail.transcriptReady') }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <BaseButton
            variant="outline"
            size="md"
            :href="`/api/videos/${id}/export/txt`"
          >
            {{ $t('app.videoDetail.downloadTxt') }}
          </BaseButton>
          <BaseButton
            variant="outline"
            size="md"
            :href="`/api/videos/${id}/export/json`"
          >
            {{ $t('app.videoDetail.downloadJson') }}
          </BaseButton>
          <!-- legendas só existem quando a transcrição tem timestamps -->
          <template v-if="hasSubtitles">
            <BaseButton
              variant="outline"
              size="md"
              :href="`/api/videos/${id}/export/srt`"
            >
              {{ $t('app.videoDetail.downloadSrt') }}
            </BaseButton>
            <BaseButton
              variant="outline"
              size="md"
              :href="`/api/videos/${id}/export/vtt`"
            >
              {{ $t('app.videoDetail.downloadVtt') }}
            </BaseButton>
          </template>
        </div>
      </template>

      <template v-else>
        <p class="text-sm text-ink-soft">
          {{ $t('app.videoDetail.uploadProcessing') }}
        </p>
      </template>

      <p v-if="actionError" class="mt-3 text-sm text-brand-600">
        {{ actionError }}
      </p>
    </div>

    <!-- transcrição -->
    <AppTranscriptView
      v-if="video.status === 'ready' && video.transcript"
      :text="video.transcript.text"
      :segments="video.transcript.segments"
      @seek="seekTo"
    />

    <!-- excluir -->
    <div class="flex justify-end border-t border-line pt-4">
      <button
        class="text-xs font-medium text-ink-soft transition-colors hover:text-brand-600"
        :disabled="busy"
        @click="remove"
      >
        {{ $t('app.videoDetail.delete') }}
      </button>
    </div>
  </div>
</template>
