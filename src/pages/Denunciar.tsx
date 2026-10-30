import { useId, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../api/client.ts'
import { REASON_MAX, REASON_MIN, reportVideo } from '../api/reports.ts'
import { Brand, Spinner } from '../components/Layout.tsx'
import { errorMessage } from '../errorMessage.ts'

const VIDEO_ID = /^[0-9a-f]{24}$/

/** Mensagem de quem denuncia: o servidor responde 409 se já denunciou e 404 se o vídeo saiu do ar. */
function failure(e: unknown): string {
  if (e instanceof ApiError && e.code === 'already_reported') return 'Você já denunciou este vídeo. Nossa equipe vai analisar.'
  if (e instanceof ApiError && e.status === 404) return 'Este vídeo não está mais disponível para denúncia.'
  return errorMessage(e, `Descreva o motivo com ${REASON_MIN} a ${REASON_MAX} caracteres.`)
}

/** Denúncia de um vídeo aprovado de outra pessoa. A legenda só chega por navegação interna, para dar contexto. */
export default function Denunciar() {
  const { id = '' } = useParams()
  const { state } = useLocation()
  const caption = typeof (state as { caption?: unknown } | null)?.caption === 'string' ? (state as { caption: string }).caption : ''
  const fieldId = useId()
  const area = useRef<HTMLTextAreaElement>(null)
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const size = reason.trim().length
  const invalid = size < REASON_MIN ? `Descreva o motivo com pelo menos ${REASON_MIN} caracteres.` : ''
  const shown = touched ? invalid : ''

  async function submit() {
    setTouched(true)
    if (invalid) {
      area.current?.focus()
      return
    }
    if (sending) return
    setSending(true)
    setError('')
    try {
      await reportVideo(id, reason.trim())
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
              <div className="field">
                <label htmlFor={fieldId}>Motivo da denúncia</label>
                <div className="field-control">
                  <textarea
                    ref={area}
                    id={fieldId}
                    name="reason"
                    required
                    rows={6}
                    maxLength={REASON_MAX}
                    value={reason}
                    aria-invalid={shown ? true : undefined}
                    aria-describedby={`${fieldId}-note`}
                    onBlur={() => setTouched(true)}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </div>
                <p id={`${fieldId}-note`} className={shown ? 'field-error' : 'field-hint'}>
                  {shown || `Entre ${REASON_MIN} e ${REASON_MAX} caracteres.`} ({size}/{REASON_MAX})
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
