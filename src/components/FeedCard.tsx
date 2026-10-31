import { useState } from 'react'
import { Link } from 'react-router'
import { getPassage, type Passage } from '../api/bible.ts'
import { setAmen } from '../api/feed.ts'
import type { Video } from '../api/profile.ts'
import { CATEGORIES } from '../categories.ts'
import { errorMessage } from '../errorMessage.ts'
import { duration } from '../format.ts'

type Verse = { status: 'loading' } | { status: 'ok'; passage: Passage } | { status: 'error'; message: string }

/** Só um vídeo toca por vez: ao dar play, os outros do feed são pausados. */
function pauseOthers(current: HTMLVideoElement) {
  for (const other of document.querySelectorAll<HTMLVideoElement>('video.feed-video')) {
    if (other !== current) other.pause()
  }
}

/** Um vídeo do feed: player com controles, Amém, versículo e denúncia. */
export default function FeedCard({ video, selfId }: { video: Video; selfId?: string }) {
  const [reacted, setReacted] = useState(video.reacted_by_me)
  const [count, setCount] = useState(video.reaction_count)
  const [sending, setSending] = useState(false)
  const [amenError, setAmenError] = useState('')
  const [verseOpen, setVerseOpen] = useState(false)
  const [verse, setVerse] = useState<Verse | null>(null)
  const own = video.author.id === selfId
  const authorName = video.author.username ? `@${video.author.username}` : video.author.name
  const reference = video.bible_reference

  async function toggleAmen() {
    if (!selfId || sending) return
    setSending(true)
    setAmenError('')
    const next = !reacted
    // Resposta imediata na tela; o servidor confirma (ou desfaz) logo em seguida.
    setReacted(next)
    setCount((n) => n + (next ? 1 : -1))
    try {
      const result = await setAmen(video.id, next)
      // DELETE retorna 204: mantém a remoção e a contagem já atualizadas acima.
      if (result) {
        setReacted(result.reacted)
        setCount(result.reaction_count)
      }
    } catch (e) {
      setReacted(!next)
      setCount((n) => n + (next ? -1 : 1))
      setAmenError(errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  function loadVerse(target: string) {
    setVerse({ status: 'loading' })
    getPassage(target).then(
      (passage) => setVerse({ status: 'ok', passage }),
      (e: unknown) => setVerse({ status: 'error', message: errorMessage(e) }),
    )
  }

  function toggleVerse(target: string) {
    if (!verseOpen && (!verse || verse.status === 'error')) loadVerse(target)
    setVerseOpen((open) => !open)
  }

  return (
    <article className="feed-card glass" aria-label={`Vídeo de ${authorName}`}>
      <video
        className="feed-video"
        src={video.media_url}
        controls
        playsInline
        preload="metadata"
        onPlay={(event) => pauseOthers(event.currentTarget)}
      />
      <div className="feed-info">
        <div className="vtags">
          <span className="vtag">{CATEGORIES[video.category] ?? video.category}</span>
          <span className="vtag">{duration(video.duration_seconds)}</span>
        </div>
        <p className="feed-author">{authorName}</p>
        <p className="vcaption">{video.caption}</p>

        {reference && (
          <>
            <button type="button" className="vfilter feed-verse" aria-expanded={verseOpen} onClick={() => toggleVerse(reference)}>
              {reference}
            </button>
            {verseOpen && (
              <div className="feed-passage" aria-live="polite">
                {verse?.status === 'ok' ? (
                  <blockquote>
                    <p>{verse.passage.text}</p>
                    <cite>
                      {verse.passage.reference} · {verse.passage.translation === 'almeida' ? 'Almeida' : verse.passage.translation}
                    </cite>
                  </blockquote>
                ) : verse?.status === 'error' ? (
                  <>
                    <p>{verse.message}</p>
                    <button type="button" className="vfilter" onClick={() => loadVerse(reference)}>
                      Tentar de novo
                    </button>
                  </>
                ) : (
                  <p>Carregando o versículo…</p>
                )}
              </div>
            )}
          </>
        )}

        <div className="feed-actions">
          {selfId ? <button
            type="button"
            className="vfilter feed-amen"
            aria-pressed={reacted}
            aria-label={`Amém, ${count}`}
            disabled={sending}
            onClick={() => void toggleAmen()}
          >
            Amém · {count}
          </button> : <Link className="vfilter" to="/login" state={{ from: { pathname: '/feed', search: '', hash: '' } }}>Entre para dizer Amém · {count}</Link>}
          <span className="feed-comments">{video.comment_count} comentários</span>
          {selfId && !own && (
            <Link to={`/videos/${video.id}/denunciar`} state={{ caption: video.caption }} className="feed-report">
              Denunciar
            </Link>
          )}
        </div>
        {amenError && (
          <p role="alert" className="alert">
            {amenError}
          </p>
        )}
      </div>
    </article>
  )
}
