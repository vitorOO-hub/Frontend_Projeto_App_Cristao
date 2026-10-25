import { useEffect, useState } from 'react'
import { ApiError, api } from './api/client.ts'

// Página provisória até as telas de cadastro e login (#56, #57): confirma que o proxy /api chega ao Flask.
export default function App() {
  const [status, setStatus] = useState('verificando…')

  useEffect(() => {
    api
      .get<{ status: string }>('/health')
      .then((data) => setStatus(data.status === 'ok' ? 'conectada' : data.status))
      .catch((error: unknown) =>
        setStatus(error instanceof ApiError ? `indisponível (${error.code})` : 'indisponível'),
      )
  }, [])

  return (
    <main>
      <h1>App Cristão</h1>
      <p>API: {status}</p>
    </main>
  )
}
