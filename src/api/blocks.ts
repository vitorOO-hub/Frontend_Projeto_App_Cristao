import { api } from './client.ts'
import type { UserPublic } from './profile.ts'
export type Block = { user: UserPublic; created_at: string }
export const myBlocks = (cursor?: string) => api.getPage<Block>(`/me/blocks${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`)
export const blockUser = (id: string) => api.put<{ blocked: true }>(`/me/blocks/${encodeURIComponent(id)}`)
export const unblockUser = (id: string) => api.delete<void>(`/me/blocks/${encodeURIComponent(id)}`)
