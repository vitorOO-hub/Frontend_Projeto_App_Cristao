import { api } from './client.ts'
import type { VideoOwn } from './videos.ts'

/** Limites do backend (docs/api.md): arquivo .mp4 de até 50 MiB, legenda de 1 a 500, referência até 100. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024
export const CAPTION_MAX = 500
export const REFERENCE_MAX = 100

export type NewVideo = { file: File; caption: string; category: string; bibleReference: string }

/** POST /videos (multipart). O vídeo nasce pendente e só entra no feed depois de aprovado. */
export function publishVideo({ file, caption, category, bibleReference }: NewVideo) {
  const form = new FormData()
  form.append('caption', caption.trim())
  form.append('category', category)
  if (bibleReference.trim()) form.append('bible_reference', bibleReference.trim())
  form.append('file', file)
  return api.post<VideoOwn>('/videos', form)
}
