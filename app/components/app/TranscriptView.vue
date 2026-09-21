<script setup lang="ts">
import { formatTimestamp } from '~/utils/media'

const { t } = useI18n()

interface Segment {
  id: string
  idx: number
  startMs: number
  endMs: number
  text: string
}

const props = defineProps<{
  text: string
  segments?: Segment[]
}>()

const emit = defineEmits<{
  seek: [ms: number]
}>()

// legendas só existem quando a transcrição tem timestamp (Scribe v2 em diante)
const hasSegments = computed(() => (props.segments?.length ?? 0) > 0)

const query = ref('')

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

const highlightedText = computed(() => highlight(props.text))

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
    <TabView v-if="hasSegments">
      <TabPanel :header="t('transcriptView.fullText')">
        <div class="flex flex-wrap items-center justify-end gap-2">
          <input
            v-model="query"
            type="search"
            :placeholder="t('transcriptView.searchPlaceholder')"
            class="h-8 w-44 rounded-lg border border-line bg-paper px-3 text-xs text-ink outline-none transition-colors focus:border-brand-500 sm:w-56"
          />
          <button
            class="whitespace-nowrap text-xs font-medium text-ink-soft transition-colors hover:text-ink"
            @click="copyText"
          >
            {{ $t('transcriptView.copyText') }}
          </button>
        </div>

        <p
          class="mt-3 max-h-128 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-ink"
          v-html="highlightedText"
        />
      </TabPanel>

      <TabPanel :header="t('transcriptView.segmented')">
        <ul class="max-h-128 overflow-y-auto">
          <li
            v-for="seg in segments"
            :key="seg.id"
            class="flex cursor-pointer gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-paper-2"
            @click="emit('seek', seg.startMs)"
          >
            <span class="shrink-0 font-mono text-xs text-ink-soft">
              {{ formatTimestamp(seg.startMs) }}
            </span>
            <span class="text-ink">{{ seg.text }}</span>
          </li>
        </ul>
      </TabPanel>
    </TabView>

    <template v-else>
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3"
      >
        <span class="text-xs font-semibold text-ink-soft">{{
          $t('transcriptView.label')
        }}</span>

        <div class="flex items-center gap-2">
          <input
            v-model="query"
            type="search"
            :placeholder="$t('transcriptView.searchPlaceholder')"
            class="h-8 w-44 rounded-lg border border-line bg-paper px-3 text-xs text-ink outline-none transition-colors focus:border-brand-500 sm:w-56"
          />
          <button
            class="whitespace-nowrap text-xs font-medium text-ink-soft transition-colors hover:text-ink"
            @click="copyText"
          >
            {{ $t('transcriptView.copyText') }}
          </button>
        </div>
      </div>

      <p
        class="max-h-128 overflow-y-auto whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-ink"
        v-html="highlightedText"
      />
    </template>
  </div>
</template>
