import { beforeEach, describe, expect, it, vi } from 'vitest'

const convertMock = vi.fn()

vi.mock('@elevenlabs/elevenlabs-js', () => {
  class ElevenLabsClient {
    speechToText = { convert: convertMock }
  }
  return { ElevenLabsClient }
})

vi.mock('../utils/env', () => ({
  useEnv: () => ({ ELEVENLABS_API_KEY: 'xi-test' }),
}))

const { elevenlabsScribe, transcriptionProvider } = await import('./provider')

/** Resposta mínima da API, no formato do SDK (camelCase). */
function response(over: Record<string, unknown> = {}) {
  return {
    languageCode: 'por',
    languageProbability: 0.99,
    text: 'olá mundo',
    words: [],
    ...over,
  }
}

function srtFormat(content: string, { base64 = false } = {}) {
  return [
    {
      requestedFormat: 'srt',
      fileExtension: 'srt',
      contentType: 'application/x-subrip',
      isBase64Encoded: base64,
      content: base64
        ? Buffer.from(content, 'utf8').toString('base64')
        : content,
    },
  ]
}

const SRT = [
  '1',
  '00:00:00,000 --> 00:00:01,500',
  'olá mundo',
  '',
  '2',
  '00:00:01,500 --> 00:00:03,520',
  'tchau',
  '',
].join('\n')

function transcribe(language?: string) {
  return elevenlabsScribe.transcribeAudio({
    buffer: Buffer.from('audio'),
    filename: 'podcast.mp3',
    mimeType: 'audio/mpeg',
    ...(language ? { language } : {}),
  })
}

describe('elevenlabsScribe', () => {
  beforeEach(() => {
    convertMock.mockReset()
  })

  it('chama o scribe_v2 pedindo timestamps por palavra e o SRT', async () => {
    convertMock.mockResolvedValue(response())

    await transcribe()

    const params = convertMock.mock.calls[0]![0]
    expect(params).toMatchObject({
      modelId: 'scribe_v2',
      timestampsGranularity: 'word',
      // a API recusa additionalFormats sem diarização
      diarize: true,
    })
    expect(params.additionalFormats).toEqual([
      expect.objectContaining({ format: 'srt' }),
    ])
    expect(params.file).toMatchObject({
      filename: 'podcast.mp3',
      contentType: 'audio/mpeg',
    })
  })

  it('repassa a dica de idioma quando fornecida e omite quando não', async () => {
    convertMock.mockResolvedValue(response())
    await transcribe('pt')
    expect(convertMock.mock.calls[0]![0]).toMatchObject({ languageCode: 'pt' })

    convertMock.mockClear()
    convertMock.mockResolvedValue(response())
    await transcribe()
    expect(convertMock.mock.calls[0]![0]).not.toHaveProperty('languageCode')
  })

  it('normaliza o idioma detectado de ISO-639-3 para ISO-639-1', async () => {
    convertMock.mockResolvedValue(response({ languageCode: 'por' }))

    const result = await transcribe()

    expect(result.language).toBe('pt')
  })

  it('monta os segmentos a partir dos blocos do SRT', async () => {
    convertMock.mockResolvedValue(
      response({ additionalFormats: srtFormat(SRT) }),
    )

    const result = await transcribe()

    expect(result.segments).toEqual([
      { idx: 0, startMs: 0, endMs: 1500, text: 'olá mundo' },
      { idx: 1, startMs: 1500, endMs: 3520, text: 'tchau' },
    ])
  })

  it('decodifica o SRT quando vem em base64', async () => {
    convertMock.mockResolvedValue(
      response({ additionalFormats: srtFormat(SRT, { base64: true }) }),
    )

    const result = await transcribe()

    expect(result.segments).toHaveLength(2)
    expect(result.segments?.[0]?.text).toBe('olá mundo')
  })

  it('ignora espaçamento, eventos de áudio e palavras sem tempo', async () => {
    convertMock.mockResolvedValue(
      response({
        words: [
          { text: 'olá', start: 0, end: 0.6, type: 'word', logprob: -0.1 },
          { text: ' ', start: 0.6, end: 0.7, type: 'spacing', logprob: 0 },
          {
            text: '(risada)',
            start: 0.7,
            end: 1,
            type: 'audio_event',
            logprob: -2,
          },
          { text: 'mundo', type: 'word', logprob: -0.2 },
          { text: 'tchau', start: 2, end: 3.5, type: 'word', logprob: -0.3 },
        ],
        additionalFormats: srtFormat(
          [
            '1',
            '00:00:00,000 --> 00:00:01,500',
            'olá',
            '',
            '2',
            '00:00:01,500 --> 00:00:03,500',
            'tchau',
          ].join('\n'),
        ),
      }),
    )

    const result = await transcribe()

    expect(result.words).toEqual([
      {
        idx: 0,
        startMs: 0,
        endMs: 600,
        text: 'olá',
        logprob: -0.1,
        segmentIdx: 0,
      },
      {
        idx: 1,
        startMs: 2000,
        endMs: 3500,
        text: 'tchau',
        logprob: -0.3,
        segmentIdx: 1,
      },
    ])
  })

  it('usa audioDurationSecs como duração e cai para null sem ele', async () => {
    convertMock.mockResolvedValue(response({ audioDurationSecs: 42.5 }))
    expect((await transcribe()).durationSeconds).toBe(42.5)

    convertMock.mockResolvedValue(response())
    expect((await transcribe()).durationSeconds).toBeNull()
  })

  it('sem o SRT, devolve segmentos vazios e palavras sem segmento', async () => {
    convertMock.mockResolvedValue(
      response({
        words: [
          { text: 'olá', start: 0, end: 0.6, type: 'word', logprob: -0.1 },
        ],
      }),
    )

    const result = await transcribe()

    expect(result.segments).toEqual([])
    expect(result.words?.[0]?.segmentIdx).toBeNull()
  })

  it('ignora conteúdo inválido no SRT em vez de quebrar', async () => {
    convertMock.mockResolvedValue(
      response({ additionalFormats: srtFormat('isso não é um srt') }),
    )

    const result = await transcribe()

    expect(result.segments).toEqual([])
    expect(result.text).toBe('olá mundo')
  })

  it('falha quando a resposta não traz palavras (multicanal ou webhook)', async () => {
    convertMock.mockResolvedValue({ transcriptionId: 'abc' })

    await expect(transcribe()).rejects.toThrow(/ElevenLabs/)
  })
})

describe('transcriptionProvider', () => {
  it('devolve o Scribe v2 como provider ativo, com suporte a timestamps', () => {
    const provider = transcriptionProvider()

    expect(provider.name).toBe('elevenlabs:scribe_v2')
    expect(provider.supportsTimestamps).toBe(true)
  })
})
