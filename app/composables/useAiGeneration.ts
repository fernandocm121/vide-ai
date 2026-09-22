export type AiGenerationStatus = 'empty' | 'generating' | 'ready' | 'failed'

export interface AiStatusResponse<T> {
  status: AiGenerationStatus
  content?: T
  generatedAt?: string
  error?: string | null
}

/**
 * Estado + polling compartilhado pelas seções de IA da página do vídeo
 * (Resumo, Capítulos, etc.) — mesmo padrão de `setInterval`/
 * `onBeforeUnmount` já usado em `app/pages/app/videos/[id].vue` pro
 * polling do status do vídeo, só que por seção: cada instância cuida do
 * próprio recurso (ex. um resumo de um `length` específico).
 */
export function useAiGeneration<T>(opts: {
  get: () => Promise<AiStatusResponse<T>>
  post: () => Promise<void>
}) {
  const status = ref<AiGenerationStatus>('empty')
  const content = ref<T>()
  const generatedAt = ref<string>()
  const error = ref<string | null>(null)
  const busy = ref(false)

  let timer: ReturnType<typeof setInterval> | undefined

  function stopPolling() {
    if (timer) {
      clearInterval(timer)
      timer = undefined
    }
  }

  async function refresh() {
    const res = await opts.get()
    status.value = res.status
    content.value = res.content
    generatedAt.value = res.generatedAt
    error.value = res.error ?? null
    if (res.status === 'generating') {
      if (!timer) timer = setInterval(refresh, 2500)
    } else {
      stopPolling()
    }
  }

  async function generate() {
    busy.value = true
    error.value = null
    try {
      await opts.post()
      status.value = 'generating'
      if (!timer) timer = setInterval(refresh, 2500)
    } finally {
      busy.value = false
    }
  }

  onMounted(refresh)
  onBeforeUnmount(stopPolling)

  return {
    status,
    content,
    generatedAt,
    error,
    busy,
    generate,
    retry: generate,
    refresh,
  }
}
