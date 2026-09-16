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
const query = ref('')

const activeIdx = computed(() => {
  if (props.activeMs == null) return -1
  return props.segments.findIndex(
    (s) => props.activeMs! >= s.startMs && props.activeMs! < s.endMs,
  )
})

/** idx (não índice do array) dos segmentos que batem com a busca, na ordem. */
const matchingIdxs = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return props.segments
    .filter((s) => s.text.toLowerCase().includes(q))
    .map((s) => s.idx)
})

const currentMatch = ref<number | null>(null)
watch(matchingIdxs, (list) => {
  currentMatch.value = list.length ? list[0]! : null
})

const currentMatchPosition = computed(() => {
  if (currentMatch.value == null) return 0
  return matchingIdxs.value.indexOf(currentMatch.value) + 1
})

const segmentRefs = new Map<number, HTMLElement>()
function setSegmentRef(idx: number, el: unknown) {
  if (el instanceof HTMLElement) segmentRefs.set(idx, el)
  else segmentRefs.delete(idx)
}

function goToMatch(direction: 1 | -1) {
  const list = matchingIdxs.value
  if (!list.length) return
  const curPos =
    currentMatch.value == null ? -1 : list.indexOf(currentMatch.value)
  const next = list[(curPos + direction + list.length) % list.length]!
  currentMatch.value = next
  mode.value = 'segments'
  nextTick(() => {
    segmentRefs
      .get(next)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
function highlight(text: string): string {
  const escaped = escapeHtml(text)
  const q = query.value.trim()
  if (!q) return escaped
  const re = new RegExp(escapeRegExp(escapeHtml(q)), 'gi')
  return escaped.replace(
    re,
    (m) => `<mark class="rounded bg-amber-200 text-ink">${m}</mark>`,
  )
}

const highlightedFullText = computed(() => highlight(props.text))

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
      class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3"
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

      <div class="flex items-center gap-2">
        <div class="relative">
          <input
            v-model="query"
            type="search"
            placeholder="Buscar na transcrição…"
            class="h-8 w-44 rounded-lg border border-line bg-paper px-3 text-xs text-ink outline-none transition-colors focus:border-brand-500 sm:w-56"
          />
        </div>
        <template v-if="query.trim()">
          <span class="whitespace-nowrap text-xs text-ink-soft">
            {{
              matchingIdxs.length
                ? `${currentMatchPosition}/${matchingIdxs.length}`
                : '0'
            }}
          </span>
          <button
            class="rounded p-1 text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            :disabled="!matchingIdxs.length"
            title="Ocorrência anterior"
            @click="goToMatch(-1)"
          >
            <AppIcon name="arrow-down" class="size-3.5 rotate-180" />
          </button>
          <button
            class="rounded p-1 text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            :disabled="!matchingIdxs.length"
            title="Próxima ocorrência"
            @click="goToMatch(1)"
          >
            <AppIcon name="arrow-down" class="size-3.5" />
          </button>
        </template>
        <button
          class="whitespace-nowrap text-xs font-medium text-ink-soft transition-colors hover:text-ink"
          @click="copyText"
        >
          Copiar texto
        </button>
      </div>
    </div>

    <div
      v-if="mode === 'segments'"
      class="max-h-128 divide-y divide-line overflow-y-auto"
    >
      <button
        v-for="seg in segments"
        :key="seg.idx"
        :ref="(el) => setSegmentRef(seg.idx, el)"
        class="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-paper-2"
        :class="[
          seg.idx === activeIdx ? 'bg-brand-50/60' : '',
          seg.idx === currentMatch ? 'ring-1 ring-inset ring-amber-400' : '',
        ]"
        @click="emit('seek', seg.startMs)"
      >
        <span class="shrink-0 pt-0.5 font-mono text-xs text-brand-600">
          {{ formatTimestamp(seg.startMs) }}
        </span>
        <span
          class="text-sm leading-relaxed text-ink"
          v-html="highlight(seg.text)"
        />
      </button>
    </div>

    <p
      v-else
      class="max-h-128 overflow-y-auto whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-ink"
      v-html="highlightedFullText"
    />
  </div>
</template>
