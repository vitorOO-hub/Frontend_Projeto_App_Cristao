import { useState } from 'react'
import { Link } from 'react-router'
import { CATEGORIES } from '../lib/categories.ts'
import { Brand } from '../components/ui/Layout.tsx'

// Ainda não há lives: a página já mostra os filtros que elas vão ter. A segmentação por igreja fica desligada
// porque o cadastro não pede igreja (docs/escopo-e-requisitos.md), então não há dado para filtrar.
export default function Lives() {
  const [category, setCategory] = useState<string | undefined>()

  return (
    <div className="vpage">
      <header className="topbar vtopbar">
        <Brand />
        <Link to="/" className="glass vback">
          ← Início
        </Link>
      </header>
      <main className="glass vpanel">
        <h1 className="vtitle">Lives</h1>
        <p className="lead">Transmissões ao vivo de louvor, pregação e estudo. Em breve por aqui.</p>

        <div className="vfilters" role="group" aria-label="Filtrar por categoria">
          <button type="button" className="vfilter" aria-pressed={category === undefined} onClick={() => setCategory(undefined)}>
            Todas
          </button>
          {Object.entries(CATEGORIES).map(([key, label]) => (
            <button key={key} type="button" className="vfilter" aria-pressed={category === key} onClick={() => setCategory(key)}>
              {label}
            </button>
          ))}
        </div>

        <div className="vfilters vfilters-church" role="group" aria-label="Filtrar por igreja">
          <button type="button" className="vfilter" aria-pressed="true">
            Todas as igrejas
          </button>
          <button type="button" className="vfilter" aria-pressed="false" disabled>
            Minha igreja <span className="vsoon">Em breve</span>
          </button>
        </div>

        <p className="vstate" role="status">
          {category ? `Nenhuma live de ${CATEGORIES[category]} no momento.` : 'Nenhuma live no momento.'}
        </p>
      </main>
    </div>
  )
}
