import type { ReactNode } from 'react'
import FeedPreview from './FeedPreview.tsx'

type LayoutProps = {
  title: string
  sentence: string
  /** Link para a outra tela de entrada ("Criar conta" / "Entrar"); a Home não tem. */
  nav?: ReactNode
  children: ReactNode
}

/** Duas metades por tom: à esquerda o título e o formulário; à direita o feed funcionando. */
export default function Layout({ title, sentence, nav, children }: LayoutProps) {
  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">
          <svg className="brand-mark" viewBox="0 0 18 32" width="18" height="32" aria-hidden="true">
            <rect width="18" height="32" rx="3" fill="#f7941d" />
            <path d="M6.5 11.5v9l7-4.5-7-4.5Z" fill="#05070a" />
          </svg>
          App Cristão
        </span>
        {nav && <nav className="topbar-nav">{nav}</nav>}
      </header>
      <main className="side">
        <h1 className="headline">
          <span>{title}</span>
        </h1>
        <p className="lead">{sentence}</p>
        <div className="after-headline">{children}</div>
      </main>
      <aside className="stage" aria-label="Como é o feed do App Cristão">
        <FeedPreview />
      </aside>
    </div>
  )
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />
}
