import { ApiError } from './api/client.ts'

/** Texto para mostrar na tela. A API só diz "Dados inválidos.", então a tela pode passar uma dica melhor. */
export function errorMessage(error: unknown, validationHint?: string): string {
  if (!(error instanceof ApiError)) return 'Erro inesperado. Tente novamente.'
  if (error.code === 'validation_error' && validationHint) return validationHint
  if (error.code === 'too_many_attempts' && error.retryAfter) {
    return `Muitas tentativas. Tente de novo em ${Math.ceil(error.retryAfter / 60)} min.`
  }
  return error.message
}
