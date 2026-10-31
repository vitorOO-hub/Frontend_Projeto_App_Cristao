import { useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { CAPTION_MAX, MAX_FILE_BYTES, publishVideo, REFERENCE_MAX } from '../api/publish.ts'
import { CATEGORIES } from '../categories.ts'
import { Field } from '../components/Field.tsx'
import { Brand, Spinner } from '../components/Layout.tsx'
import { errorMessage } from '../errorMessage.ts'

function fileProblem(file: File | null): string {
  if (!file) return 'Escolha um arquivo de vídeo.'
  if (!file.name.toLowerCase().endsWith('.mp4')) return 'O arquivo precisa ser um MP4 (.mp4).'
  if (file.size > MAX_FILE_BYTES) return 'O vídeo passa de 50 MB. Escolha um arquivo menor.'
  return ''
}

/** Publicação de um vídeo MP4 (até 90 s, H.264). Ele fica em análise até a moderação aprovar. */
export default function Publicar() {
  const fileId = useId()
  const captionId = useId()
  const categoryId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [category, setCategory] = useState('')
  const [reference, setReference] = useState('')
  const [touched, setTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const problems = {
    file: fileProblem(file),
    caption: caption.trim() ? '' : 'Escreva uma legenda.',
    category: category ? '' : 'Escolha uma categoria.',
  }
  const invalid = Boolean(problems.file || problems.caption || problems.category)
  const shown = (key: keyof typeof problems) => (touched ? problems[key] : '')

  async function submit() {
    setTouched(true)
    if (invalid || !file) return
    if (sending) return
    setSending(true)
    setError('')
    try {
      await publishVideo({ file, caption, category, bibleReference: reference })
      setSent(true)
    } catch (e) {
      setError(errorMessage(e, 'Confira a legenda, a categoria e a referência bíblica.'))
    } finally {
      setSending(false)
    }
  }

  function again() {
    setFile(null)
    setCaption('')
    setCategory('')
    setReference('')
    setTouched(false)
    setSent(false)
  }

  return (
    <div className="vpage">
      <header className="topbar vtopbar">
        <Brand />
        <Link to="/" className="glass vback">
          ← Início
        </Link>
      </header>
      <main className="glass vpanel feed">
        <h1 className="vtitle">Publicar vídeo</h1>
        {sent ? (
          <>
            <p className="lead" role="status">
              Vídeo enviado! Ele está em análise e aparece no feed assim que a moderação aprovar. Você acompanha a situação no
              perfil.
            </p>
            <Link to="/perfil" className="button vmore">
              Ver meus vídeos
            </Link>
            <button type="button" className="vfilter vmore" onClick={again}>
              Publicar outro
            </button>
          </>
        ) : (
          <>
            <p className="lead">MP4 de até 90 segundos e 50 MB. Todo vídeo passa pela moderação antes de ir para o feed.</p>
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                void submit()
              }}
            >
              <div className="field">
                <label htmlFor={fileId}>Arquivo de vídeo</label>
                <div className="field-control">
                  <input
                    ref={input}
                    id={fileId}
                    type="file"
                    accept="video/mp4,.mp4"
                    aria-invalid={shown('file') ? true : undefined}
                    aria-describedby={`${fileId}-note`}
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                </div>
                <p id={`${fileId}-note`} className={shown('file') ? 'field-error' : 'field-hint'}>
                  {shown('file') || (file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)` : 'Formato MP4.')}
                </p>
              </div>

              <div className="field">
                <label htmlFor={captionId}>Legenda</label>
                <div className="field-control">
                  <textarea
                    id={captionId}
                    name="caption"
                    rows={4}
                    maxLength={CAPTION_MAX}
                    value={caption}
                    aria-invalid={shown('caption') ? true : undefined}
                    aria-describedby={`${captionId}-note`}
                    onChange={(event) => setCaption(event.target.value)}
                  />
                </div>
                <p id={`${captionId}-note`} className={shown('caption') ? 'field-error' : 'field-hint'}>
                  {shown('caption') || 'Conte do que se trata o vídeo.'} ({caption.length}/{CAPTION_MAX})
                </p>
              </div>

              <div className="field">
                <label htmlFor={categoryId}>Categoria</label>
                <div className="field-control">
                  <select
                    id={categoryId}
                    name="category"
                    value={category}
                    aria-invalid={shown('category') ? true : undefined}
                    aria-describedby={`${categoryId}-note`}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="">Escolha…</option>
                    {Object.entries(CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                {shown('category') && (
                  <p id={`${categoryId}-note`} className="field-error">
                    {shown('category')}
                  </p>
                )}
              </div>

              <Field
                label="Referência bíblica (opcional)"
                name="bible_reference"
                maxLength={REFERENCE_MAX}
                value={reference}
                hint="Ex.: Salmos 23:1. O versículo aparece junto do vídeo."
                onChange={(event) => setReference(event.target.value)}
              />

              {error && (
                <p role="alert" className="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="button vmore" disabled={sending}>
                {sending && <Spinner />}
                {sending ? 'Enviando…' : 'Publicar'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
