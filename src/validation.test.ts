import { expect, test } from 'vitest'
import { fieldMessage } from './validation.ts'

const ok = { valueMissing: false, typeMismatch: false, tooShort: false, tooLong: false, patternMismatch: false }
const input = (validity: Partial<typeof ok>, type = 'text') => ({ validity: { ...ok, ...validity }, type, minLength: 12, maxLength: 128 })

test('campo válido não tem mensagem', () => {
  expect(fieldMessage(input({}))).toBe('')
})

test('cada problema tem sua mensagem', () => {
  expect(fieldMessage(input({ valueMissing: true }))).toBe('Preencha este campo.')
  expect(fieldMessage(input({ typeMismatch: true }, 'email'))).toBe('Digite um e-mail válido, como nome@exemplo.com.')
  expect(fieldMessage(input({ tooShort: true }))).toBe('Use pelo menos 12 caracteres.')
  expect(fieldMessage(input({ tooLong: true }))).toBe('Use no máximo 128 caracteres.')
})

test('padrão não atendido (nome só com espaços) tem mensagem própria', () => {
  expect(fieldMessage(input({ patternMismatch: true }))).toBe('Use pelo menos 2 caracteres, sem contar espaços nas pontas.')
})

test('campo vazio vence os outros problemas', () => {
  expect(fieldMessage(input({ valueMissing: true, tooShort: true }))).toBe('Preencha este campo.')
})

test('padrão com data-pattern-message usa a descrição do campo', () => {
  const field = { ...input({ patternMismatch: true }), dataset: { patternMessage: 'Use letras e números.' } }
  expect(fieldMessage(field)).toBe('Use letras e números.')
})
