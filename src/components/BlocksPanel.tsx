import { useRef, useState } from 'react'
import { myBlocks, unblockUser } from '../api/blocks.ts'
import { errorMessage } from '../errorMessage.ts'
import { usePagedList } from '../usePagedList.ts'
import { invalidateVisibility } from '../visibility.ts'
import ListStatus from './ListStatus.tsx'
export default function BlocksPanel() {
  const list = usePagedList(myBlocks)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  async function unblock(id: string) {
    if (lock.current || list.loading) return
    lock.current = true; setBusy(true); setError('')
    try { await unblockUser(id); invalidateVisibility(); await list.refresh() }
    catch (e) { setError(errorMessage(e)) }
    finally { lock.current = false; setBusy(false) }
  }
  return <section aria-label="Usuários bloqueados">
    <p>Bloqueios ocultam conteúdo apenas para você. Desbloqueie para voltar a vê-lo.</p>
    <ul className="ulist">{list.items.map(({ user }) => <li key={user.id} className="uitem">
      <span>{user.name}</span>
      <button type="button" className="vfilter" disabled={busy || list.loading} onClick={() => void unblock(user.id)}>Desbloquear {user.name}</button>
    </li>)}</ul>
    <ListStatus loading={list.loading || busy} error={list.error} hasItems={list.items.length > 0} empty="Você não bloqueou ninguém." hasMore={list.hasMore} onRetry={() => void list.retry()} onLoadMore={() => void list.loadMore()} />
    {error && <p role="alert" className="alert">{error}</p>}
  </section>
}
