import type { UserSelf } from './auth.ts'
import { api } from './client.ts'
import type { VideoStatus } from './videos.ts'

// Perfil do usuário logado (docs/api.md do backend, "Perfil do usuário logado"). O id nunca vai na requisição.
export type UserPublic = {
  id: string
  name: string
  /** Nome de usuário (@); null nas contas criadas antes dele existir. */
  username: string | null
  bio: string
  created_at: string
}

/** Video do contrato: o que qualquer pessoa vê de um vídeo aprovado. */
export type Video = {
  id: string
  author: UserPublic
  caption: string
  category: string
  bible_reference: string | null
  status: VideoStatus
  created_at: string
  updated_at: string
  duration_seconds: number
  /** Caminho já com o prefixo /api; o backend autoriza cada pedido. */
  media_url: string
  reaction_count: number
  comment_count: number
  reacted_by_me: boolean
}

export type ProfileCounts = {
  /** Vídeos aprovados do usuário. */
  videos: number
  /** "Amém" recebidos nesses vídeos. */
  amens_received: number
  /** Vídeos a que o usuário disse "Amém". */
  reacted: number
  followers: number
  following: number
}

export type Profile = { user: UserSelf; counts: ProfileCounts }

const page = (path: string, cursor?: string) => (cursor ? `${path}?cursor=${encodeURIComponent(cursor)}` : path)

export const myProfile = () => api.get<Profile>('/me/profile')
export const reactedVideos = (cursor?: string) => api.getPage<Video>(page('/me/reacted-videos', cursor))
export const myFollowers = (cursor?: string) => api.getPage<UserPublic>(page('/me/followers', cursor))
export const myFollowing = (cursor?: string) => api.getPage<UserPublic>(page('/me/following', cursor))

export const updateProfile = (profile: Pick<UserPublic, 'name' | 'bio'>) => api.patch<UserSelf>('/me', profile)
export const publicUser = (id: string) => api.get<UserPublic>(`/users/${encodeURIComponent(id)}`)
export const userVideos = (id: string, cursor?: string) => {
  const query = new URLSearchParams({ author_id: id })
  if (cursor) query.set('cursor', cursor)
  return api.getPage<Video>(`/videos?${query}`)
}
