// Mensagens em português para a validação nativa do navegador (o form usa noValidate).
export type Checkable = {
  validity: Pick<ValidityState, 'valueMissing' | 'typeMismatch' | 'tooShort' | 'tooLong' | 'patternMismatch'>
  type: string
  minLength: number
  maxLength: number
  /** `data-pattern-message`: descrição do formato, mostrada quando o valor não segue o `pattern`. */
  dataset?: { patternMessage?: string }
}

export function fieldMessage({ validity, type, minLength, maxLength, dataset }: Checkable): string {
  if (validity.valueMissing) return 'Preencha este campo.'
  if (validity.typeMismatch && type === 'email') return 'Digite um e-mail válido, como nome@exemplo.com.'
  if (validity.tooShort) return `Use pelo menos ${minLength} caracteres.`
  if (validity.tooLong) return `Use no máximo ${maxLength} caracteres.`
  if (validity.patternMismatch) return dataset?.patternMessage || 'Use pelo menos 2 caracteres, sem contar espaços nas pontas.'
  return ''
}
