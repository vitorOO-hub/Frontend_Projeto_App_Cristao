import { useId, useState } from 'react'
import { NOTE_MAX, NOTE_MIN } from '../../api/moderation.ts'
import { errorMessage } from '../../lib/errorMessage.ts'
import { Spinner } from '../ui/Layout.tsx'

export type ReasonAction = { label: string; run: (text: string) => Promise<void> }

/** Campo de motivo (10 a 1000 caracteres) com um ou mais botões de ação; cada ação recebe o texto já sem espaços nas pontas. */
export default function ReasonForm({ label, actions }: { label: string; actions: ReasonAction[] }) {
  const id = useId()
  const [text, setText] = useState('')
  const [touched, setTouched] = useState(false)
  const [running, setRunning] = useState('')
  const [error, setError] = useState('')

  const size = text.trim().length
  const invalid = size < NOTE_MIN ? `Escreva pelo menos ${NOTE_MIN} caracteres.` : ''

  async function act(action: ReasonAction) {
    setTouched(true)
    if (invalid || running) return
    setRunning(action.label)
    setError('')
    try {
      await action.run(text.trim())
    } catch (e) {
      setError(errorMessage(e, `O motivo precisa ter de ${NOTE_MIN} a ${NOTE_MAX} caracteres.`))
      setRunning('')
    }
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-control">
        <textarea
          id={id}
          rows={3}
          maxLength={NOTE_MAX}
          value={text}
          aria-invalid={touched && invalid ? true : undefined}
          aria-describedby={`${id}-note`}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <p id={`${id}-note`} className={touched && invalid ? 'field-error' : 'field-hint'}>
        {(touched && invalid) || `Entre ${NOTE_MIN} e ${NOTE_MAX} caracteres.`} ({size}/{NOTE_MAX})
      </p>
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
      <div className="feed-actions">
        {actions.map((action) => (
          <button key={action.label} type="button" className="vfilter" disabled={Boolean(running)} onClick={() => void act(action)}>
            {running === action.label && <Spinner />}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
