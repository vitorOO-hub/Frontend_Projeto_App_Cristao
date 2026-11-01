import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

/** Motivos de denúncia oferecidos na plataforma. Cada rótulo tem 10+ caracteres: sozinho já vale como `reason` no servidor. */
const REPORT_REASONS = [
  'Conteúdo ofensivo ou blasfemo',
  'Discurso de ódio ou discriminação',
  'Assédio ou intimidação',
  'Distorção da fé ou manipulação religiosa',
  'Nudez ou conteúdo sexual',
  'Violência ou conteúdo perturbador',
  'Golpe ou pedido de dinheiro enganoso',
  'Spam ou propaganda',
  'Violação de privacidade',
  'Outro motivo',
] as const

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  invalid?: string
  describedBy?: string
}

/** Lista de motivos em cartão de vidro: abre por baixo do campo, sem sair do painel, e funciona só com teclado. */
export function ReasonSelect({ label, value, onChange, invalid, describedBy }: Props) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  function toggle() {
    if (!open) setActive(Math.max(0, REPORT_REASONS.indexOf(value as (typeof REPORT_REASONS)[number])))
    setOpen(!open)
  }

  function choose(reason: string) {
    onChange(reason)
    setOpen(false)
    trigger.current?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) return toggle()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((active + step + REPORT_REASONS.length) % REPORT_REASONS.length)
    } else if (open && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      choose(REPORT_REASONS[active])
    }
  }

  return (
    <div className="field" ref={root}>
      <label id={`${id}-label`} htmlFor={`${id}-trigger`}>
        {label}
      </label>
      <button
        ref={trigger}
        id={`${id}-trigger`}
        type="button"
        className="reason-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label ${id}-trigger`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        <span className={value ? undefined : 'reason-placeholder'}>{value || 'Escolha um motivo'}</span>
        <span className="reason-chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className="reason-card">
          {REPORT_REASONS.map((reason, index) => (
            <li
              key={reason}
              id={`${id}-opt-${index}`}
              role="option"
              aria-selected={reason === value}
              data-active={index === active || undefined}
              className="reason-option"
              onPointerEnter={() => setActive(index)}
              onClick={() => choose(reason)}
            >
              {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
