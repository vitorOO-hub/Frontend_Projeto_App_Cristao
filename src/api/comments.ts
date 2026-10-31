import { api } from './client.ts'
import type { UserPublic } from './profile.ts'
export type Comment = { id: string; video_id: string; author: UserPublic; text: string; created_at: string }
export const comments = (id: string, cursor?: string) => api.getPage<Comment>(`/videos/${encodeURIComponent(id)}/comments${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`)
export const createComment = (id: string, text: string) => api.post<Comment>(`/videos/${encodeURIComponent(id)}/comments`, { text })
export const deleteComment = (id: string) => api.delete<void>(`/comments/${encodeURIComponent(id)}`)
