<script setup lang="ts">
import { formatTimestamp } from '~/utils/media'

interface Segment {
  id: string
  idx: number
  startMs: number
  endMs: number
  text: string
}

const props = defineProps<{
  videoId: string
  text: string
  segments: Segment[]
  activeMs?: number
}>()

const emit = defineEmits<{ seek: [ms: number] }>()

const mode = ref<'segments' | 'full'>('segments')
const query = ref('')

/**
 * Cópia local dos segmentos — edições são aplicadas aqui imediatamente
 * (sem esperar um refresh do vídeo inteiro). Resincroniza com a prop
 * quando o pai busca dados novos, exceto durante uma edição em andamento.
 */
const localSegments = ref<Segment[]>(props.segments.map((s) => ({ ...s })))
watch(
  () => props.segments,
  (next) => {
    if (editingId.value) return
    localSegments.value = next.map((s) => ({ ...s }))
  },
)

/** Texto corrido derivado dos segmentos locais — reflete edição na hora. */
const fullText = computed(() =>
  localSegments.value.map((s) => s.text).join(' '),
)

const activeIdx = computed(() => {
  if (props.activeMs == null) return -1
  return localSegments.value.findIndex(
    (s) => props.activeMs! >= s.startMs && props.activeMs! < s.endMs,
  )
})

/** idx (não índice do array) dos segmentos que batem com a busca, na ordem. */
const matchingIdxs = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return localSegments.value
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

const highlightedFullText = computed(() => highlight(fullText.value))

async function copyText() {
  try {
    await navigator.clipboard.writeText(fullText.value)
  } catch {
    /* clipboard indisponível */
  }
}

/* edição por segmento --------------------------------------------------- */
const editingId = ref<string | null>(null)
const draftText = ref('')
const textareaRefs = new Map<string, HTMLTextAreaElement>()

type SaveStatus = { status: 'saving' | 'saved' | 'error'; draft?: string }
const segmentState = reactive<Record<string, SaveStatus>>({})

function setTextareaRef(id: string, el: unknown) {
  if (el instanceof HTMLTextAreaElement) textareaRefs.set(id, el)
  else textareaRefs.delete(id)
}

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}
function onTextareaInput(e: Event) {
  autoResize(e.target as HTMLTextAreaElement)
}
function onTextareaEnter(e: KeyboardEvent) {
  ;(e.target as HTMLTextAreaElement).blur()
}

function startEdit(seg: Segment) {
  editingId.value = seg.id
  draftText.value = seg.text
  nextTick(() => {
    const el = textareaRefs.get(seg.id)
    if (el) {
      el.focus()
      autoResize(el)
    }
  })
}

function cancelEdit() {
  editingId.value = null
}

async function commitEdit(seg: Segment) {
  const newText = draftText.value.trim()
  editingId.value = null
  if (newText === seg.text) return // nada mudou, não bate na API à toa
  await persist(seg.id, newText)
}

async function persist(segmentId: string, text: string) {
  segmentState[segmentId] = { status: 'saving', draft: text }
  try {
    const updated = await $fetch<{ text: string }>(
      `/api/videos/${props.videoId}/segments/${segmentId}`,
      { method: 'PATCH', body: { text } },
    )
    const target = localSegments.value.find((s) => s.id === segmentId)
    if (target) target.text = updated.text
    segmentState[segmentId] = { status: 'saved' }
    setTimeout(() => {
      if (segmentState[segmentId]?.status === 'saved') {
        Reflect.deleteProperty(segmentState, segmentId)
      }
    }, 2000)
  } catch {
    segmentState[segmentId] = { status: 'error', draft: text }
  }
}

function retry(segmentId: string) {
  const draft = segmentState[segmentId]?.draft
  if (draft != null) persist(segmentId, draft)
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
      <div
        v-for="seg in localSegments"
        :key="seg.id"
        :ref="(el) => setSegmentRef(seg.idx, el)"
        class="group flex w-full gap-3 px-4 py-3 transition-colors hover:bg-paper-2"
        :class="[
          seg.idx === activeIdx ? 'bg-brand-50/60' : '',
          seg.idx === currentMatch ? 'ring-1 ring-inset ring-amber-400' : '',
        ]"
      >
        <button
          class="shrink-0 pt-0.5 font-mono text-xs text-brand-600"
          @click="emit('seek', seg.startMs)"
        >
          {{ formatTimestamp(seg.startMs) }}
        </button>

        <div class="min-w-0 flex-1">
          <textarea
            v-if="editingId === seg.id"
            :ref="(el) => setTextareaRef(seg.id, el)"
            v-model="draftText"
            rows="1"
            class="w-full resize-none overflow-hidden rounded border border-brand-400 bg-paper px-2 py-1 text-sm leading-relaxed text-ink outline-none"
            @input="onTextareaInput"
            @blur="commitEdit(seg)"
            @keydown.enter.exact.prevent="onTextareaEnter"
            @keydown.esc="cancelEdit"
          />
          <span
            v-else
            class="cursor-text text-sm leading-relaxed text-ink"
            @click="emit('seek', seg.startMs)"
            @dblclick="startEdit(seg)"
            v-html="highlight(seg.text)"
          />

          <div v-if="segmentState[seg.id]" class="mt-1 text-xs">
            <span
              v-if="segmentState[seg.id]?.status === 'saving'"
              class="text-ink-soft"
              >salvando…</span
            >
            <span
              v-else-if="segmentState[seg.id]?.status === 'saved'"
              class="text-emerald-600"
              >salvo</span
            >
            <span v-else class="text-brand-600">
              erro ao salvar ·
              <button class="underline" @click="retry(seg.id)">
                tentar novamente
              </button>
            </span>
          </div>
        </div>

        <button
          v-if="editingId !== seg.id"
          class="shrink-0 self-start p-1 text-ink-soft opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
          title="Editar segmento"
          @click="startEdit(seg)"
        >
          <AppIcon name="pencil" class="size-3.5" />
        </button>
      </div>
    </div>

    <p
      v-else
      class="max-h-128 overflow-y-auto whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-ink"
      v-html="highlightedFullText"
    />
  </div>
</template>
