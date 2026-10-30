import { useCallback, useState } from 'react'
import { decideVideo, reviewQueue, type ReviewVideo } from '../api/moderation.ts'
import type { VideoStatus } from '../api/videos.ts'
import { CATEGORIES } from '../categories.ts'
import { duration } from '../format.ts'
import { usePagedList } from '../usePagedList.ts'
import ListStatus from './ListStatus.tsx'
import ReasonForm from './ReasonForm.tsx'

const FILTERS: { label: string; status: VideoStatus }[] = [
  { label: 'Pendentes', status: 'pending' },
  { label: 'Aprovados', status: 'approved' },
  { label: 'Rejeitados', status: 'rejected' },
]

const DECIDED = { approved: 'Aprovado', rejected: 'Rejeitado' }

function ReviewCard({ video }: { video: ReviewVideo }) {
  // Depois de decidir, o cartão guarda o resultado e o novo `updated_at` (necessário para uma segunda decisão).
  const [current, setCurrent] = useState<ReviewVideo>(video)
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null)
  const author = video.author.username ? `@${video.author.username}` : video.author.name

  const decide = (status: 'approved' | 'rejected') => async (reason: string) => {
    const updated = await decideVideo(video.id, status, reason, current.updated_at)
    setCurrent(updated)
    setDecision(status)
  }

  return (
    <article className="feed-card glass" aria-label={`Vídeo de ${author}`}>
      <video className="feed-video" src={video.media_url} controls playsInline preload="metadata" />
      <div className="feed-info">
        <div className="vtags">
          <span className="vtag">{CATEGORIES[video.category] ?? video.category}</span>
          <span className="vtag">{duration(video.duration_seconds)}</span>
          <span className="vtag">{new Date(video.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
        <p className="feed-author">{author}</p>
        <p className="vcaption">{video.caption}</p>
        {video.bible_reference && <p className="feed-comments">Referência: {video.bible_reference}</p>}
        {video.review_reason && <p className="feed-comments">Motivo anterior: {video.review_reason}</p>}
        {decision ? (
          <p role="status" className="vstatus">
            {DECIDED[decision]} ✓
          </p>
        ) : (
          <ReasonForm
            label="Motivo da decisão"
            actions={[
              ...(video.status === 'approved' ? [] : [{ label: 'Aprovar', run: decide('approved') }]),
              ...(video.status === 'rejected' ? [] : [{ label: 'Rejeitar', run: decide('rejected') }]),
            ]}
          />
        )}
      </div>
    </article>
  )
}

/** Fila de revisão: o administrador assiste ao vídeo e aprova ou rejeita com um motivo. */
export default function ReviewPanel() {
  const [status, setStatus] = useState<VideoStatus>('pending')
  return (
    <>
      <p className="lead">Assista aos vídeos enviados e decida. A decisão sempre pede um motivo; o autor vê o motivo das rejeições.</p>
      <div className="vfilters" role="group" aria-label="Filtrar por situação">
        {FILTERS.map((filter) => (
          <button key={filter.status} type="button" className="vfilter" aria-pressed={status === filter.status} onClick={() => setStatus(filter.status)}>
            {filter.label}
          </button>
        ))}
      </div>
      <ReviewList key={status} status={status} />
    </>
  )
}

function ReviewList({ status }: { status: VideoStatus }) {
  const fetchPage = useCallback((cursor?: string) => reviewQueue(status, cursor), [status])
  const { items, loading, error, hasMore, loadMore, retry } = usePagedList(fetchPage)
  return (
    <>
      {items.length > 0 && (
        <ul className="feed-list">
          {items.map((video) => (
            <li key={video.id}>
              <ReviewCard video={video} />
            </li>
          ))}
        </ul>
      )}
      <ListStatus
        loading={loading}
        error={error}
        hasItems={items.length > 0}
        empty={status === 'pending' ? 'Nenhum vídeo esperando revisão.' : 'Nenhum vídeo nesta situação.'}
        hasMore={hasMore}
        onRetry={() => void retry()}
        onLoadMore={() => void loadMore()}
      />
    </>
  )
}
