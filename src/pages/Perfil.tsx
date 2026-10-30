import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { Page } from '../api/client.ts'
import { myFollowers, myFollowing, myProfile, reactedVideos, type Profile, type UserPublic } from '../api/profile.ts'
import { CATEGORIES } from '../categories.ts'
import { Brand, Spinner } from '../components/Layout.tsx'
import ListStatus from '../components/ListStatus.tsx'
import MeusVideosPanel from '../components/MeusVideosPanel.tsx'
import { errorMessage } from '../errorMessage.ts'
import { duration } from '../format.ts'
import { usePagedList } from '../usePagedList.ts'

/** O que o cartão de vídeo precisa; serve tanto para os vídeos do usuário quanto para os que ele curtiu. */
type VideoItem = {
  id: string
  caption: string
  category: string
  created_at: string
  duration_seconds: number
  media_url: string
  author?: UserPublic
}

type Tab = {
  id: string
  label: string
  panel: () => ReactNode
}

const tabs: Tab[] = [
  {
    id: 'videos',
    label: 'Meus vídeos',
    panel: () => <MeusVideosPanel />,
  },
  {
    id: 'curtidos',
    label: 'Curtidos',
    panel: () => <VideoPanel fetch={reactedVideos} empty="Você ainda não disse Amém a nenhum vídeo." showAuthor />,
  },
  {
    id: 'seguidores',
    label: 'Seguidores',
    panel: () => <UserPanel fetch={myFollowers} empty="Ninguém segue você ainda." />,
  },
  {
    id: 'seguindo',
    label: 'Seguindo',
    panel: () => <UserPanel fetch={myFollowing} empty="Você ainda não segue ninguém." />,
  },
]

const STATS: { label: string; stat: keyof Profile['counts'] }[] = [
  { label: 'Vídeos aprovados', stat: 'videos' },
  { label: 'Amens recebidos', stat: 'amens_received' },
  { label: 'Curtidos', stat: 'reacted' },
  { label: 'Seguidores', stat: 'followers' },
  { label: 'Seguindo', stat: 'following' },
]

/** Perfil de quem está logado. Tudo vem de /me/*: o servidor decide quem é o usuário pela sessão. */
export default function Perfil() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const load = useCallback(async () => {
    setError('')
    try {
      setProfile(await myProfile())
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void load()
  }, [load])

  // Padrão de abas do WAI-ARIA: setas e Home/End trocam de aba e levam o foco junto.
  function onTabKey(event: KeyboardEvent) {
    const keys: Record<string, number> = {
      ArrowRight: (selected + 1) % tabs.length,
      ArrowLeft: (selected - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }
    const next = keys[event.key]
    if (next === undefined) return
    event.preventDefault()
    setSelected(next)
    tabRefs.current[next]?.focus()
  }

  const tab = tabs[selected]

  return (
    <div className="vpage">
      <header className="topbar vtopbar">
        <Brand />
        <Link to="/" className="glass vback">
          ← Início
        </Link>
      </header>
      <main className="glass vpanel">
        {error && (
          <div role="alert" className="alert vstate-error">
            {error}
            <button type="button" className="vfilter" onClick={() => void load()}>
              Tentar de novo
            </button>
          </div>
        )}
        {!profile && !error && (
          <p className="vstate" role="status">
            <Spinner />
            Carregando…
          </p>
        )}
        {profile && (
          <>
            <section className="pheader">
              <span className="avatar pavatar" aria-hidden="true">
                {profile.user.name.trim().charAt(0).toUpperCase()}
              </span>
              <div className="pinfo">
                <h1 className="ptitle">{profile.user.name}</h1>
                {profile.user.username && <p className="pusername">@{profile.user.username}</p>}
                <p className={profile.user.bio.trim() ? 'pbio' : 'pbio pbio-empty'}>
                  {profile.user.bio.trim() || 'Sem bio ainda.'}
                </p>
              </div>
            </section>
            <ul className="pstats" aria-label="Números do perfil">
              {STATS.map(({ label, stat }) => (
                <li key={stat}>
                  <strong>{profile.counts[stat]}</strong> {label}
                </li>
              ))}
            </ul>

            <div className="vfilters" role="tablist" aria-label="Conteúdo do perfil">
              {tabs.map((item, index) => (
                <button
                  key={item.id}
                  ref={(element) => {
                    tabRefs.current[index] = element
                  }}
                  type="button"
                  role="tab"
                  id={`aba-${item.id}`}
                  className="vfilter"
                  aria-selected={index === selected}
                  aria-controls="painel-perfil"
                  tabIndex={index === selected ? 0 : -1}
                  onClick={() => setSelected(index)}
                  onKeyDown={onTabKey}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" id="painel-perfil" aria-labelledby={`aba-${tab.id}`} tabIndex={0}>
              <div key={tab.id}>{tab.panel()}</div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function ListState({ list, empty }: { list: ReturnType<typeof usePagedList>; empty: string }) {
  return (
    <ListStatus
      loading={list.loading}
      error={list.error}
      hasItems={list.items.length > 0}
      empty={empty}
      hasMore={list.hasMore}
      onRetry={() => void list.retry()}
      onLoadMore={() => void list.loadMore()}
    />
  )
}

function VideoPanel({
  fetch,
  empty,
  showAuthor = false,
}: {
  fetch: (cursor?: string) => Promise<Page<VideoItem>>
  empty: string
  showAuthor?: boolean
}) {
  const list = usePagedList(fetch)
  return (
    <>
      {list.items.length > 0 && (
        <ul className="vlist">
          {list.items.map((video) => (
            <li key={video.id} className="vcard">
              <div className="vthumb">
                {/* #t=0.1 mostra o primeiro quadro como miniatura; só metadados são baixados. */}
                <video src={`${video.media_url}#t=0.1`} preload="metadata" muted playsInline aria-hidden="true" />
                <span className="vdur">{duration(video.duration_seconds)}</span>
              </div>
              <div className="vbody">
                <p className="vcaption">{video.caption}</p>
                <p className="vmeta">
                  {showAuthor && video.author && `${video.author.name} · `}
                  {CATEGORIES[video.category] ?? video.category} · {new Date(video.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ListState list={list} empty={empty} />
    </>
  )
}

function UserPanel({ fetch, empty }: { fetch: (cursor?: string) => Promise<Page<UserPublic>>; empty: string }) {
  const list = usePagedList(fetch)
  return (
    <>
      {list.items.length > 0 && (
        <ul className="ulist">
          {list.items.map((person) => (
            <li key={person.id} className="uitem">
              <span className="avatar" aria-hidden="true">
                {person.name.trim().charAt(0).toUpperCase()}
              </span>
              <span>
                <span className="profile-name">{person.name}</span>
                {person.username && <span className="profile-email">@{person.username}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <ListState list={list} empty={empty} />
    </>
  )
}
