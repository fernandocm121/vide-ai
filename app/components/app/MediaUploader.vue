<script setup lang="ts">
// sincronizado com ACCEPTED_TYPES + MAX_UPLOAD_BYTES/MAX_VIDEO_UPLOAD_BYTES no servidor
type Kind = 'audio' | 'video'

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
const dragging = ref(false)
const uploading = ref(false)
const progress = ref(0)
const error = ref<string | null>(null)

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
    return {
      error:
        'Formato não suportado. Aceitamos MP4, MOV, WEBM, MP3, WAV, M4A ou AAC.',
    }
  }
  const { kind } = ACCEPTED[contentType]!
  if (file.size === 0) return { error: 'O arquivo está vazio.' }
  const max = MAX_BYTES[kind]
  if (file.size > max) {
    return {
      error: `Arquivo muito grande (máx. ${Math.floor(max / 1024 / 1024)} MB para ${kind === 'video' ? 'vídeo' : 'áudio'}).`,
    }
  }
  return { contentType, kind }
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
        : reject(new Error(`O storage respondeu ${xhr.status}`))
    xhr.onerror = () => reject(new Error('Erro de rede durante o upload'))
    xhr.send(file)
  })
}

async function handleFile(file: File) {
  const result = validate(file)
  if ('error' in result) {
    error.value = result.error
    return
  }
  error.value = null
  const { contentType } = result

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

    emit('uploaded', id)
    await router.push(`/app/videos/${id}`)
  } catch (e: unknown) {
    error.value = extractError(e) ?? 'Falha no upload.'
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
  if (file) handleFile(file)
}
function onDrop(e: DragEvent) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}
</script>

<template>
  <div
    class="rounded-2xl border-2 border-dashed bg-paper p-8 text-center transition-colors"
    :class="dragging ? 'border-brand-400 bg-brand-50/40' : 'border-line'"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input
      ref="inputEl"
      type="file"
      accept="video/mp4,.mp4,video/quicktime,.mov,video/webm,.webm,audio/mpeg,.mp3,audio/wav,.wav,audio/mp4,.m4a,audio/aac,audio/x-aac,.aac"
      class="hidden"
      @change="onInput"
    />

    <template v-if="uploading">
      <p class="text-sm font-medium text-ink">Enviando… {{ progress }}%</p>
      <div
        class="mx-auto mt-3 h-2 w-full max-w-sm overflow-hidden rounded-full bg-paper-3"
      >
        <div
          class="h-full rounded-full bg-brand-500 transition-[width] duration-200"
          :style="{ width: `${progress}%` }"
        />
      </div>
      <p class="mt-2 text-xs text-ink-soft">Não feche esta aba até concluir.</p>
    </template>

    <template v-else>
      <AppIcon name="upload" class="mx-auto size-8 text-ink-soft" />
      <p class="mt-3 text-sm font-medium text-ink">
        Arraste um vídeo ou áudio aqui
      </p>
      <p class="mt-1 text-xs text-ink-soft">ou</p>
      <BaseButton
        variant="primary"
        size="md"
        class="mt-3"
        @click="inputEl?.click()"
      >
        Escolher arquivo
      </BaseButton>
      <p class="mt-3 text-xs text-ink-soft">
        MP4 · MOV · WEBM (até 2 GB) · MP3 · WAV · M4A · AAC (até 25 MB)
      </p>
    </template>

    <p v-if="error" class="mt-4 text-sm font-medium text-brand-600">
      {{ error }}
    </p>
  </div>
</template>
