import { api } from './client.ts'
import type { Video } from './profile.ts'

export const FEED_PAGE_SIZE = 10

/** Vídeos aprovados, do mais recente ao mais antigo; `category` é uma chave de CATEGORIES. */
export const feedVideos = (category?: string, cursor?: string) => {
  const query = new URLSearchParams({ limit: String(FEED_PAGE_SIZE) })
  if (category) query.set('category', category)
  if (cursor) query.set('cursor', cursor)
  return api.getPage<Video>(`/videos?${query}`)
}

export type Reaction = { reacted: boolean; reaction_count: number }

/** Diz "Amém" (PUT, devolve a contagem) ou desfaz (DELETE, 204 sem corpo); ambos são idempotentes. */
export const setAmen = (videoId: string, on: boolean) =>
  on ? api.put<Reaction>(`/videos/${videoId}/reaction`) : api.delete<void>(`/videos/${videoId}/reaction`)
