import { beforeEach, describe, expect, it, vi } from 'vitest'

const createMock = vi.fn()

vi.mock('openai', () => {
  class FakeOpenAI {
    audio = { transcriptions: { create: createMock } }
  }
  return {
    default: FakeOpenAI,
    toFile: vi.fn(async (buffer: unknown, filename: string) => ({
      buffer,
      filename,
    })),
  }
})

vi.mock('../utils/env', () => ({
  useEnv: () => ({ OPENAI_API_KEY: 'sk-test' }),
}))

const { openaiGptTranscribe } = await import('./provider')

describe('openaiGptTranscribe', () => {
  beforeEach(() => {
    createMock.mockReset()
  })

  it('chama a API com model gpt-transcribe e response_format json, sem timestamp_granularities', async () => {
    createMock.mockResolvedValue({
      text: 'olá mundo',
      languages: [{ code: 'pt' }],
      usage: { type: 'duration', seconds: 42 },
    })

    const result = await openaiGptTranscribe.transcribeAudio({
      buffer: Buffer.from('audio'),
      filename: 'audio.mp3',
    })

    const params = createMock.mock.calls[0]![0]
    expect(params).toMatchObject({
      model: 'gpt-transcribe',
      response_format: 'json',
    })
    expect(params).not.toHaveProperty('timestamp_granularities')
    expect(result).toEqual({
      text: 'olá mundo',
      language: 'pt',
      durationSeconds: 42,
    })
  })

  it('retorna language e durationSeconds nulos quando a API não os fornece', async () => {
    createMock.mockResolvedValue({
      text: 'hello',
      languages: [],
      usage: { type: 'tokens' },
    })

    const result = await openaiGptTranscribe.transcribeAudio({
      buffer: Buffer.from('audio'),
      filename: 'audio.mp3',
    })

    expect(result.language).toBeNull()
    expect(result.durationSeconds).toBeNull()
  })

  it('repassa a dica de idioma quando fornecida', async () => {
    createMock.mockResolvedValue({ text: '', languages: [] })

    await openaiGptTranscribe.transcribeAudio({
      buffer: Buffer.from('audio'),
      filename: 'audio.mp3',
      language: 'en',
    })

    expect(createMock.mock.calls[0]![0]).toMatchObject({ language: 'en' })
  })

  it('não envia a chave language quando nenhuma dica é fornecida', async () => {
    createMock.mockResolvedValue({ text: '', languages: [] })

    await openaiGptTranscribe.transcribeAudio({
      buffer: Buffer.from('audio'),
      filename: 'audio.mp3',
    })

    expect(createMock.mock.calls[0]![0]).not.toHaveProperty('language')
  })
})
