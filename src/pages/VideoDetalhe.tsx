import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../api/client.ts'
import type { Video } from '../api/profile.ts'
import { getVideo } from '../api/videos.ts'
import FeedCard from '../components/feed/FeedCard.tsx'
import { Brand } from '../components/ui/Layout.tsx'
import { errorMessage } from '../lib/errorMessage.ts'
import { useVisibilityRevision } from '../lib/visibility.ts'

type State =
  | { status: 'loading' }
  | { status: 'ready'; video: Video }
  | { status: 'error'; message: string; retry: boolean }

const unavailable: State = { status: 'error', message: 'Este vídeo não está disponível.', retry: false }

export default function VideoDetalhe({ selfId }: { selfId?: string }) {
  const { id = '' } = useParams()
  const revision = useVisibilityRevision()
  return <VideoContent key={`${id}:${selfId ?? 'visitante'}:${revision}`} id={id} selfId={selfId} />
}

function VideoContent({ id, selfId }: { id: string; selfId?: string }) {
  const { state: locationState } = useLocation()
  const fromLiked = Boolean(selfId && locationState?.from === 'curtidos')
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    getVideo(id).then(
      (video) => {
        if (active) setState(video.status === 'approved' ? { status: 'ready', video } : unavailable)
      },
      (error: unknown) => {
        if (active) setState(error instanceof ApiError && (error.status === 404 || error.status === 400)
          ? unavailable
          : { status: 'error', message: errorMessage(error), retry: true })
      },
    )
    return () => { active = false }
  }, [id, attempt])

  return (
    <div className="vpage">
      <header className="topbar vtopbar">
        <Brand />
        <Link to={fromLiked ? '/perfil' : '/feed'} state={fromLiked ? { tab: 'curtidos' } : undefined} className="glass vback">
          {fromLiked ? '← Curtidos' : '← Feed'}
        </Link>
      </header>
      <main className="glass vpanel feed">
        <h1 className="vtitle">Assistir vídeo</h1>
        {state.status === 'loading' && <p role="status">Carregando vídeo…</p>}
        {state.status === 'ready' && <FeedCard video={state.video} selfId={selfId} />}
        {state.status === 'error' && (
          <div role="alert" className="alert vstate-error">
            {state.message}
            {state.retry && <button type="button" className="vfilter" onClick={() => { setState({ status: 'loading' }); setAttempt((n) => n + 1) }}>Tentar de novo</button>}
          </div>
        )}
      </main>
    </div>
  )
}
