<script setup lang="ts">
import { formatDuration, type VideoStatus } from '~/utils/media'

definePageMeta({ layout: 'app' })
const { t, locale } = useI18n()
useHead({ title: () => t('app.transcriptions.seoTitle') })

interface VideoRow {
  id: string
  title: string
  status: VideoStatus
  mediaKind: 'audio' | 'video'
  durationSeconds: number | null
  sizeBytes: number | null
  error: string | null
  createdAt: string
}

const {
  data: videos,
  refresh,
  pending,
  error,
} = await useFetch<VideoRow[]>('/api/videos')

const dateFmt = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
)
</script>

<template>
  <div class="flex flex-col gap-8">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">
        {{ $t('app.transcriptions.title') }}
      </h1>
      <p class="mt-1 text-sm text-ink-soft">
        {{ $t('app.transcriptions.subtitle') }}
      </p>
    </div>

    <AppMediaUploader @uploaded="refresh()" />

    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h2
          class="text-sm font-semibold uppercase tracking-wider text-ink-soft"
        >
          {{ $t('app.transcriptions.sentSectionTitle') }}
        </h2>
        <button
          class="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
          @click="refresh()"
        >
          {{ $t('app.transcriptions.refresh') }}
        </button>
      </div>

      <div
        v-if="error"
        class="rounded-2xl border border-line bg-paper px-6 py-12 text-center text-sm text-brand-600"
      >
        {{ $t('app.transcriptions.loadError') }}
      </div>

      <div
        v-else-if="!videos?.length"
        class="rounded-2xl border border-line bg-paper px-6 py-12 text-center text-sm text-ink-soft"
      >
        {{
          pending
            ? $t('app.transcriptions.loading')
            : $t('app.transcriptions.empty')
        }}
      </div>

      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="v in videos"
          :key="v.id"
          class="rounded-xl border border-line bg-paper transition-colors hover:border-ink/20"
        >
          <NuxtLink
            :to="`/app/videos/${v.id}`"
            class="flex items-center gap-4 px-4 py-3.5"
          >
            <div
              class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-ink text-white"
            >
              <AppIcon
                :name="v.mediaKind === 'video' ? 'video' : 'mic'"
                class="size-5"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-ink">
                {{ v.title }}
              </p>
              <p class="mt-0.5 text-xs text-ink-soft">
                {{ dateFmt.format(new Date(v.createdAt)) }}
                <span v-if="v.durationSeconds">
                  · {{ formatDuration(v.durationSeconds) }}</span
                >
              </p>
            </div>
            <AppStatusBadge :status="v.status" />
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
