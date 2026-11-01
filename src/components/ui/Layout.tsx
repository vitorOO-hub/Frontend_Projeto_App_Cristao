import type { ReactNode } from 'react'
import FeedPreview from '../feed/FeedPreview.tsx'

type LayoutProps = {
  title: string
  sentence: string
  /** Convite para a outra tela de entrada ("Criar conta" / "Entrar"), embaixo do formulário; a Home não tem. */
  nav?: ReactNode
  children: ReactNode
}

/** Painel de vidro com o título e o formulário à esquerda; à direita o feed funcionando, sobre a foto do vídeo atual borrada. */
export default function Layout({ title, sentence, nav, children }: LayoutProps) {
  return (
    <div className="shell">
      <header className="topbar">
        <Brand />
      </header>
      <main className="side glass">
        <h1 className="headline">{title}</h1>
        <p className="lead">{sentence}</p>
        <div className="after-headline">{children}</div>
        {nav && <nav className="alt">{nav}</nav>}
      </main>
      <aside className="stage" aria-label="Como é o feed do App Cristão">
        <FeedPreview />
      </aside>
    </div>
  )
}

export function Brand() {
  return (
    <span className="brand glass">
      <svg className="brand-mark" viewBox="0 0 18 28" width="18" height="28" aria-hidden="true">
        <rect width="18" height="28" rx="5" fill="#ffffff" />
        <path d="M6.5 9.5v9l7-4.5-7-4.5Z" fill="#0d0d10" />
      </svg>
      App Cristão
    </span>
  )
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />
}
