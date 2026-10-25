// Cliente HTTP central (contrato em docs/api.md do backend): cookie de sessão HttpOnly,
// token CSRF só em memória e erros da API como ApiError.
const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api'
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly retryAfter: number | null

  constructor(status: number, code: string, message: string, retryAfter: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
  }
}

type Envelope = {
  data?: unknown
  error?: { code?: string; message?: string }
}

let csrfToken: string | null = null
let csrfRequest: Promise<void> | null = null

async function send(method: string, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (MUTATING.has(method) && csrfToken) headers['X-CSRF-Token'] = csrfToken
  try {
    return await fetch(BASE_URL + path, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // Falha de rede não prova que o servidor ignorou o pedido (ex.: logout); a tela deve deixar tentar de novo.
    throw new ApiError(0, 'network_error', 'Sem conexão com o servidor. Tente novamente.')
  }
}

async function readEnvelope(response: Response): Promise<Envelope | null> {
  try {
    return (await response.json()) as Envelope
  } catch {
    return null
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T
  const json = await readEnvelope(response)
  if (response.ok && json && 'data' in json) {
    // GET /auth/csrf e POST /auth/login devolvem um token novo; o anterior deixa de valer.
    const token = (json.data as { csrf_token?: unknown } | null)?.csrf_token
    if (typeof token === 'string') csrfToken = token
    return json.data as T
  }
  const retryAfter = Number(response.headers.get('Retry-After'))
  throw new ApiError(
    response.status,
    json?.error?.code ?? 'http_error',
    json?.error?.message ?? 'Erro inesperado. Tente novamente.',
    retryAfter > 0 ? retryAfter : null,
  )
}

/** Busca um token CSRF novo; pedidos simultâneos compartilham a mesma busca. */
export function refreshCsrf(): Promise<void> {
  csrfRequest ??= send('GET', '/auth/csrf')
    .then((response) => parse(response))
    .then(() => undefined)
    .finally(() => {
      csrfRequest = null
    })
  return csrfRequest
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const mutating = MUTATING.has(method)
  if (mutating && !csrfToken) await refreshCsrf()
  let response = await send(method, path, body)
  if (mutating && response.status === 403) {
    const json = await readEnvelope(response.clone())
    if (json?.error?.code === 'csrf_invalid') {
      // Token girado por outra aba, sessão expirada ou logout: renova e tenta uma única vez.
      await refreshCsrf()
      response = await send(method, path, body)
    }
  }
  return parse<T>(response)
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
