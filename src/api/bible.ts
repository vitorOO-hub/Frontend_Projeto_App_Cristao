import { api } from './client.ts'

// Resposta de GET /api/bible/passages (docs/api.md, seção 6).
export type Passage = {
  reference: string
  translation: string
  text: string
  source: string
  cached: boolean
}

export const getPassage = (reference: string) =>
  api.get<Passage>(`/bible/passages?reference=${encodeURIComponent(reference)}`)
