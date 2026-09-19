import type { TranscriptSegment, Video } from '../db/schema'

/**
 * Estrutura do export em JSON da transcrição — pensada pra ser consumida
 * por outras aplicações/integrações (não só um dump interno). `version`
 * existe pra permitir evoluir o formato sem quebrar quem já consome.
 *
 * Nota sobre `segments`/`words`/`speaker`: o pipeline atual (OpenAI
 * `gpt-transcribe`) não devolve timestamp por segmento, por palavra, nem
 * identificação de falante — só `text` e `language` (ver
 * `server/transcription/provider.ts`). Por isso:
 * - `words` e `speaker` são sempre `null` hoje — os campos já existem no
 *   formato pra quando (se) o pipeline ganhar essa granularidade.
 * - `segments` nunca vem vazio: se não houver segmentos reais salvos em
 *   `transcript_segments` (hoje é sempre o caso — essa tabela ficou sem uso
 *   desde a migração pro gpt-transcribe), o export cai para um único
 *   segmento cobrindo o áudio inteiro, com o texto completo.
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
  segments: Pick<TranscriptSegment, 'idx' | 'startMs' | 'endMs' | 'text'>[],
): TranscriptExportJson {
  const orderedSegments =
    segments.length > 0
      ? segments.map((s) => ({
          index: s.idx,
          startMs: s.startMs,
          endMs: s.endMs,
          text: s.text,
          words: null,
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
            words: null,
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
