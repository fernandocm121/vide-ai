<script setup lang="ts">
import { formatTimestamp } from '~/utils/media'

interface Citation {
  segmentId: string
  startMs: number
  excerpt: string
}
interface QaMessage {
  role: 'user' | 'assistant'
  content: string
  citations: Citation[] | null
}

const props = defineProps<{ videoId: string }>()
const emit = defineEmits<{ seek: [ms: number] }>()
const { t } = useI18n()

const messages = ref<QaMessage[]>([])
const loadingHistory = ref(true)
const sending = ref(false)
const input = ref('')
const errorMsg = ref<string | null>(null)

async function loadHistory() {
  loadingHistory.value = true
  try {
    const res = await $fetch<{ messages: QaMessage[] }>(
      `/api/videos/${props.videoId}/qa`,
    )
    messages.value = res.messages
  } finally {
    loadingHistory.value = false
  }
}
onMounted(loadHistory)

const SUGGESTIONS = [
  'aiFeatures.qa.suggestion1',
  'aiFeatures.qa.suggestion2',
  'aiFeatures.qa.suggestion3',
  'aiFeatures.qa.suggestion4',
] as const

async function send(text?: string) {
  const question = (text ?? input.value).trim()
  if (!question || sending.value) return

  errorMsg.value = null
  messages.value.push({ role: 'user', content: question, citations: null })
  input.value = ''
  sending.value = true
  try {
    const res = await $fetch<{ answer: string; citations: Citation[] }>(
      `/api/videos/${props.videoId}/qa`,
      { method: 'POST', body: { question } },
    )
    messages.value.push({
      role: 'assistant',
      content: res.answer,
      citations: res.citations.length ? res.citations : null,
    })
  } catch (err) {
    errorMsg.value = apiErrorMessage(err, t('aiFeatures.qa.error'))
    // remove a pergunta otimista — sem resposta, não faz sentido deixá-la no histórico
    messages.value.pop()
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div
    class="flex flex-col overflow-hidden rounded-2xl border border-line bg-paper"
  >
    <div class="max-h-128 min-h-64 flex-1 overflow-y-auto p-4">
      <div
        v-if="loadingHistory"
        class="py-10 text-center text-sm text-ink-soft"
      >
        {{ t('aiFeatures.qa.loading') }}
      </div>

      <div
        v-else-if="!messages.length"
        class="flex flex-col items-center gap-4 py-8 text-center"
      >
        <span
          class="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600"
        >
          <AppIcon name="message-circle" class="size-6" />
        </span>
        <div>
          <h3 class="text-sm font-semibold text-ink">
            {{ t('aiFeatures.qa.emptyTitle') }}
          </h3>
          <p class="mt-1 text-sm text-ink-soft">
            {{ t('aiFeatures.qa.emptyDescription') }}
          </p>
        </div>
        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-for="key in SUGGESTIONS"
            :key="key"
            type="button"
            class="rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600"
            @click="send(t(key))"
          >
            {{ t(key) }}
          </button>
        </div>
      </div>

      <div v-else class="flex flex-col gap-4">
        <div
          v-for="(m, i) in messages"
          :key="i"
          class="flex"
          :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div class="max-w-[85%]">
            <div
              class="rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
              :class="
                m.role === 'user' ? 'bg-brand-500 text-white' : 'bg-paper-2 text-ink'
              "
            >
              {{ m.content }}
            </div>
            <div
              v-if="m.citations?.length"
              class="mt-1.5 flex flex-wrap gap-1.5"
            >
              <button
                v-for="(c, ci) in m.citations"
                :key="ci"
                type="button"
                class="flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-1 text-xs text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600"
                @click="emit('seek', c.startMs)"
              >
                <AppIcon name="clock" class="size-3" />
                {{ formatTimestamp(c.startMs) }} · "{{ c.excerpt }}"
              </button>
            </div>
          </div>
        </div>

        <div v-if="sending" class="flex justify-start">
          <div
            class="flex items-center gap-1 rounded-2xl bg-paper-2 px-3.5 py-2.5"
          >
            <span
              class="size-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:-0.3s]"
            />
            <span
              class="size-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:-0.15s]"
            />
            <span class="size-1.5 animate-bounce rounded-full bg-ink-soft" />
          </div>
        </div>
      </div>
    </div>

    <p
      v-if="errorMsg"
      class="border-t border-line px-4 py-2 text-xs text-brand-600"
    >
      {{ errorMsg }}
    </p>

    <form
      class="flex items-center gap-2 border-t border-line p-3"
      @submit.prevent="send()"
    >
      <input
        v-model="input"
        type="text"
        :placeholder="t('aiFeatures.qa.inputPlaceholder')"
        :disabled="sending"
        class="h-10 flex-1 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500"
      />
      <BaseButton type="submit" :disabled="!input.trim()" :loading="sending">
        {{ t('aiFeatures.qa.send') }}
      </BaseButton>
    </form>
  </div>
</template>
