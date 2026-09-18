<script setup lang="ts">
const props = defineProps<{
  text: string
}>()

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
    <div
      class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3"
    >
      <span class="text-xs font-semibold text-ink-soft">Transcrição</span>

      <div class="flex items-center gap-2">
        <input
          v-model="query"
          type="search"
          placeholder="Buscar na transcrição…"
          class="h-8 w-44 rounded-lg border border-line bg-paper px-3 text-xs text-ink outline-none transition-colors focus:border-brand-500 sm:w-56"
        />
        <button
          class="whitespace-nowrap text-xs font-medium text-ink-soft transition-colors hover:text-ink"
          @click="copyText"
        >
          Copiar texto
        </button>
      </div>
    </div>

    <p
      class="max-h-128 overflow-y-auto whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-ink"
      v-html="highlightedText"
    />
  </div>
</template>
