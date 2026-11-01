import { type ChangeEvent, type FocusEvent, useState } from 'react'
import { fieldMessage } from '../lib/validation.ts'

/** Erro por campo: aparece ao sair do campo ou ao enviar, e some assim que o valor fica válido. */
export function useFieldErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const check = (input: HTMLInputElement) => setErrors((prev) => ({ ...prev, [input.name]: fieldMessage(input) }))

  return {
    errors,
    setError: (name: string, message: string) => setErrors((prev) => ({ ...prev, [name]: message })),
    onBlur: (event: FocusEvent<HTMLInputElement>) => check(event.target),
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      if (errors[event.target.name]) check(event.target)
    },
    /** Valida o formulário inteiro e põe o foco no primeiro campo com erro. */
    checkForm(form: HTMLFormElement) {
      const inputs = [...form.querySelectorAll('input')]
      const next = Object.fromEntries(inputs.map((input) => [input.name, fieldMessage(input)]))
      setErrors(next)
      const firstInvalid = inputs.find((input) => next[input.name])
      firstInvalid?.focus()
      return !firstInvalid
    },
  }
}
