import { type InputHTMLAttributes, type ReactNode, useId, useState } from 'react'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
  trailing?: ReactNode
}

/** Rótulo visível, dica e erro ligados ao campo por aria-describedby. */
export function Field({ label, hint, error, trailing, id, className, ...input }: FieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const note = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      <label htmlFor={inputId}>{label}</label>
      <div className="field-control">
        <input id={inputId} aria-invalid={error ? true : undefined} aria-describedby={note} {...input} />
        {trailing}
      </div>
      {error ? (
        <p id={note} className="field-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={note} className="field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/** Campo de senha com botão para mostrar o que foi digitado. */
export function PasswordField(props: Omit<FieldProps, 'type' | 'trailing'>) {
  const [visible, setVisible] = useState(false)
  return (
    <Field
      {...props}
      type={visible ? 'text' : 'password'}
      className="field-password"
      trailing={
        <button
          type="button"
          className="field-toggle"
          aria-pressed={visible}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      }
    />
  )
}
