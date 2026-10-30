import { api } from './client.ts'

/** Limites de `reason` no backend (docs/api.md): 10 a 1000 caracteres depois do trim. */
export const REASON_MIN = 10
export const REASON_MAX = 1000

/** POST /videos/{id}/reports. Só vale para vídeo aprovado; uma denúncia por usuário e vídeo (409 `already_reported`). */
export const reportVideo = (videoId: string, reason: string) =>
  api.post<{ id: string; status: 'open' }>(`/videos/${encodeURIComponent(videoId)}/reports`, { reason })
