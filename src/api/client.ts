// Cliente HTTP central (contrato em docs/api.md do backend): cookie de sessão HttpOnly,
// token CSRF só em memória e erros da API como ApiError.
const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api'
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
// Acima do proxy (30 s) o navegador desistiria sozinho; aqui a tela não fica presa em "Entrando…".
const REQUEST_TIMEOUT_MS = 15_000
// Envio de arquivo (até 50 MiB) leva mais tempo que um JSON.
const UPLOAD_TIMEOUT_MS = 120_000

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
  pagination?: unknown
  error?: { code?: string; message?: string }
}

let csrfToken: string | null = null
let unauthenticatedListener: (() => void) | null = null

/** Avisa quando o servidor diz que não há sessão (expirou ou foi encerrada); devolve como parar de escutar. */
export function onUnauthenticated(listener: () => void): () => void {
  unauthenticatedListener = listener
  return () => {
    if (unauthenticatedListener === listener) unauthenticatedListener = null
  }
}
let csrfRequest: Promise<void> | null = null

async function send(method: string, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  // FormData: o navegador define o Content-Type com o boundary; não pode ser fixado aqui.
  const upload = body instanceof FormData
  if (body !== undefined && !upload) headers['Content-Type'] = 'application/json'
  if (MUTATING.has(method) && csrfToken) headers['X-CSRF-Token'] = csrfToken
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), upload ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS)
  try {
    return await fetch(BASE_URL + path, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : upload ? body : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch {
    // Timeout e falha de rede não provam que o servidor ignorou o pedido (ex.: logout): nunca repetimos
    // sozinhos; a tela deve deixar o usuário tentar de novo.
    if (controller.signal.aborted) {
      throw new ApiError(0, 'timeout', 'O servidor demorou para responder. Tente novamente.')
    }
    throw new ApiError(0, 'network_error', 'Sem conexão com o servidor. Tente novamente.')
  } finally {
    clearTimeout(timer)
  }
}

async function readEnvelope(response: Response): Promise<Envelope | null> {
  try {
    return (await response.json()) as Envelope
  } catch {
    return null
  }
}

/** Listagem do contrato: `data` mais o cursor da próxima página. */
export type Page<T> = { data: T[]; pagination: { next_cursor: string | null; has_more: boolean } }

async function parse<T>(response: Response, page = false): Promise<T> {
  if (response.status === 204) return undefined as T
  const json = await readEnvelope(response)
  if (response.ok && json && 'data' in json) {
    // GET /auth/csrf e POST /auth/login devolvem um token novo; o anterior deixa de valer.
    const token = (json.data as { csrf_token?: unknown } | null)?.csrf_token
    if (typeof token === 'string') csrfToken = token
    return (page ? { data: json.data, pagination: json.pagination } : json.data) as T
  }
  const code = json?.error?.code ?? 'http_error'
  // Só `unauthenticated`: senha errada no login também é 401, mas não é sessão que acabou.
  if (response.status === 401 && code === 'unauthenticated') {
    csrfToken = null
    unauthenticatedListener?.()
  }
  const retryAfter = Number(response.headers.get('Retry-After'))
  throw new ApiError(
    response.status,
    code,
    json?.error?.message ?? 'Erro inesperado. Tente novamente.',
    retryAfter > 0 ? retryAfter : null,
  )
}

/** Esquece o token de uma sessão encerrada; a próxima mutação busca outro antes de enviar. */
export function forgetCsrf(): void {
  csrfToken = null
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

async function request<T>(method: string, path: string, body?: unknown, page = false): Promise<T> {
  const mutating = MUTATING.has(method)
  if (mutating && !csrfToken) await refreshCsrf()
  const usedToken = csrfToken
  let response = await send(method, path, body)
  if (mutating && response.status === 403) {
    const json = await readEnvelope(response.clone())
    if (json?.error?.code === 'csrf_invalid') {
      // Token girado por outra aba, sessão expirada ou logout: renova e tenta uma única vez. O servidor só
      // recusa por CSRF antes de executar a ação, então repetir é seguro. Se outro pedido já renovou o
      // token, usa o atual: buscar de novo invalidaria o token que aquele pedido acabou de receber.
      if (csrfToken === usedToken) await refreshCsrf()
      response = await send(method, path, body)
    }
  }
  return parse<T>(response, page)
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  /** GET de listagem: devolve também `pagination`, que `get` descarta. */
  getPage: <T>(path: string) => request<Page<T>>('GET', path, undefined, true),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
