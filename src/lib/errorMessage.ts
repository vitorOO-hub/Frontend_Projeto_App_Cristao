import { ApiError } from '../api/client.ts'

/** Texto para mostrar na tela. A API só diz "Dados inválidos.", então a tela pode passar uma dica melhor. */
export function errorMessage(error: unknown, validationHint?: string): string {
  if (!(error instanceof ApiError)) return 'Erro inesperado. Tente novamente.'
  if (error.code === 'validation_error' && validationHint) return validationHint
  if (error.code === 'too_many_attempts' && error.retryAfter) {
    return `Muitas tentativas. Tente de novo em ${Math.ceil(error.retryAfter / 60)} min.`
  }
  // O cliente já tentou renovar o token uma vez; se ainda falha, a sessão ou a origem (ex.: 127.0.0.1) não servem.
  if (error.code === 'csrf_invalid') return 'Sua sessão expirou. Recarregue a página e tente de novo.'
  // Nginx responde 413/429 fora do envelope da API (docs/api.md): só o status identifica o caso.
  if (error.code === 'http_error') {
    if (error.status === 429) {
      return error.retryAfter
        ? `Muitas tentativas. Tente de novo em ${Math.ceil(error.retryAfter / 60)} min.`
        : 'Muitas tentativas. Tente de novo em instantes.'
    }
    if (error.status === 413) return 'Os dados enviados são grandes demais.'
  }
  return error.message
}
