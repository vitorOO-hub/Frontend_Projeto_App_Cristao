import { useState } from 'react'
import { getPassage, type Passage } from '../api/bible.ts'
import { errorMessage } from '../errorMessage.ts'
import { type Media, type Reel, reels } from '../feed.ts'

type VerseState = { status: 'loading' } | { status: 'ok'; passage: Passage } | { status: 'error'; message: string }

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
  // Um estado por vídeo: cada versículo é buscado uma vez no Flask e guardado.
  const [verses, setVerses] = useState<Record<string, VerseState>>({})
  const reel = reels[index]
  const verse = verses[reel.id]

  function loadVerse(target: Reel) {
    setVerses((all) => ({ ...all, [target.id]: { status: 'loading' } }))
    getPassage(target.verse.query).then(
      (passage) => setVerses((all) => ({ ...all, [target.id]: { status: 'ok', passage } })),
      (error: unknown) => setVerses((all) => ({ ...all, [target.id]: { status: 'error', message: errorMessage(error) } })),
    )
  }

  function toggleVerse() {
    if (!verseOpen && (!verse || verse.status === 'error')) loadVerse(reel)
    setVerseOpen((open) => !open)
  }
  const amens = reel.amens + (said[index] ? 1 : 0)
  const upNext = [1, 2, 3].map((step) => (index + step) % reels.length)
  const show = (i: number) => {
    setIndex(i)
    setVerseOpen(false)
  }

  return (
    <>
      {/* Fundo da página: a imagem do vídeo atual, borrada e escurecida, para o vidro ter o que refratar. */}
      <img key={`backdrop-${reel.id}`} className="backdrop" src={reel.media.poster ?? reel.media.src} alt="" />
      <figure className="stage-figure">
        <div className="reel" data-ui>
          <MediaView key={reel.id} media={reel.media} className="reel-media" live />
          <div className="reel-top">
            <span className="reel-chip glass">{reel.category}</span>
            <span className="reel-chip glass">{reel.duration}</span>
          </div>
          <div className="reel-bottom">
            <div className="reel-text">
              {reel.author && <p className="reel-author">@{reel.author}</p>}
              <p className="reel-caption">{reel.caption}</p>
              {verseOpen && (
                <div className="reel-passage glass" aria-live="polite">
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
                      <button type="button" className="reel-retry" onClick={() => loadVerse(reel)}>
                        Tentar de novo
                      </button>
                    </>
                  ) : (
                    <p>Carregando o versículo…</p>
                  )}
                </div>
              )}
              <button type="button" className="reel-verse glass" aria-expanded={verseOpen} onClick={toggleVerse}>
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
                <span className="reel-amen-word glass">Amém</span>
                <span className="reel-count">{amens}</span>
              </button>
              <span className="reel-comments" aria-label={`${reel.comments} comentários`}>
                <svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true">
                  <path d="M4 3h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3.5V14H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="currentColor" />
                </svg>
                <span className="reel-count">{reel.comments}</span>
              </span>
              <button type="button" className="reel-next glass" aria-label="Próximo vídeo" onClick={() => show(upNext[0])}>
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
    </>
  )
}
