import { api } from './client.ts'
import type { Video } from './profile.ts'
import type { VideoStatus } from './videos.ts'

/** Limites de `reason` e `resolution_note` no backend (docs/api.md): 10 a 1000 caracteres depois do trim. */
export const NOTE_MIN = 10
export const NOTE_MAX = 1000

/** Vídeo como o administrador o vê: o contrato Video mais o motivo da última decisão (só em rejeitados). */
export type ReviewVideo = Video & { review_reason?: string | null }

export type ReportStatus = 'open' | 'resolved'

export type Report = {
  id: string
  video_id: string
  reporter_id: string
  reason: string
  status: ReportStatus
  resolution_note: string | null
  created_at: string
  resolved_at: string | null
}

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value)
  return search.size ? `?${search}` : ''
}

/** Fila de revisão (GET /moderation/videos); `status` padrão do servidor é `pending`. */
export const reviewQueue = (status: VideoStatus, cursor?: string) =>
  api.getPage<ReviewVideo>(`/moderation/videos${query({ status, cursor })}`)

/**
 * Aprova ou rejeita com motivo. `expectedUpdatedAt` é o `updated_at` que a tela mostrou: se o vídeo mudou
 * nesse meio tempo, o servidor responde 409 em vez de sobrescrever a decisão de outra pessoa.
 */
export const decideVideo = (id: string, status: 'approved' | 'rejected', reason: string, expectedUpdatedAt: string) =>
  api.patch<ReviewVideo>(`/moderation/videos/${encodeURIComponent(id)}`, {
    status,
    reason,
    expected_updated_at: expectedUpdatedAt,
  })

export const reportQueue = (status: ReportStatus, cursor?: string) =>
  api.getPage<Report>(`/moderation/reports${query({ status, cursor })}`)

export const resolveReport = (id: string, note: string) =>
  api.patch<Report>(`/moderation/reports/${encodeURIComponent(id)}`, { status: 'resolved', resolution_note: note })

/** GET /videos/{id}: o administrador vê o vídeo em qualquer situação. */
export const getVideo = (id: string) => api.get<ReviewVideo>(`/videos/${encodeURIComponent(id)}`)
