<script setup lang="ts">
// sincronizado com ACCEPTED_TYPES + MAX_UPLOAD_BYTES/MAX_VIDEO_UPLOAD_BYTES no servidor
import {
  AUTO_DETECT,
  TRANSCRIPTION_LANGUAGES,
} from '~/utils/transcription-languages'
import { dropdownPt } from '~/utils/dropdown-pt'

type Kind = 'audio' | 'video'

const { t } = useI18n()

// `pt` do Dialog: mesmo motivo do dropdownPt (CSS do tema PrimeVue não tem
// layer, vence utilities do Tailwind sem `!`) — cartão arredondado com borda
// e padding iguais aos outros cartões do app (`rounded-2xl border-line`),
// ícone de fechar trocado pelo AppIcon via slot `#closeicon` pra não ficar
// com a fonte de ícone padrão do PrimeVue, destoando do resto da UI.
const dialogPt = {
  root: {
    class: '!rounded-2xl !border !border-line !bg-paper !shadow-xl',
  },
  header: {
    class:
      '!flex !items-center !justify-between !border-b !border-line !px-6 !py-5',
  },
  title: {
    class: '!text-lg !font-bold !text-ink',
  },
  closeButton: {
    class:
      '!m-0 !size-8 !rounded-lg !text-ink-soft hover:!bg-paper-2 hover:!text-ink',
  },
  content: {
    class: '!px-6 !py-5',
  },
}

const ACCEPTED: Record<string, { ext: string; kind: Kind; label: string }> = {
  'video/mp4': { ext: 'mp4', kind: 'video', label: 'MP4' },
  'video/quicktime': { ext: 'mov', kind: 'video', label: 'MOV' },
  'video/webm': { ext: 'webm', kind: 'video', label: 'WEBM' },
  'audio/mpeg': { ext: 'mp3', kind: 'audio', label: 'MP3' },
  'audio/wav': { ext: 'wav', kind: 'audio', label: 'WAV' },
  'audio/x-wav': { ext: 'wav', kind: 'audio', label: 'WAV' },
  'audio/wave': { ext: 'wav', kind: 'audio', label: 'WAV' },
  'audio/mp4': { ext: 'm4a', kind: 'audio', label: 'M4A' },
  'audio/x-m4a': { ext: 'm4a', kind: 'audio', label: 'M4A' },
  'audio/aac': { ext: 'aac', kind: 'audio', label: 'AAC' },
  'audio/x-aac': { ext: 'aac', kind: 'audio', label: 'AAC' },
}

// alguns navegadores/SOs não preenchem file.type para certas extensões — cai pra extensão
const EXT_FALLBACK: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
}

const MAX_BYTES: Record<Kind, number> = {
  audio: 26_214_400, // 25 MB
  video: 2_147_483_648, // 2 GB
}

const emit = defineEmits<{ uploaded: [id: string] }>()
const router = useRouter()

const inputEl = ref<HTMLInputElement>()
const dialogOpen = ref(false)
const dragging = ref(false)
const uploading = ref(false)
const progress = ref(0)
const error = ref<string | null>(null)

// arquivo escolhido mas ainda não enviado — só sobe quando o usuário clica em
// "Iniciar transcrição", depois de escolher o idioma (ver Dropdown abaixo)
const stagedFile = ref<File | null>(null)
const stagedContentType = ref<string | null>(null)

const language = ref(AUTO_DETECT)

const languageOptions = computed(() => [
  { code: AUTO_DETECT, name: t('transcriptionLanguage.autoDetect') },
  ...TRANSCRIPTION_LANGUAGES.map((l) => ({
    code: l.code,
    name: t(
      `common.languageSwitcher.names.${l.nameKey}` as 'common.languageSwitcher.names.en',
    ),
  })),
])

function detectType(file: File): string | null {
  if (ACCEPTED[file.type]) return file.type
  const ext = file.name.toLowerCase().split('.').pop() ?? ''
  return EXT_FALLBACK[ext] ?? null
}

function validate(
  file: File,
): { contentType: string; kind: Kind } | { error: string } {
  const contentType = detectType(file)
  if (!contentType) {
    return { error: t('mediaUploader.unsupportedFormat') }
  }
  const { kind } = ACCEPTED[contentType]!
  if (file.size === 0) return { error: t('mediaUploader.emptyFile') }
  const max = MAX_BYTES[kind]
  if (file.size > max) {
    return {
      error: t('mediaUploader.tooLarge', {
        max: Math.floor(max / 1024 / 1024),
        kind:
          kind === 'video'
            ? t('mediaUploader.kindVideo')
            : t('mediaUploader.kindAudio'),
      }),
    }
  }
  return { contentType, kind }
}

function stageFile(file: File) {
  const result = validate(file)
  if ('error' in result) {
    error.value = result.error
    stagedFile.value = null
    stagedContentType.value = null
    return
  }
  error.value = null
  stagedFile.value = file
  stagedContentType.value = result.contentType
}

function clearStagedFile() {
  stagedFile.value = null
  stagedContentType.value = null
  error.value = null
  if (inputEl.value) inputEl.value.value = ''
}

function putWithProgress(
  url: string,
  file: File,
  contentType: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        progress.value = Math.round((ev.loaded / ev.total) * 100)
      }
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(
            new Error(t('mediaUploader.storageError', { status: xhr.status })),
          )
    xhr.onerror = () => reject(new Error(t('mediaUploader.networkError')))
    xhr.send(file)
  })
}

