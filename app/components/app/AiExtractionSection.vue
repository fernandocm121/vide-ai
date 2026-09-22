<script setup lang="ts">
import type { AiGenerationStatus } from '~/composables/useAiGeneration'

type FieldType = 'text' | 'number' | 'date' | 'currency'
interface Field {
  name: string
  type: FieldType
}
interface ResultItem {
  name: string
  value: string | null
}
interface ExtractionContent {
  fields: Field[]
  result: ResultItem[]
}
interface ExtractionStatusResponse {
  status: AiGenerationStatus
  content?: ExtractionContent
  generatedAt?: string
  error?: string | null
}

const props = defineProps<{ videoId: string }>()
const { t } = useI18n()

const { status, content, generatedAt, error, busy, generate, retry } =
  useAiGeneration<ExtractionContent>({
    get: () =>
      $fetch<ExtractionStatusResponse>(
        `/api/videos/${props.videoId}/extraction`,
      ),
    post: () =>
      $fetch(`/api/videos/${props.videoId}/extraction`, {
        method: 'POST',
        body: { fields: draftFields.value.filter((f) => f.name.trim()) },
      }).then(() => undefined),
  })

/* editor de campos (Passo A) — único lugar onde o editor existe: enquanto
 * `mode === 'edit'`, o card sempre mostra o slot #empty, não importa o
 * status real da última extração (evita duplicar o markup do editor em
 * dois lugares diferentes) */
const mode = ref<'edit' | 'view'>('edit')
const draftFields = ref<Field[]>([{ name: '', type: 'text' }])
const cardStatus = computed<AiGenerationStatus>(() =>
  mode.value === 'edit' ? 'empty' : status.value,
)

watch(status, (s, prev) => {
  if (s === 'ready' && prev !== 'ready') mode.value = 'view'
})

function addField() {
  draftFields.value.push({ name: '', type: 'text' })
}
function removeField(i: number) {
  draftFields.value.splice(i, 1)
  if (!draftFields.value.length) addField()
}
function quickAdd(name: string, type: FieldType) {
  const empty = draftFields.value.find((f) => !f.name.trim())
  if (empty) {
    empty.name = name
    empty.type = type
  } else {
    draftFields.value.push({ name, type })
  }
}
function editFields() {
  if (content.value?.fields.length) {
    draftFields.value = content.value.fields.map((f) => ({ ...f }))
  }
  mode.value = 'edit'
}
async function submit() {
  mode.value = 'view'
  await generate()
}

const canSubmit = computed(() =>
  draftFields.value.some((f) => f.name.trim()),
)

const TYPE_OPTIONS: FieldType[] = ['text', 'number', 'date', 'currency']

/* visualização do resultado (Passo B) ------------------------------------ */
const view = ref<'cards' | 'table' | 'json'>('cards')

const jsonOutput = computed(() => {
  if (!content.value) return ''
  const obj: Record<string, string | null> = {}
  for (const item of content.value.result) obj[item.name] = item.value
  return JSON.stringify(obj, null, 2)
})

async function copyJson() {
  try {
    await navigator.clipboard.writeText(jsonOutput.value)
  } catch {
    /* clipboard indisponível */
  }
}
</script>

<template>
  <AppAiGenerateCard
    icon="table"
    :title="t('aiFeatures.extraction.emptyTitle')"
    :description="t('aiFeatures.extraction.emptyDescription')"
    :cta-label="t('aiFeatures.extraction.cta')"
    :status="cardStatus"
    :generated-at="generatedAt"
    :error="error"
    :busy="busy"
    @generate="submit"
    @retry="retry"
  >
    <template #empty>
      <div class="flex flex-col gap-3">
        <div
          v-for="(field, i) in draftFields"
          :key="i"
          class="flex items-center gap-2"
        >
          <input
            v-model="field.name"
            type="text"
            :placeholder="t('aiFeatures.extraction.fieldNamePlaceholder')"
            class="h-9 flex-1 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500"
          />
          <select
            v-model="field.type"
            class="h-9 rounded-lg border border-line bg-paper px-2 text-xs text-ink outline-none focus:border-brand-500"
          >
            <option v-for="opt in TYPE_OPTIONS" :key="opt" :value="opt">
              {{ t(`aiFeatures.extraction.types.${opt}`) }}
            </option>
          </select>
          <button
            type="button"
            class="text-ink-soft transition-colors hover:text-brand-600"
            :aria-label="t('aiFeatures.extraction.removeField')"
            @click="removeField(i)"
          >
            <AppIcon name="x" class="size-4" />
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
            @click="addField"
          >
            + {{ t('aiFeatures.extraction.addField') }}
          </button>
          <span class="text-line">·</span>
          <button
            type="button"
            class="rounded-md border border-line px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-paper-2"
            @click="quickAdd(t('aiFeatures.extraction.suggestName'), 'text')"
          >
            + {{ t('aiFeatures.extraction.suggestName') }}
          </button>
          <button
            type="button"
            class="rounded-md border border-line px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-paper-2"
            @click="
              quickAdd(t('aiFeatures.extraction.suggestCompany'), 'text')
            "
          >
            + {{ t('aiFeatures.extraction.suggestCompany') }}
          </button>
          <button
            type="button"
            class="rounded-md border border-line px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-paper-2"
            @click="
              quickAdd(t('aiFeatures.extraction.suggestValue'), 'currency')
            "
          >
            + {{ t('aiFeatures.extraction.suggestValue') }}
          </button>
        </div>

        <div>
          <BaseButton :disabled="!canSubmit" :loading="busy" @click="submit">
            {{ t('aiFeatures.extraction.extractCta') }}
          </BaseButton>
        </div>
      </div>
    </template>

    <div v-if="content" class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex gap-1">
          <button
            v-for="v in ['cards', 'table', 'json'] as const"
            :key="v"
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            :class="
              view === v
                ? 'bg-brand-500 text-white'
                : 'border border-line text-ink-soft hover:bg-paper-2'
            "
            @click="view = v"
          >
            {{ t(`aiFeatures.extraction.view.${v}`) }}
          </button>
        </div>
        <button
          class="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
          @click="editFields"
        >
          {{ t('aiFeatures.extraction.editFields') }}
        </button>
      </div>

      <div v-if="view === 'cards'" class="flex flex-col gap-2">
        <div
          v-for="item in content.result"
          :key="item.name"
          class="rounded-xl border border-line bg-paper-2 p-3"
        >
          <p class="text-xs text-ink-soft">{{ item.name }}</p>
          <p class="mt-0.5 text-sm font-semibold text-ink">
            {{ item.value ?? t('aiFeatures.extraction.notFound') }}
          </p>
        </div>
      </div>

      <table v-else-if="view === 'table'" class="w-full text-sm">
        <tbody class="divide-y divide-line">
          <tr v-for="item in content.result" :key="item.name">
            <td class="py-2 pr-4 font-medium text-ink">{{ item.name }}</td>
            <td class="py-2 text-ink-soft">
              {{ item.value ?? t('aiFeatures.extraction.notFound') }}
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="flex flex-col gap-2">
        <pre
          class="overflow-x-auto rounded-lg bg-paper-3 p-3 font-mono text-xs text-ink"
          >{{ jsonOutput }}</pre
        >
        <div class="flex justify-end">
          <button
            class="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
            @click="copyJson"
          >
            {{ t('aiFeatures.extraction.copyJson') }}
          </button>
        </div>
      </div>
    </div>
  </AppAiGenerateCard>
</template>
