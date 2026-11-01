import { Spinner } from './Layout.tsx'

type ListStatusProps = {
  loading: boolean
  error: string
  /** A lista já tem algum item na tela; sem item e sem erro, mostra o aviso de vazio. */
  hasItems: boolean
  empty: string
  hasMore: boolean
  onRetry: () => void
  onLoadMore: () => void
}

/** Carregando, erro com "Tentar de novo", lista vazia e "Carregar mais": o rodapé comum das listas paginadas. */
export default function ListStatus({ loading, error, hasItems, empty, hasMore, onRetry, onLoadMore }: ListStatusProps) {
  return (
    <>
      {loading && (
        <p className="vstate" role="status">
          <Spinner />
          Carregando…
        </p>
      )}
      {error && (
        <div role="alert" className="alert vstate-error">
          {error}
          <button type="button" className="vfilter" onClick={onRetry}>
            Tentar de novo
          </button>
        </div>
      )}
      {!loading && !error && !hasItems && <p className="vstate">{empty}</p>}
      {!loading && !error && hasMore && (
        <button type="button" className="button vmore" onClick={onLoadMore}>
          Carregar mais
        </button>
      )}
    </>
  )
}
