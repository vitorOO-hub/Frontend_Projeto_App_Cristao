import { useCallback, useEffect, useRef, useState } from 'react'
import type { Page } from './api/client.ts'
import { errorMessage } from './errorMessage.ts'

/** Lista paginada por cursor: carrega a primeira página ao abrir, "Carregar mais" anexa e erro pode ser repetido. */
export function usePagedList<T>(fetchPage: (cursor?: string) => Promise<Page<T>>) {
  const [items, setItems] = useState<T[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Cursor da última tentativa, para "Tentar de novo" repetir exatamente aquele pedido.
  const attempted = useRef<string | undefined>(undefined)
  // Resposta de um pedido antigo que chega depois de outro não pode sobrescrever a lista atual.
  const latest = useRef(0)

  const load = useCallback(
    async (cursor?: string) => {
      const request = ++latest.current
      attempted.current = cursor
      setLoading(true)
      setError('')
      if (!cursor) { setItems([]); setNext(null) }
      try {
        const result = await fetchPage(cursor)
        if (request !== latest.current) return
        setItems((current) => {
          const combined = cursor ? [...current, ...result.data] : result.data
          const seen = new Set<unknown>()
          return combined.filter((item) => {
            const id = (item as { id?: unknown } | null)?.id
            if (id === undefined) return true
            if (seen.has(id)) return false
            seen.add(id)
            return true
          })
        })
        setNext(result.pagination.next_cursor)
      } catch (e) {
        if (request === latest.current) setError(errorMessage(e))
      } finally {
        if (request === latest.current) setLoading(false)
      }
    },
    [fetchPage],
  )

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void load()
    return () => { latest.current += 1 }
  }, [load])

  return {
    items,
    setItems,
    refresh: () => load(),
    loading,
    error,
    hasMore: next !== null,
    loadMore: () => (next ? load(next) : undefined),
    retry: () => load(attempted.current),
  }
}
