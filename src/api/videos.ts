import { api } from './client.ts'

// VideoOwn de docs/api.md do backend (Video + review_reason, visível só ao autor e ao admin).
export type VideoStatus = 'pending' | 'approved' | 'rejected'

export type VideoOwn = {
  id: string
  caption: string
  category: string
  bible_reference: string | null
  status: VideoStatus
  created_at: string
  updated_at: string
  duration_seconds: number
  /** Caminho já com o prefixo /api; o backend autoriza cada pedido (autor vê também pendente e rejeitado). */
  media_url: string
  /** Só vem preenchido em vídeo rejeitado. */
  review_reason: string | null
}

export const myVideos = (status?: VideoStatus, cursor?: string) => {
  const query = new URLSearchParams()
  if (status) query.set('status', status)
  if (cursor) query.set('cursor', cursor)
  const suffix = query.size ? `?${query}` : ''
  return api.getPage<VideoOwn>(`/me/videos${suffix}`)
}
