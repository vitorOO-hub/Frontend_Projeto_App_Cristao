// Mensagens em português para a validação nativa do navegador (o form usa noValidate).
export type Checkable = {
  validity: Pick<ValidityState, 'valueMissing' | 'typeMismatch' | 'tooShort' | 'tooLong'>
  type: string
  minLength: number
  maxLength: number
}

export function fieldMessage({ validity, type, minLength, maxLength }: Checkable): string {
  if (validity.valueMissing) return 'Preencha este campo.'
  if (validity.typeMismatch && type === 'email') return 'Digite um e-mail válido, como nome@exemplo.com.'
  if (validity.tooShort) return `Use pelo menos ${minLength} caracteres.`
  if (validity.tooLong) return `Use no máximo ${maxLength} caracteres.`
  return ''
}
