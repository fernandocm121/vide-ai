<script setup lang="ts">
import { STATUS_META, type VideoStatus } from '~/utils/media'

const props = defineProps<{ status: VideoStatus }>()

const meta = computed(
  () => STATUS_META[props.status] ?? { label: props.status, tone: 'neutral' },
)

const tones: Record<string, string> = {
  neutral: 'bg-paper-3 text-ink-soft',
  progress: 'bg-amber-50 text-amber-700',
  success: 'bg-emerald-50 text-emerald-700',
  error: 'bg-brand-50 text-brand-700',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
    :class="tones[meta.tone]"
  >
    <span
      v-if="meta.tone === 'progress'"
      class="size-1.5 animate-pulse rounded-full bg-current"
    />
    {{ meta.label }}
  </span>
</template>
