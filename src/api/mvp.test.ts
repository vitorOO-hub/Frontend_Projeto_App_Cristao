import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { forgetCsrf } from './client.ts'
import { editVideo, deleteVideo } from './videos.ts'
import { comments, createComment, deleteComment } from './comments.ts'
import { myBlocks, blockUser, unblockUser } from './blocks.ts'
import { publicUser, userVideos, updateProfile } from './profile.ts'
const json = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } })
const fetchMock = vi.fn()
beforeEach(() => { forgetCsrf(); vi.stubGlobal('fetch', fetchMock) })
afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks() })
test.each([
  ['PATCH', '/api/videos/v1', { caption: 'Louvor', category: 'louvor', bible_reference: null }, () => editVideo('v1', { caption: 'Louvor', category: 'louvor', bible_reference: null })],
  ['DELETE', '/api/videos/v1', undefined, () => deleteVideo('v1')],
  ['POST', '/api/videos/v1/comments', { text: 'Paz' }, () => createComment('v1', 'Paz')],
  ['DELETE', '/api/comments/c1', undefined, () => deleteComment('c1')],
  ['PUT', '/api/me/blocks/u1', undefined, () => blockUser('u1')],
  ['DELETE', '/api/me/blocks/u1', undefined, () => unblockUser('u1')],
  ['PATCH', '/api/me', { name: 'Ana', bio: 'Olá' }, () => updateProfile({ name: 'Ana', bio: 'Olá' })],
] as const)('%s %s usa cookie/CSRF e payload do contrato', async (method, path, body, call) => {
  fetchMock.mockResolvedValueOnce(json({ csrf_token: 'csrf-test' })).mockResolvedValueOnce(method === 'DELETE' ? new Response(null, { status: 204 }) : json({ id: 'ok' }))
  await call()
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/csrf', expect.objectContaining({ method: 'GET', credentials: 'same-origin' }))
  expect(fetchMock).toHaveBeenLastCalledWith(path, expect.objectContaining({ method, credentials: 'same-origin', headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-test' }), body: body === undefined ? undefined : JSON.stringify(body) }))
})
test.each([
  ['/api/users/u1', () => publicUser('u1')],
  ['/api/videos?author_id=u1&cursor=cursor%2F2', () => userVideos('u1', 'cursor/2')],
  ['/api/videos/v1/comments?cursor=cursor%2F2', () => comments('v1', 'cursor/2')],
  ['/api/me/blocks?cursor=cursor%2F2', () => myBlocks('cursor/2')],
] as const)('GET %s usa endpoints e cursor corretos sem CSRF', async (path, call) => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: [], pagination: { next_cursor: null, has_more: false } }), { status: 200 }))
  await call()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(path, expect.objectContaining({ method: 'GET', credentials: 'same-origin' }))
})
