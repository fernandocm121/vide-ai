import ffmpegPath from 'ffmpeg-static'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

/**
 * Extrai a trilha de áudio de um vídeo, já no formato que o Whisper espera
 * (mono, 16 kHz, mp3 — menor e suficiente para transcrição de fala).
 */
export async function extractAudio(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  if (!ffmpegPath) {
    throw new Error(
      'Binário do ffmpeg não encontrado (pacote ffmpeg-static). Rode `npm install` novamente.',
    )
  }

  try {
    await run(ffmpegPath, [
      '-y',
      '-i',
      inputPath,
      '-vn', // descarta o vídeo
      '-ac',
      '1', // mono
      '-ar',
      '16000', // 16 kHz — suficiente para fala
      '-b:a',
      '64k',
      outputPath,
    ])
  } catch (err) {
    const stderr = (err as { stderr?: string })?.stderr?.trim()
    const message =
      stderr?.split('\n').slice(-5).join(' ') ||
      (err instanceof Error ? err.message : String(err))
    throw new Error(`Falha ao extrair áudio do vídeo: ${message}`, {
      cause: err,
    })
  }
}