async function start() {
  const file = stagedFile.value
  const contentType = stagedContentType.value
  if (!file || !contentType) return

  error.value = null
  uploading.value = true
  progress.value = 0
  try {
    const { id, uploadUrl } = await $fetch<{ id: string; uploadUrl: string }>(
      '/api/videos',
      {
        method: 'POST',
        body: { filename: file.name, contentType, sizeBytes: file.size },
      },
    )

    await putWithProgress(uploadUrl, file, contentType)
    await $fetch(`/api/videos/${id}/complete`, { method: 'POST' })
    // idioma já escolhido no modal — inicia a transcrição na hora, sem passo
    // manual extra na página do vídeo (detecção automática = corpo vazio)
    await $fetch(`/api/videos/${id}/transcribe`, {
      method: 'POST',
      body: language.value === AUTO_DETECT ? {} : { language: language.value },
    })

    emit('uploaded', id)
    closeDialog()
    await router.push(`/app/videos/${id}`)
  } catch (e: unknown) {
    error.value = extractError(e) ?? t('mediaUploader.uploadFailed')
  } finally {
    uploading.value = false
  }
}

function extractError(e: unknown): string | null {
  const err = e as {
    data?: { statusMessage?: string; message?: string }
    statusMessage?: string
    message?: string
  }
  return (
    err?.data?.statusMessage ??
    err?.data?.message ??
    err?.statusMessage ??
    err?.message ??
    null
  )
}

function onInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) stageFile(file)
}
function onDrop(e: DragEvent) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) stageFile(file)
}

function openDialog() {
  dialogOpen.value = true
}
function closeDialog() {
  dialogOpen.value = false
  clearStagedFile()
  language.value = AUTO_DETECT
  progress.value = 0
}
</script>

<template>
  <div>
    <div
      class="flex flex-col items-start justify-between gap-4 rounded-2xl bg-ink p-6 text-white sm:flex-row sm:items-center"
    >
      <div>
        <p class="text-base font-semibold">
          {{ $t('mediaUploader.ctaTitle') }}
        </p>
        <p class="mt-1 text-xs text-white/60">
          {{ $t('mediaUploader.acceptedFormats') }}
        </p>
      </div>
      <BaseButton variant="primary" size="md" @click="openDialog">
        <AppIcon name="upload" class="size-4" />
        {{ $t('mediaUploader.ctaButton') }}
      </BaseButton>
    </div>

    <Dialog
      v-model:visible="dialogOpen"
      modal
      :header="$t('mediaUploader.modalTitle')"
      :closable="!uploading"
      :close-on-escape="!uploading"
      :dismissable-mask="!uploading"
      :style="{ width: '28rem' }"
      :pt="dialogPt"
      @update:visible="(v: boolean) => !v && closeDialog()"
    >
      <template #closeicon>
        <AppIcon name="x" class="size-4" />
      </template>

      <input
        ref="inputEl"
        type="file"
        accept="video/mp4,.mp4,video/quicktime,.mov,video/webm,.webm,audio/mpeg,.mp3,audio/wav,.wav,audio/mp4,.m4a,audio/aac,audio/x-aac,.aac"
        class="hidden"
        @change="onInput"
      />

      <template v-if="uploading">
        <p class="text-sm font-medium text-ink">
          {{ $t('mediaUploader.uploading', { progress }) }}
        </p>
        <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-paper-3">
          <div
            class="h-full rounded-full bg-brand-500 transition-[width] duration-200"
            :style="{ width: `${progress}%` }"
          />
        </div>
        <p class="mt-2 text-xs text-ink-soft">
          {{ $t('mediaUploader.dontClose') }}
        </p>
      </template>

      <template v-else>
        <div
          class="rounded-2xl border-2 border-dashed bg-paper-2 p-8 text-center transition-colors"
          :class="dragging ? 'border-brand-400 bg-brand-50/40' : 'border-line'"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <template v-if="stagedFile">
            <span
              class="mx-auto grid size-10 place-items-center rounded-full bg-brand-50 text-brand-600"
            >
              <AppIcon name="check" class="size-5" />
            </span>
            <p class="mt-3 truncate text-sm font-medium text-ink">
              {{ stagedFile.name }}
            </p>
            <button
              type="button"
              class="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700"
              @click="clearStagedFile"
            >
              {{ $t('mediaUploader.changeFile') }}
            </button>
          </template>
          <template v-else>
            <AppIcon name="upload" class="mx-auto size-8 text-ink-soft" />
            <p class="mt-3 text-sm font-medium text-ink">
              {{ $t('mediaUploader.dropHint') }}
            </p>
            <p class="mt-1 text-xs text-ink-soft">{{ $t('common.or') }}</p>
            <BaseButton
              variant="outline"
              size="md"
              class="mt-3"
              @click="inputEl?.click()"
            >
              {{ $t('mediaUploader.chooseFile') }}
            </BaseButton>
            <p class="mt-3 text-xs text-ink-soft">
              {{ $t('mediaUploader.acceptedFormats') }}
            </p>
          </template>
        </div>

        <div class="mt-5 flex flex-col gap-1.5">
          <label
            for="transcription-language"
            class="text-sm font-medium text-ink"
          >
            {{ $t('transcriptionLanguage.label') }}
          </label>
          <Dropdown
            v-model="language"
            input-id="transcription-language"
            :options="languageOptions"
            option-label="name"
            option-value="code"
            class="w-full"
            :pt="dropdownPt"
          />
        </div>

        <BaseButton
          class="mt-5"
          block
          :variant="stagedFile ? 'primary' : 'outline'"
          :disabled="!stagedFile"
          @click="start"
        >
          {{ $t('mediaUploader.start') }}
        </BaseButton>

        <p v-if="error" class="mt-3 text-sm font-medium text-brand-600">
          {{ error }}
        </p>
      </template>
    </Dialog>
  </div>
</template>
