import { useSyncExternalStore } from 'react'
let revision = 0
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
const snapshot = () => revision
/** Um bloqueio confirmado invalida páginas e cartões antigos, inclusive comentários abertos. */
export function invalidateVisibility() { revision += 1; for (const listener of listeners) listener() }
export const useVisibilityRevision = () => useSyncExternalStore(subscribe, snapshot, snapshot)
