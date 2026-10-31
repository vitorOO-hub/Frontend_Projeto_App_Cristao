import { useCallback, useEffect, useRef, useState } from 'react'
import { myVideos, type VideoOwn, type VideoStatus } from '../api/videos.ts'
import { CATEGORIES } from '../categories.ts'
import ListStatus from './ListStatus.tsx'
import OwnVideoActions from './OwnVideoActions.tsx'
import { errorMessage } from '../errorMessage.ts'
import { duration } from '../format.ts'

const STATUS: Record<VideoStatus, { label: string; icon: string }> = {
  pending: { label: 'Em análise', icon: '●' },
  approved: { label: 'Aprovado', icon: '✓' },
  rejected: { label: 'Rejeitado', icon: '✕' },
}

const FILTERS: { label: string; status?: VideoStatus }[] = [
  { label: 'Todos' },
  { label: 'Em análise', status: 'pending' },
  { label: 'Aprovados', status: 'approved' },
  { label: 'Rejeitados', status: 'rejected' },
]

/** Os vídeos do próprio usuário em qualquer situação (em análise, aprovado, rejeitado), para a aba do perfil. */
export default function MeusVideosPanel() {
  const [status, setStatus] = useState<VideoStatus | undefined>()
  const [items, setItems] = useState<VideoOwn[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Resposta de um filtro antigo que chega depois da troca de aba não pode sobrescrever a lista atual.
  const latest = useRef(0)

  const load = useCallback(async (filter: VideoStatus | undefined, cursor?: string) => {
    const request = ++latest.current
    setLoading(true)
    setError('')
    if (!cursor) {
      setItems([])
      setNext(null)
    }
    try {
      const page = await myVideos(filter, cursor)
      if (request !== latest.current) return
      setItems((current) => (cursor ? [...current, ...page.data] : page.data))
      setNext(page.pagination.next_cursor)
    } catch (e) {
      if (request === latest.current) setError(errorMessage(e))
    } finally {
      if (request === latest.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Busca ao abrir e ao trocar de aba; o `load` já ignora a resposta de um filtro que ficou para trás.
    // oxlint-disable-next-line react/set-state-in-effect
    void load(status)
  }, [status, load])

  return (
    <>
      <p className="lead">Acompanhe a revisão dos vídeos que você publicou. Só os aprovados aparecem no feed.</p>
        <div className="vfilters" role="group" aria-label="Filtrar por situação">
          {FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              className="vfilter"
              aria-pressed={status === filter.status}
              onClick={() => setStatus(filter.status)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {items.length > 0 && (
          <ul className="vlist">
            {items.map((video) => (
              <li key={video.id} className="vcard">
                <div className="vthumb">
                  {/* #t=0.1 mostra o primeiro quadro como miniatura; só metadados são baixados. */}
                  <video src={`${video.media_url}#t=0.1`} preload="metadata" muted playsInline aria-hidden="true" />
                  <span className="vdur">{duration(video.duration_seconds)}</span>
                </div>
                <div className="vbody">
                  <div className="vtags">
                    <span className={`vstatus vstatus-${video.status}`}>
                      <span aria-hidden="true">{STATUS[video.status].icon}</span>
                      {STATUS[video.status].label}
                    </span>
                    <span className="vtag">{CATEGORIES[video.category] ?? video.category}</span>
                  </div>
                  <p className="vcaption">{video.caption}</p>
                  <p className="vmeta">{new Date(video.created_at).toLocaleDateString('pt-BR')}</p>
                  {video.status === 'rejected' && (
                    <p className="vreason" role="note">
                      <strong>Motivo da rejeição</strong>
                      {video.review_reason ?? 'Sem motivo informado.'}
                    </p>
                  )}
                  <OwnVideoActions video={video} onChanged={() => void load(status)} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <ListStatus
          loading={loading}
          error={error}
          hasItems={items.length > 0}
          empty={status ? 'Nenhum vídeo nesta situação.' : 'Você ainda não publicou nenhum vídeo.'}
          hasMore={next !== null}
          onRetry={() => void load(status, next ?? undefined)}
          onLoadMore={() => void load(status, next ?? undefined)}
        />
    </>
  )
}
