import { afterEach, beforeEach, expect, test, vi } from 'vitest'

type Call = { url: string; method: string; headers: Record<string, string>; body?: string }

let calls: Call[]
let replies: Response[]

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
const csrf = (token: string) => json(200, { data: { csrf_token: token } })
const csrfInvalid = () => json(403, { error: { code: 'csrf_invalid', message: 'Sessão e token CSRF válidos são obrigatórios.' } })

// Módulo novo a cada teste: o token CSRF fica em memória no módulo.
const load = () => import('./client.ts')

beforeEach(() => {
  vi.resetModules()
  calls = []
  replies = []
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method ?? 'GET', headers: init.headers as Record<string, string>, body: init.body as string })
    const reply = replies.shift()
    if (!reply) throw new Error(`resposta não programada para ${init.method} ${url}`)
    return reply
  })
})

afterEach(() => vi.unstubAllGlobals())

test('POST busca o CSRF antes e envia token, cookie e JSON', async () => {
  const { api } = await load()
  replies.push(csrf('t1'), json(201, { data: { id: 'u1' } }))
  await expect(api.post('/users', { name: 'Maria' })).resolves.toEqual({ id: 'u1' })
  expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['GET /api/auth/csrf', 'POST /api/users'])
  expect(calls[1].headers['X-CSRF-Token']).toBe('t1')
  expect(calls[1].headers['Content-Type']).toBe('application/json')
  expect(calls[1].body).toBe('{"name":"Maria"}')
})

test('GET não exige CSRF', async () => {
  const { api } = await load()
  replies.push(json(200, { data: { status: 'ok' } }))
  await expect(api.get('/health')).resolves.toEqual({ status: 'ok' })
  expect(calls).toHaveLength(1)
  expect(calls[0].headers['X-CSRF-Token']).toBeUndefined()
})

test('csrf_invalid renova o token e repete uma única vez', async () => {
  const { api } = await load()
  replies.push(csrf('t1'), csrfInvalid(), csrf('t2'), json(200, { data: { bio: 'oi' } }))
  await expect(api.patch('/me', { bio: 'oi' })).resolves.toEqual({ bio: 'oi' })
  expect(calls.map((c) => c.headers['X-CSRF-Token'])).toEqual([undefined, 't1', undefined, 't2'])

  replies.push(csrfInvalid(), csrf('t3'), csrfInvalid())
  await expect(api.patch('/me', { bio: 'oi' })).rejects.toMatchObject({ status: 403, code: 'csrf_invalid' })
  expect(calls).toHaveLength(7)
})

test('403 que não é de CSRF não é repetido', async () => {
  const { api } = await load()
  replies.push(csrf('t1'), json(403, { error: { code: 'forbidden', message: 'Sem permissão.' } }))
  await expect(api.post('/x')).rejects.toMatchObject({ status: 403, code: 'forbidden' })
  expect(calls).toHaveLength(2)
})

test('login troca o token guardado pelo que veio na resposta', async () => {
  const { api } = await load()
  replies.push(csrf('anon'), json(200, { data: { user: { id: 'u1' }, csrf_token: 'auth' } }), new Response(null, { status: 204 }))
  await api.post('/auth/login', { email: 'a@b.com', password: 'x'.repeat(12) })
  await expect(api.post('/auth/logout')).resolves.toBeUndefined()
  expect(calls[2].headers['X-CSRF-Token']).toBe('auth')
})

test('erros da API viram ApiError com código, mensagem e Retry-After', async () => {
  const { api, ApiError } = await load()
  replies.push(csrf('t1'), json(429, { error: { code: 'too_many_attempts', message: 'Muitas tentativas.' } }, { 'Retry-After': '900' }))
  const error = await api.post('/auth/login', {}).catch((e: unknown) => e)
  expect(error).toBeInstanceOf(ApiError)
  expect(error).toMatchObject({ status: 429, code: 'too_many_attempts', message: 'Muitas tentativas.', retryAfter: 900 })

  replies.push(new Response('<html>Bad Gateway</html>', { status: 502 }))
  await expect(api.get('/health')).rejects.toMatchObject({ status: 502, code: 'http_error' })
})

test('falha de rede vira network_error', async () => {
  const { api } = await load()
  vi.stubGlobal('fetch', async () => {
    throw new TypeError('Failed to fetch')
  })
  await expect(api.get('/me')).rejects.toMatchObject({ status: 0, code: 'network_error' })
})

test('pedidos simultâneos compartilham uma única busca de CSRF', async () => {
  const { api } = await load()
  replies.push(csrf('t1'), json(200, { data: 1 }), json(200, { data: 2 }))
  await expect(Promise.all([api.post('/a'), api.post('/b')])).resolves.toEqual([1, 2])
  expect(calls.filter((c) => c.url === '/api/auth/csrf')).toHaveLength(1)
})

test('duas mutações com token velho não derrubam o token uma da outra', async () => {
  const { api } = await load()
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  let valid = ''
  let issued = 0
  const attempts: Record<string, number> = {}
  // Servidor simulado: cada GET /auth/csrf invalida o token anterior, como o Flask.
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    if (url === '/api/auth/csrf') {
      issued += 1
      valid = `t${issued}`
      return csrf(valid)
    }
    attempts[url] = (attempts[url] ?? 0) + 1
    const token = (init.headers as Record<string, string>)['X-CSRF-Token']
    if (url === '/api/a' && attempts[url] === 2) await sleep(30) // a repetição de /a chega depois da renovação de /b
    const accepted = token === valid
    if (url === '/api/b' && attempts[url] === 1) await sleep(10) // o 403 de /b volta depois da renovação de /a
    return accepted ? json(200, { data: url }) : csrfInvalid()
  })
  await api.post('/setup')
  valid = 'outra-aba' // outra aba renovou o CSRF: o token em memória ficou velho
  const csrfBefore = issued

  await expect(Promise.all([api.post('/a'), api.post('/b')])).resolves.toEqual(['/api/a', '/api/b'])
  expect(issued - csrfBefore).toBe(1)
})

test('pedido sem resposta vira timeout e a mutação não é repetida', async () => {
  vi.useFakeTimers()
  try {
    const { api } = await load()
    let sent = 0
    vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
      sent += 1
      if (url === '/api/auth/csrf') return Promise.resolve(csrf('t1'))
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })
    })
    const outcome = api.post('/x').catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(15_000)
    expect(await outcome).toMatchObject({ status: 0, code: 'timeout' })
    expect(sent).toBe(2) // CSRF + um único POST
  } finally {
    vi.useRealTimers()
  }
})

test('logout esquece o token CSRF da sessão encerrada', async () => {
  const { login, logout, register } = await import('./auth.ts')
  replies.push(
    csrf('anon'),
    json(200, { data: { user: { id: 'u1' }, csrf_token: 'auth' } }),
    new Response(null, { status: 204 }),
    csrf('anon2'),
    json(201, { data: { id: 'u2' } }),
  )
  await login('a@b.com', 'x'.repeat(12))
  await logout()
  await register('Maria', 'maria', 'm@b.com', 'x'.repeat(12))
  expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
    'GET /api/auth/csrf',
    'POST /api/auth/login',
    'POST /api/auth/logout',
    'GET /api/auth/csrf',
    'POST /api/users',
  ])
  expect(calls[4].headers['X-CSRF-Token']).toBe('anon2')
})
