<script setup lang="ts">
const MAX_BYTES = 26_214_400 // sincronizado com MAX_UPLOAD_BYTES no servidor
const MAX_MB = Math.floor(MAX_BYTES / 1024 / 1024)

const emit = defineEmits<{ uploaded: [id: string] }>()
const router = useRouter()

const inputEl = ref<HTMLInputElement>()
const dragging = ref(false)
const uploading = ref(false)
const progress = ref(0)
const error = ref<string | null>(null)

function validate(file: File): string | null {
  const isMp3 =
    file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3')
  if (!isMp3) return 'Nesta versão só aceitamos arquivos .mp3.'
  if (file.size === 0) return 'O arquivo está vazio.'
  if (file.size > MAX_BYTES)
    return `Arquivo muito grande (máx. ${MAX_MB} MB nesta versão).`
  return null
}

function putWithProgress(url: string, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', 'audio/mpeg')
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
  error.value = validate(file)
  if (error.value) return

  uploading.value = true
  progress.value = 0
  try {
    const { id, uploadUrl } = await $fetch<{ id: string; uploadUrl: string }>(
      '/api/videos',
      {
        method: 'POST',
        body: {
          filename: file.name,
          contentType: 'audio/mpeg',
          sizeBytes: file.size,
        },
      },
    )

    await putWithProgress(uploadUrl, file)
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
    :class="
      dragging ? 'border-brand-400 bg-brand-50/40' : 'border-line'
    "
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input
      ref="inputEl"
      type="file"
      accept="audio/mpeg,.mp3"
      class="hidden"
      @change="onInput"
    />

    <template v-if="uploading">
      <p class="text-sm font-medium text-ink">Enviando… {{ progress }}%</p>
      <div class="mx-auto mt-3 h-2 w-full max-w-sm overflow-hidden rounded-full bg-paper-3">
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
        Arraste um arquivo <span class="font-semibold">.mp3</span> aqui
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
      <p class="mt-3 text-xs text-ink-soft">MP3 · até {{ MAX_MB }} MB</p>
    </template>

    <p v-if="error" class="mt-4 text-sm font-medium text-brand-600">{{ error }}</p>
  </div>
</template>
