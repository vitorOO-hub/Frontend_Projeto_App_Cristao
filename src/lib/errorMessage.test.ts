import { expect, test } from 'vitest'
import { ApiError } from '../api/client.ts'
import { errorMessage } from './errorMessage.ts'

test('usa a mensagem da API', () => {
  expect(errorMessage(new ApiError(401, 'invalid_credentials', 'E-mail ou senha incorretos.'))).toBe('E-mail ou senha incorretos.')
})

test('troca "Dados inválidos." pela dica da tela, quando houver', () => {
  const error = new ApiError(400, 'validation_error', 'Dados inválidos.')
  expect(errorMessage(error)).toBe('Dados inválidos.')
  expect(errorMessage(error, 'Senha com 12 a 128 caracteres.')).toBe('Senha com 12 a 128 caracteres.')
})

test('429 diz quantos minutos esperar', () => {
  expect(errorMessage(new ApiError(429, 'too_many_attempts', 'Muitas tentativas.', 900))).toBe('Muitas tentativas. Tente de novo em 15 min.')
  expect(errorMessage(new ApiError(429, 'too_many_attempts', 'Muitas tentativas.', 61))).toBe('Muitas tentativas. Tente de novo em 2 min.')
})

test('429 e 413 do proxy, fora do envelope da API, ganham mensagem própria', () => {
  const generic = 'Erro inesperado. Tente novamente.'
  expect(errorMessage(new ApiError(429, 'http_error', generic))).toBe('Muitas tentativas. Tente de novo em instantes.')
  expect(errorMessage(new ApiError(429, 'http_error', generic, 120))).toBe('Muitas tentativas. Tente de novo em 2 min.')
  expect(errorMessage(new ApiError(413, 'http_error', generic))).toBe('Os dados enviados são grandes demais.')
})

test('csrf_invalid que sobrou depois do retry pede para recarregar, sem jargão', () => {
  const error = new ApiError(403, 'csrf_invalid', 'Sessão e token CSRF válidos são obrigatórios.')
  expect(errorMessage(error)).toBe('Sua sessão expirou. Recarregue a página e tente de novo.')
})

test('erro que não veio da API vira mensagem genérica', () => {
  expect(errorMessage(new Error('boom'))).toBe('Erro inesperado. Tente novamente.')
})
