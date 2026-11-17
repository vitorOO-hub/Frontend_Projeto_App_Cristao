import { useId, useState } from 'react'
import { Link, useLocation } from 'react-router'
import HeartIcon from '../ui/HeartIcon.tsx'

type Props = { count: number; reacted: boolean; guest: boolean; sending: boolean; onToggle: () => void }

export default function AmenButton({ count, reacted, guest, sending, onToggle }: Props) {
  const location = useLocation()
  const hintId = useId()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const hintOpen = (hovered || focused) && !dismissed
  const content = <><HeartIcon /><span className="amen-count" aria-hidden="true">{count}</span></>

  if (!guest) return (
    <button type="button" className="amen-button" aria-pressed={reacted} aria-label={`Amém, ${count}`} title={reacted ? 'Desfazer Amém' : 'Dizer Amém'} disabled={sending} onClick={onToggle}>
      {content}
    </button>
  )

  return (
    <span className="amen-control"
      onMouseEnter={() => { setHovered(true); setDismissed(false) }}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => { setFocused(true); setDismissed(false) }}
      onBlur={() => setFocused(false)}
      onKeyDown={(event) => { if (event.key === 'Escape') setDismissed(true) }}
    >
      <Link className="amen-button" to="/login" state={{ from: { pathname: location.pathname, search: location.search, hash: location.hash } }} aria-label={`Entre para dizer Amém, ${count}`} aria-describedby={hintId}>
        {content}
      </Link>
      <span id={hintId} role="tooltip" className="amen-tooltip" hidden={!hintOpen}><span>Entre para dizer Amém nos vídeos.</span></span>
    </span>
  )
}
