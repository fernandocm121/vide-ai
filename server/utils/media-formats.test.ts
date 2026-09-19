import { describe, expect, it } from 'vitest'
import { ACCEPTED_MEDIA_TYPES } from './media-formats'

describe('ACCEPTED_MEDIA_TYPES', () => {
  it('aceita as duas variantes de MIME do M4A como áudio', () => {
    expect(ACCEPTED_MEDIA_TYPES['audio/mp4']).toEqual({
      ext: 'm4a',
      kind: 'audio',
    })
    expect(ACCEPTED_MEDIA_TYPES['audio/x-m4a']).toEqual({
      ext: 'm4a',
      kind: 'audio',
    })
  })

  it('aceita as duas variantes de MIME do AAC como áudio', () => {
    expect(ACCEPTED_MEDIA_TYPES['audio/aac']).toEqual({
      ext: 'aac',
      kind: 'audio',
    })
    expect(ACCEPTED_MEDIA_TYPES['audio/x-aac']).toEqual({
      ext: 'aac',
      kind: 'audio',
    })
  })

  it('continua aceitando os formatos existentes (MP4, MOV, WEBM, MP3, WAV)', () => {
    expect(ACCEPTED_MEDIA_TYPES['video/mp4']).toEqual({
      ext: 'mp4',
      kind: 'video',
    })
    expect(ACCEPTED_MEDIA_TYPES['video/quicktime']).toEqual({
      ext: 'mov',
      kind: 'video',
    })
    expect(ACCEPTED_MEDIA_TYPES['video/webm']).toEqual({
      ext: 'webm',
      kind: 'video',
    })
    expect(ACCEPTED_MEDIA_TYPES['audio/mpeg']).toEqual({
      ext: 'mp3',
      kind: 'audio',
    })
    expect(ACCEPTED_MEDIA_TYPES['audio/wav']).toEqual({
      ext: 'wav',
      kind: 'audio',
    })
  })

  it('não aceita um MIME type fora da lista', () => {
    expect(ACCEPTED_MEDIA_TYPES['application/x-msdownload']).toBeUndefined()
  })
})
