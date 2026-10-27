import { useState } from 'react'
import { type Media, reels } from '../feed.ts'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

function MediaView({ media, className, live }: { media: Media; className: string; live?: boolean }) {
  if (media.kind === 'photo') return <img className={className} src={media.src} alt={live ? media.alt : ''} />
  // Vídeo mudo que repete só o trecho a partir de `start` (o começo do clipe ainda é noite);
  // com movimento reduzido fica parado no poster.
  const start = media.start ?? 0
  return (
    <video
      className={className}
      src={`${media.src}#t=${start}`}
      poster={media.poster}
      muted
      playsInline
      preload={live ? 'auto' : 'none'}
      autoPlay={live && !reducedMotion()}
      onEnded={(event) => {
        event.currentTarget.currentTime = start
        void event.currentTarget.play()
      }}
      aria-label={live ? media.alt : undefined}
      aria-hidden={live ? undefined : true}
    />
  )
}

/** Um vídeo do feed funcionando: Amém conta, o versículo abre, "Próximo vídeo" e a fila "A seguir" trocam o vídeo. */
export default function FeedPreview() {
  const [index, setIndex] = useState(0)
  const [said, setSaid] = useState<boolean[]>(() => reels.map(() => false))
  const [verseOpen, setVerseOpen] = useState(false)
  const reel = reels[index]
  const amens = reel.amens + (said[index] ? 1 : 0)
  const upNext = [1, 2, 3].map((step) => (index + step) % reels.length)
  const show = (i: number) => {
    setIndex(i)
    setVerseOpen(false)
  }

  return (
    <figure className="stage-figure">
      <div className="reel" data-ui>
        <MediaView key={reel.id} media={reel.media} className="reel-media" live />
        <div className="reel-top">
          <span>{reel.category}</span>
          <span>{reel.duration}</span>
        </div>
        <div className="reel-bottom">
          <div className="reel-text">
            <p className="reel-author">@{reel.author}</p>
            <p className="reel-caption">{reel.caption}</p>
            {verseOpen && (
              <blockquote className="reel-passage">
                <p>{reel.verse.text}</p>
                <cite>{reel.verse.reference} · Almeida</cite>
              </blockquote>
            )}
            <button
              type="button"
              className="reel-verse"
              aria-expanded={verseOpen}
              onClick={() => setVerseOpen((open) => !open)}
            >
              {reel.verse.reference}
            </button>
          </div>
          <div className="reel-rail">
            <button
              type="button"
              className="reel-amen"
              aria-pressed={said[index]}
              aria-label={`Amém, ${amens}`}
              onClick={() => setSaid((list) => list.map((value, i) => (i === index ? !value : value)))}
            >
              <span className="reel-amen-word">Amém</span>
              <span className="reel-count">{amens}</span>
            </button>
            <span className="reel-comments" aria-label={`${reel.comments} comentários`}>
              <svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true">
                <path d="M4 3h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3.5V14H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="currentColor" />
              </svg>
              <span className="reel-count">{reel.comments}</span>
            </span>
            <button type="button" className="reel-next" aria-label="Próximo vídeo" onClick={() => show(upNext[0])}>
              <svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true">
                <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="queue" data-ui>
        <p className="queue-title">A seguir</p>
        {upNext.map((i) => (
          <button key={reels[i].id} type="button" className="queue-item" onClick={() => show(i)} aria-label={`Ver: ${reels[i].caption}`}>
            <MediaView media={reels[i].media} className="queue-media" />
            <span className="queue-category">{reels[i].category}</span>
          </button>
        ))}
      </div>
      <figcaption className="stage-caption">
        Exemplo do feed, {index + 1} de {reels.length}. {reel.media.kind === 'video' ? 'Vídeo' : 'Foto'}:{' '}
        <a href={reel.media.href} target="_blank" rel="noreferrer">
          “{reel.media.title}”
        </a>
        , {reel.media.author}, {reel.media.license}, via Wikimedia Commons.
      </figcaption>
    </figure>
  )
}
