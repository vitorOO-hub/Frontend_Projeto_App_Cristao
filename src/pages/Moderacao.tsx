import { useState } from 'react'
import { Link } from 'react-router'
import { Brand } from '../components/ui/Layout.tsx'
import ReportsPanel from '../components/moderation/ReportsPanel.tsx'
import ReviewPanel from '../components/moderation/ReviewPanel.tsx'

const TABS = [
  { id: 'videos', label: 'Vídeos' },
  { id: 'denuncias', label: 'Denúncias' },
]

/** Painel do administrador (RF11 e RF12). A rota só é montada para quem tem o papel admin; o servidor confere de novo. */
export default function Moderacao() {
  const [tab, setTab] = useState('videos')
  return (
    <div className="vpage">
      <header className="topbar vtopbar">
        <Brand />
        <Link to="/" className="glass vback">
          ← Início
        </Link>
      </header>
      <main className="glass vpanel feed">
        <h1 className="vtitle">Moderação</h1>
        <div className="vfilters" role="group" aria-label="Seção">
          {TABS.map((item) => (
            <button key={item.id} type="button" className="vfilter" aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        {tab === 'videos' ? <ReviewPanel /> : <ReportsPanel />}
      </main>
    </div>
  )
}
