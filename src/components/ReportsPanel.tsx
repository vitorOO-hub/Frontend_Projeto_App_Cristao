import { useCallback, useState } from 'react'
import { decideVideo, getVideo, reportQueue, resolveReport, type Report, type ReportStatus, type ReviewVideo } from '../api/moderation.ts'
import { errorMessage } from '../errorMessage.ts'
import { usePagedList } from '../usePagedList.ts'
import ListStatus from './ListStatus.tsx'
import ReasonForm from './ReasonForm.tsx'

const FILTERS: { label: string; status: ReportStatus }[] = [
  { label: 'Abertas', status: 'open' },
  { label: 'Resolvidas', status: 'resolved' },
]

type Target = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; video: ReviewVideo }

function ReportCard({ report }: { report: Report }) {
  const [target, setTarget] = useState<Target | null>(null)
  const [resolved, setResolved] = useState(report.status === 'resolved')
  const [note, setNote] = useState(report.resolution_note)

  function loadVideo() {
    setTarget({ status: 'loading' })
    getVideo(report.video_id).then(
      (video) => setTarget({ status: 'ok', video }),
      (e: unknown) => setTarget({ status: 'error', message: errorMessage(e) }),
    )
  }

  async function resolve(text: string) {
    const updated = await resolveReport(report.id, text)
    setResolved(true)
    setNote(updated.resolution_note)
  }

  async function reject(text: string) {
    if (target?.status !== 'ok') return
    const video = await decideVideo(report.video_id, 'rejected', text, target.video.updated_at)
    setTarget({ status: 'ok', video })
  }

  return (
    <article className="feed-card glass">
      <div className="feed-info">
        <div className="vtags">
          <span className="vtag">{resolved ? 'Resolvida' : 'Aberta'}</span>
          <span className="vtag">{new Date(report.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
        <p className="vcaption">{report.reason}</p>
        {note && <p className="feed-comments">Resolução: {note}</p>}

        {!target && (
          <button type="button" className="vfilter feed-verse" onClick={loadVideo}>
            Ver o vídeo denunciado
          </button>
        )}
        {target?.status === 'loading' && <p className="vstate">Carregando o vídeo…</p>}
        {target?.status === 'error' && (
          <div role="alert" className="alert vstate-error">
            {target.message}
            <button type="button" className="vfilter" onClick={loadVideo}>
              Tentar de novo
            </button>
          </div>
        )}
        {target?.status === 'ok' && (
          <>
            <video className="feed-video" src={target.video.media_url} controls playsInline preload="metadata" />
            <p className="vcaption">{target.video.caption}</p>
            <p className="feed-comments">
              Situação do vídeo: {{ pending: 'em análise', approved: 'no ar', rejected: 'rejeitado' }[target.video.status]}
            </p>
            {target.video.status !== 'rejected' && !resolved && (
              <ReasonForm label="Retirar do feed (motivo da rejeição)" actions={[{ label: 'Rejeitar vídeo', run: reject }]} />
            )}
          </>
        )}

        {!resolved && <ReasonForm label="Nota de resolução" actions={[{ label: 'Marcar como resolvida', run: resolve }]} />}
      </div>
    </article>
  )
}

function ReportList({ status }: { status: ReportStatus }) {
  const fetchPage = useCallback((cursor?: string) => reportQueue(status, cursor), [status])
  const { items, loading, error, hasMore, loadMore, retry } = usePagedList(fetchPage)
  return (
    <>
      {items.length > 0 && (
        <ul className="feed-list">
          {items.map((report) => (
            <li key={report.id}>
              <ReportCard report={report} />
            </li>
          ))}
        </ul>
      )}
      <ListStatus
        loading={loading}
        error={error}
        hasItems={items.length > 0}
        empty={status === 'open' ? 'Nenhuma denúncia aberta.' : 'Nenhuma denúncia resolvida ainda.'}
        hasMore={hasMore}
        onRetry={() => void retry()}
        onLoadMore={() => void loadMore()}
      />
    </>
  )
}

/** Denúncias: o administrador vê o vídeo, pode retirá-lo do feed (rejeição motivada) e encerra a denúncia com uma nota. */
export default function ReportsPanel() {
  const [status, setStatus] = useState<ReportStatus>('open')
  return (
    <>
      <p className="lead">Denunciar não remove o vídeo sozinho: a decisão é sua. Rejeitar o vídeo o tira do feed.</p>
      <div className="vfilters" role="group" aria-label="Filtrar por situação">
        {FILTERS.map((filter) => (
          <button key={filter.status} type="button" className="vfilter" aria-pressed={status === filter.status} onClick={() => setStatus(filter.status)}>
            {filter.label}
          </button>
        ))}
      </div>
      <ReportList key={status} status={status} />
    </>
  )
}
