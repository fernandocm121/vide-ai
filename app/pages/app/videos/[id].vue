<script setup lang="ts">
import {
  IN_PROGRESS,
  STATUS_META,
  formatDuration,
  type VideoStatus,
} from '~/utils/media'

definePageMeta({ layout: 'app' })

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

useHead(() => ({ title: `${video.value?.title ?? 'Vídeo'} — Vide AI` }))

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
      'Falha ao iniciar o processamento.'
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (
    !confirm(
      'Excluir este vídeo e a transcrição? Esta ação não pode ser desfeita.',
    )
  )
    return
  busy.value = true
  try {
    await $fetch(`/api/videos/${id}`, { method: 'DELETE' })
    await router.push('/app')
  } finally {
    busy.value = false
  }
}

/* player <-> transcrição --------------------------------------------- */
const mediaEl = ref<HTMLMediaElement>()
const currentMs = ref(0)

function seek(ms: number) {
  if (!mediaEl.value) return
  mediaEl.value.currentTime = ms / 1000
  void mediaEl.value.play()
}
function onTimeUpdate() {
  currentMs.value = (mediaEl.value?.currentTime ?? 0) * 1000
}
</script>

<template>
  <div
    v-if="error"
    class="rounded-xl border border-line bg-paper p-6 text-sm text-ink-soft"
  >
    Não foi possível carregar este vídeo.
    <NuxtLink to="/app" class="font-medium text-brand-600">Voltar</NuxtLink>
  </div>

  <div v-else-if="video" class="flex flex-col gap-6">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <NuxtLink
          to="/app"
          class="text-xs font-medium text-ink-soft hover:text-ink"
        >
          ← Meus vídeos
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

    <!-- player -->
    <video
      v-if="video.mediaKind === 'video' && video.mediaUrl"
      ref="mediaEl"
      :src="video.mediaUrl"
      controls
      preload="metadata"
      class="w-full rounded-xl bg-black"
      @timeupdate="onTimeUpdate"
    />
    <audio
      v-else-if="video.mediaUrl"
      ref="mediaEl"
      :src="video.mediaUrl"
      controls
      preload="metadata"
      class="w-full"
      @timeupdate="onTimeUpdate"
    />

    <!-- ações por status -->
    <div class="rounded-xl border border-line bg-paper p-5">
      <template v-if="video.status === 'queued' && !requested">
        <p class="text-sm text-ink">
          {{
            video.mediaKind === 'audio'
              ? 'O áudio está pronto para transcrever.'
              : 'O vídeo está pronto para processar (extração de áudio + transcrição).'
          }}
          Custo estimado: <span class="font-medium">US$ 0,006 / minuto</span>.
        </p>
        <BaseButton class="mt-3" :loading="busy" @click="transcribe">
          {{
            video.mediaKind === 'audio'
              ? 'Transcrever áudio'
              : 'Processar vídeo'
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
          {{ STATUS_META[video.status].label }}…
          <span class="text-ink-soft">— isso pode levar alguns minutos.</span>
        </div>
      </template>

      <template v-else-if="video.status === 'failed'">
        <p class="text-sm font-medium text-brand-600">
          O processamento falhou.
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
          Tentar de novo
        </BaseButton>
      </template>

      <template v-else-if="video.status === 'ready'">
        <p class="text-sm text-ink">
          Transcrição pronta —
          {{ video.transcript?.segments.length ?? 0 }} segmentos.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <BaseButton
            v-for="fmt in ['txt', 'srt', 'vtt']"
            :key="fmt"
            variant="outline"
            size="md"
            :href="`/api/videos/${id}/export/${fmt}`"
          >
            Baixar .{{ fmt.toUpperCase() }}
          </BaseButton>
        </div>
      </template>

      <template v-else>
        <p class="text-sm text-ink-soft">Processando o upload…</p>
      </template>

      <p v-if="actionError" class="mt-3 text-sm text-brand-600">
        {{ actionError }}
      </p>
    </div>

    <!-- transcrição -->
    <AppTranscriptView
      v-if="video.status === 'ready' && video.transcript"
      :video-id="id"
      :text="video.transcript.text"
      :segments="video.transcript.segments"
      :active-ms="currentMs"
      @seek="seek"
    />

    <!-- excluir -->
    <div class="flex justify-end border-t border-line pt-4">
      <button
        class="text-xs font-medium text-ink-soft transition-colors hover:text-brand-600"
        :disabled="busy"
        @click="remove"
      >
        Excluir vídeo
      </button>
    </div>
  </div>
</template>
