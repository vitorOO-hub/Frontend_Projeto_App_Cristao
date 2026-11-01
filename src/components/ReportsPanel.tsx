import { useCallback, useEffect, useState } from 'react'
import { decideVideo, getVideo, reportQueue, resolveReport, type Report, type ReportStatus, type ReviewVideo } from '../api/moderation.ts'
import { errorMessage } from '../errorMessage.ts'
import { usePagedList } from '../usePagedList.ts'
import { Spinner } from './Layout.tsx'
import ListStatus from './ListStatus.tsx'

const FILTERS: { label: string; status: ReportStatus }[] = [
  { label: 'Abertas', status: 'open' },
  { label: 'Resolvidas', status: 'resolved' },
]

type Target = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; video: ReviewVideo }

/** Textos fixos: o motivo da rejeição vai para o autor, então não repete o que o denunciante escreveu. */
const REMOVED_REASON = 'Vídeo retirado do feed pela moderação após denúncia.'
const NOTES = {
  remove: 'Vídeo excluído do feed pela moderação.',
  keep: 'Vídeo avaliado pela moderação e mantido no feed.',
  gone: 'Vídeo não está mais disponível.',
}

const SITUATION = { pending: 'em análise', approved: 'no ar', rejected: 'fora do feed' }

function ReportCard({ report }: { report: Report }) {
  const [target, setTarget] = useState<Target>({ status: 'loading' })
  const [resolved, setResolved] = useState(report.status === 'resolved')
  const [note, setNote] = useState(report.resolution_note)
  const [running, setRunning] = useState('')
  const [error, setError] = useState('')

  const fetchVideo = useCallback(
    () =>
      getVideo(report.video_id).then(
        (video) => setTarget({ status: 'ok', video }),
        (e: unknown) => setTarget({ status: 'error', message: errorMessage(e) }),
      ),
    [report.video_id],
  )

  // O vídeo já abre carregado: ninguém precisa clicar para ver o que foi denunciado.
  useEffect(() => {
    void fetchVideo()
  }, [fetchVideo])

  function retryVideo() {
    setTarget({ status: 'loading' })
    void fetchVideo()
  }

  /** Excluir tira o vídeo do feed (rejeição) e encerra a denúncia; manter só encerra. Repetir após falha é seguro. */
  async function act(kind: 'remove' | 'keep' | 'gone') {
    setRunning(kind)
    setError('')
    try {
      if (kind === 'remove' && target.status === 'ok' && target.video.status !== 'rejected') {
        const video = await decideVideo(report.video_id, 'rejected', REMOVED_REASON, target.video.updated_at)
        setTarget({ status: 'ok', video })
      }
      const updated = await resolveReport(report.id, NOTES[kind])
      setResolved(true)
      setNote(updated.resolution_note)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setRunning('')
    }
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

        {target.status === 'loading' && <p className="vstate">Carregando o vídeo…</p>}
        {target.status === 'error' && (
          <div role="alert" className="alert vstate-error">
            {target.message}
            <button type="button" className="vfilter" onClick={retryVideo}>
              Tentar de novo
            </button>
          </div>
        )}
        {target.status === 'ok' && (
          <>
            <video className="feed-video" src={target.video.media_url} controls playsInline preload="metadata" />
            <p className="vcaption">{target.video.caption}</p>
            <p className="feed-comments">Situação do vídeo: {SITUATION[target.video.status]}</p>
          </>
        )}

        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}
        {!resolved && (
          <div className="feed-actions">
            {target.status === 'ok' && (
              <>
                <button type="button" className="vfilter" disabled={Boolean(running)} onClick={() => void act('remove')}>
                  {running === 'remove' && <Spinner />}
                  Excluir vídeo
                </button>
                <button type="button" className="vfilter" disabled={Boolean(running)} onClick={() => void act('keep')}>
                  {running === 'keep' && <Spinner />}
                  Deixar no feed
                </button>
              </>
            )}
            {target.status === 'error' && (
              <button type="button" className="vfilter" disabled={Boolean(running)} onClick={() => void act('gone')}>
                {running === 'gone' && <Spinner />}
                Encerrar denúncia
              </button>
            )}
          </div>
        )}
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

/** Denúncias: o vídeo já aparece carregado e o administrador escolhe entre excluí-lo do feed ou deixá-lo; as duas resolvem a denúncia. */
export default function ReportsPanel() {
  const [status, setStatus] = useState<ReportStatus>('open')
  return (
    <>
      <p className="lead">Denunciar não remove o vídeo sozinho: a decisão é sua. Excluir tira o vídeo do feed; deixar no feed o mantém. Nos dois casos a denúncia fica resolvida.</p>
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
