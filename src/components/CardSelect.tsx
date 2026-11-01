import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

export type CardOption = { value: string; label: string }

type Props = {
  label: string
  options: readonly CardOption[]
  value: string
  placeholder: string
  onChange: (value: string) => void
  invalid?: string
  describedBy?: string
}

/** Lista de escolha em cartão de vidro: abre por baixo do campo, sem sair do painel, e funciona só com teclado. */
export function CardSelect({ label, options, value, placeholder, onChange, invalid, describedBy }: Props) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  function toggle() {
    if (!open) setActive(Math.max(0, options.findIndex((option) => option.value === value)))
    setOpen(!open)
  }

  function choose(next: string) {
    onChange(next)
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
      setActive((active + step + options.length) % options.length)
    } else if (open && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      choose(options[active].value)
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
        className="pick-trigger"
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
        <span className={selected ? undefined : 'pick-placeholder'}>{selected?.label ?? placeholder}</span>
        <span className="pick-chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className="pick-card">
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-opt-${index}`}
              role="option"
              aria-selected={option.value === value}
              data-active={index === active || undefined}
              className="pick-option"
              onPointerEnter={() => setActive(index)}
              onClick={() => choose(option.value)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
