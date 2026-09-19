import { describe, expect, it } from 'vitest'
import type { Video } from '../db/schema'
import { buildTranscriptExportJson } from './transcript-export'

const video: Pick<
  Video,
  'id' | 'title' | 'originalFilename' | 'mediaKind' | 'durationSeconds'
> = {
  id: 'video-1',
  title: 'Podcast #42',
  originalFilename: 'podcast-42.mp3',
  mediaKind: 'audio',
  durationSeconds: 90,
}

const transcript = {
  text: 'Olá pessoal, bem-vindos ao episódio de hoje.',
  language: 'pt',
  provider: 'elevenlabs:scribe_v2',
}

describe('buildTranscriptExportJson', () => {
  it('inclui os metadados do vídeo e da transcrição', () => {
    const json = buildTranscriptExportJson(video, transcript, [])

    expect(json.version).toBe(1)
    expect(json.video).toMatchObject({
      id: 'video-1',
      title: 'Podcast #42',
      originalFilename: 'podcast-42.mp3',
      mediaKind: 'audio',
      durationSeconds: 90,
    })
    expect(json.transcript).toEqual(transcript)
    expect(json.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('cai para um único segmento cobrindo o áudio inteiro quando não há segmentos salvos', () => {
    const json = buildTranscriptExportJson(video, transcript, [])

    expect(json.segments).toEqual([
      {
        index: 0,
        startMs: 0,
        endMs: 90_000,
        text: transcript.text,
        words: null,
        speaker: null,
      },
    ])
  })

  it('usa endMs null quando a duração do vídeo é desconhecida', () => {
    const json = buildTranscriptExportJson(
      { ...video, durationSeconds: null },
      transcript,
      [],
    )

    expect(json.segments[0]!.endMs).toBeNull()
  })

  it('usa os segmentos reais quando existem, na ordem recebida (a ordenação por `idx` é feita na query)', () => {
    const json = buildTranscriptExportJson(video, transcript, [
      { id: 'seg-0', idx: 0, startMs: 0, endMs: 4200, text: 'primeiro trecho' },
      {
        id: 'seg-1',
        idx: 1,
        startMs: 4200,
        endMs: 9800,
        text: 'segundo trecho',
      },
    ])

    expect(json.segments).toEqual([
      {
        index: 0,
        startMs: 0,
        endMs: 4200,
        text: 'primeiro trecho',
        words: null,
        speaker: null,
      },
      {
        index: 1,
        startMs: 4200,
        endMs: 9800,
        text: 'segundo trecho',
        words: null,
        speaker: null,
      },
    ])
  })

  it('distribui as palavras pros segmentos certos, por segmentId', () => {
    const json = buildTranscriptExportJson(
      video,
      transcript,
      [
        {
          id: 'seg-0',
          idx: 0,
          startMs: 0,
          endMs: 4200,
          text: 'primeiro trecho',
        },
        {
          id: 'seg-1',
          idx: 1,
          startMs: 4200,
          endMs: 9800,
          text: 'segundo trecho',
        },
      ],
      [
        { segmentId: 'seg-0', startMs: 0, endMs: 900, text: 'primeiro' },
        { segmentId: 'seg-0', startMs: 900, endMs: 1800, text: 'trecho' },
        { segmentId: 'seg-1', startMs: 4200, endMs: 5000, text: 'segundo' },
      ],
    )

    expect(json.segments[0]!.words).toEqual([
      { word: 'primeiro', startMs: 0, endMs: 900 },
      { word: 'trecho', startMs: 900, endMs: 1800 },
    ])
    expect(json.segments[1]!.words).toEqual([
      { word: 'segundo', startMs: 4200, endMs: 5000 },
    ])
  })

  it('sempre inclui `speaker: null` — diarização ainda não é persistida pelo pipeline', () => {
    const json = buildTranscriptExportJson(
      video,
      transcript,
      [{ id: 'seg-0', idx: 0, startMs: 0, endMs: 4200, text: 'trecho' }],
      [{ segmentId: 'seg-0', startMs: 0, endMs: 900, text: 'trecho' }],
    )

    expect(json.segments[0]!.speaker).toBeNull()
  })

  it('gera um JSON válido (round-trip via JSON.stringify/parse)', () => {
    const json = buildTranscriptExportJson(video, transcript, [])
    expect(() => JSON.parse(JSON.stringify(json))).not.toThrow()
  })
})
