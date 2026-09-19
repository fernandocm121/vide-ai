import type { TranscriptSegment, TranscriptWord, Video } from '../db/schema'

/**
 * Estrutura do export em JSON da transcrição — pensada pra ser consumida
 * por outras aplicações/integrações (não só um dump interno). `version`
 * existe pra permitir evoluir o formato sem quebrar quem já consome.
 *
 * Nota sobre `speaker`: o Scribe v2 devolve `speakerId` por palavra, mas o
 * pipeline (`server/transcription/run.ts`) ainda não persiste essa
 * diarização — o campo já existe no formato pra quando isso acontecer, e
 * por ora vem sempre `null`.
 *
 * `segments` nunca vem vazio: se não houver segmentos reais salvos em
 * `transcript_segments` (transcrições feitas antes da migração pro Scribe
 * v2, sem timestamp), o export cai para um único segmento cobrindo o áudio
 * inteiro, com o texto completo.
 */
export interface TranscriptExportJson {
  version: 1
  generatedAt: string
  video: {
    id: string
    title: string
    originalFilename: string | null
    mediaKind: 'audio' | 'video'
    durationSeconds: number | null
  }
  transcript: {
    text: string
    language: string | null
    provider: string | null
  }
  segments: Array<{
    index: number
    startMs: number
    endMs: number | null
    text: string
    words: Array<{ word: string; startMs: number; endMs: number }> | null
    speaker: string | null
  }>
}

type ExportWord = Pick<
  TranscriptWord,
  'segmentId' | 'startMs' | 'endMs' | 'text'
>

function toExportWords(words: ExportWord[]) {
  return words.length > 0
    ? words.map((w) => ({
        word: w.text,
        startMs: w.startMs,
        endMs: w.endMs,
      }))
    : null
}

export function buildTranscriptExportJson(
  video: Pick<
    Video,
    'id' | 'title' | 'originalFilename' | 'mediaKind' | 'durationSeconds'
  >,
  transcript: {
    text: string
    language: string | null
    provider: string | null
  },
  segments: Pick<
    TranscriptSegment,
    'id' | 'idx' | 'startMs' | 'endMs' | 'text'
  >[],
  words: ExportWord[] = [],
): TranscriptExportJson {
  const orderedSegments =
    segments.length > 0
      ? segments.map((s) => ({
          index: s.idx,
          startMs: s.startMs,
          endMs: s.endMs,
          text: s.text,
          words: toExportWords(words.filter((w) => w.segmentId === s.id)),
          speaker: null,
        }))
      : [
          {
            index: 0,
            startMs: 0,
            endMs:
              video.durationSeconds != null
                ? video.durationSeconds * 1000
                : null,
            text: transcript.text,
            words: toExportWords(words),
            speaker: null,
          },
        ]

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    video: {
      id: video.id,
      title: video.title,
      originalFilename: video.originalFilename,
      mediaKind: video.mediaKind,
      durationSeconds: video.durationSeconds,
    },
    transcript: {
      text: transcript.text,
      language: transcript.language,
      provider: transcript.provider,
    },
    segments: orderedSegments,
  }
}
