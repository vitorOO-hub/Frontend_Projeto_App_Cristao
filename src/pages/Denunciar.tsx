import { useId, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../api/client.ts'
import { REASON_MAX, REASON_MIN, reportVideo } from '../api/reports.ts'
import { Brand, Spinner } from '../components/Layout.tsx'
import { CardSelect } from '../components/CardSelect.tsx'
import { errorMessage } from '../errorMessage.ts'

const VIDEO_ID = /^[0-9a-f]{24}$/
/** A descrição é opcional e curta; o servidor recebe "Motivo: descrição" num único campo `reason`. */
const DETAIL_MAX = 500

/** Motivos oferecidos na plataforma. Cada rótulo tem 10+ caracteres: sozinho já vale como `reason` no servidor. */
const REASONS = [
  'Conteúdo ofensivo ou blasfemo',
  'Discurso de ódio ou discriminação',
  'Assédio ou intimidação',
  'Distorção da fé ou manipulação religiosa',
  'Nudez ou conteúdo sexual',
  'Violência ou conteúdo perturbador',
  'Golpe ou pedido de dinheiro enganoso',
  'Spam ou propaganda',
  'Violação de privacidade',
  'Outro motivo',
].map((label) => ({ value: label, label }))

/** Mensagem de quem denuncia: o servidor responde 409 se já denunciou e 404 se o vídeo saiu do ar. */
function failure(e: unknown): string {
  if (e instanceof ApiError && e.code === 'already_reported') return 'Você já denunciou este vídeo. Nossa equipe vai analisar.'
  if (e instanceof ApiError && e.status === 404) return 'Este vídeo não está mais disponível para denúncia.'
  return errorMessage(e, `O motivo deve ter de ${REASON_MIN} a ${REASON_MAX} caracteres.`)
}

/** Denúncia de um vídeo aprovado de outra pessoa. A legenda só chega por navegação interna, para dar contexto. */
export default function Denunciar() {
  const { id = '' } = useParams()
  const { state } = useLocation()
  const caption = typeof (state as { caption?: unknown } | null)?.caption === 'string' ? (state as { caption: string }).caption : ''
  const fieldId = useId()
  const [category, setCategory] = useState('')
  const [detail, setDetail] = useState('')
  const [touched, setTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const size = detail.trim().length
  const invalid = category ? '' : 'Escolha um motivo para a denúncia.'
  const shown = touched ? invalid : ''
  const reason = size ? `${category}: ${detail.trim()}` : category

  async function submit() {
    setTouched(true)
    if (invalid) {
      document.getElementById(`${fieldId}-reason`)?.querySelector('button')?.focus()
      return
    }
    if (sending) return
    setSending(true)
    setError('')
    try {
      await reportVideo(id, reason)
      setSent(true)
    } catch (e) {
      setError(failure(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="vpage">
      <header className="topbar vtopbar">
        <Brand />
        <Link to="/perfil" className="glass vback">
          ← Perfil
        </Link>
      </header>
      <main className="glass vpanel">
        <h1 className="vtitle">Denunciar vídeo</h1>
        {!VIDEO_ID.test(id) ? (
          <p role="alert" className="alert">
            Vídeo inválido.
          </p>
        ) : sent ? (
          <>
            <p className="lead" role="status">
              Denúncia enviada. Obrigado por ajudar a cuidar da comunidade: nossa equipe vai analisar o vídeo.
            </p>
            <Link to="/perfil" className="button vmore">
              Voltar ao perfil
            </Link>
          </>
        ) : (
          <>
            <p className="lead">
              Conte o que há de errado. A denúncia vai para a moderação e não remove o vídeo sozinha.
            </p>
            {caption && <p className="vcaption">“{caption}”</p>}
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                void submit()
              }}
            >
              <div id={`${fieldId}-reason`}>
                <CardSelect label="Motivo da denúncia" options={REASONS} placeholder="Escolha um motivo" value={category} onChange={setCategory} invalid={shown} describedBy={`${fieldId}-note`} />
                {shown && (
                  <p id={`${fieldId}-note`} className="field-error">
                    {shown}
                  </p>
                )}
              </div>
              <div className="field">
                <label htmlFor={fieldId}>Quer contar mais? (opcional)</label>
                <div className="field-control">
                  <textarea
                    id={fieldId}
                    name="detail"
                    rows={4}
                    maxLength={DETAIL_MAX}
                    value={detail}
                    placeholder="Escreva uma breve descrição do que aconteceu."
                    onChange={(event) => setDetail(event.target.value)}
                  />
                </div>
                <p className="field-hint">
                  {size}/{DETAIL_MAX}
                </p>
              </div>
              {error && (
                <p role="alert" className="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="button vmore" disabled={sending}>
                {sending && <Spinner />}
                {sending ? 'Enviando…' : 'Enviar denúncia'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
