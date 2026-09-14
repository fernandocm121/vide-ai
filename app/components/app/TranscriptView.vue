<script setup lang="ts">
import { formatTimestamp } from '~/utils/media'

interface Segment {
  idx: number
  startMs: number
  endMs: number
  text: string
}

const props = defineProps<{
  text: string
  segments: Segment[]
  activeMs?: number
}>()

const emit = defineEmits<{ seek: [ms: number] }>()

const mode = ref<'segments' | 'full'>('segments')

const activeIdx = computed(() => {
  if (props.activeMs == null) return -1
  return props.segments.findIndex(
    (s) => props.activeMs! >= s.startMs && props.activeMs! < s.endMs,
  )
})

async function copyText() {
  try {
    await navigator.clipboard.writeText(props.text)
  } catch {
    /* clipboard indisponível */
  }
}
</script>

<template>
  <div class="rounded-2xl border border-line bg-paper">
    <div
      class="flex items-center justify-between gap-3 border-b border-line px-4 py-3"
    >
      <div class="flex gap-1 rounded-lg bg-paper-2 p-1">
        <button
          class="rounded-md px-3 py-1 text-xs font-semibold transition-colors"
          :class="
            mode === 'segments'
              ? 'bg-paper text-ink shadow-sm'
              : 'text-ink-soft'
          "
          @click="mode = 'segments'"
        >
          Segmentos
        </button>
        <button
          class="rounded-md px-3 py-1 text-xs font-semibold transition-colors"
          :class="
            mode === 'full' ? 'bg-paper text-ink shadow-sm' : 'text-ink-soft'
          "
          @click="mode = 'full'"
        >
          Texto corrido
        </button>
      </div>
      <button
        class="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
        @click="copyText"
      >
        Copiar texto
      </button>
    </div>

    <div
      v-if="mode === 'segments'"
      class="max-h-128 divide-y divide-line overflow-y-auto"
    >
      <button
        v-for="seg in segments"
        :key="seg.idx"
        class="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-paper-2"
        :class="seg.idx === activeIdx ? 'bg-brand-50/60' : ''"
        @click="emit('seek', seg.startMs)"
      >
        <span class="shrink-0 pt-0.5 font-mono text-xs text-brand-600">
          {{ formatTimestamp(seg.startMs) }}
        </span>
        <span class="text-sm leading-relaxed text-ink">{{ seg.text }}</span>
      </button>
    </div>

    <p
      v-else
      class="max-h-128 overflow-y-auto whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-ink"
    >
      {{ text }}
    </p>
  </div>
</template>
