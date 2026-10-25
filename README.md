# Frontend_Projeto_App_Cristao
Frontend do projeto de projeto agil e programação eficaz do app cristao

## Execução

React 19 + TypeScript + Vite 8, com versões exatas em `package.json` e `package-lock.json` (resolvidas em 25/10/2026). Requer Node 22.12+ (`.nvmrc`); Node 24 também funciona. No diretório deste repositório:

```bash
npm ci
npm run dev      # http://localhost:5173, com /api encaminhado ao Flask em 127.0.0.1:5000
npm test         # testes do cliente HTTP (Vitest)
npm run lint
npm run build    # checagem de tipos + build em dist/
```

Suba o backend antes (`flask --app app run --host 127.0.0.1 --port 5000`, veja o README do backend). A porta 5173 é fixa porque o Flask só aceita a origem `APP_ORIGIN=http://localhost:5173`. Não há CORS: no desenvolvimento o Vite encaminha `/api`, e em produção o Nginx serve o build e o `/api` na mesma origem.

Toda chamada à API passa por `src/api/client.ts`:
- **Sessão:** o cookie `app_session` é HttpOnly e o navegador o envia sozinho.
- **CSRF:** o token fica só em memória. Antes do primeiro POST/PUT/PATCH/DELETE, o cliente busca o token em `GET /api/auth/csrf` e o renova quando o login devolve um novo. Se a resposta for `403 csrf_invalid`, ele busca outro token e repete o pedido uma única vez.
- **Erros:** chegam como `ApiError`, com `status`, `code`, `message` e `retryAfter`. Falha de rede tem `status` 0 e `code` `network_error`.

```ts
import { ApiError, api } from './api/client.ts'

const { user } = await api.post<{ user: UserSelf }>('/auth/login', { email, password })
const me = await api.get<UserSelf>('/me')
```

## Documentação

- Contrato canônico de implementação: [API no backend](https://github.com/vitorOO-hub/Backend_Projeto_App_Cristao/blob/HEAD/docs/api.md), disponível localmente em `../Backend_Projeto_App_Cristao/docs/api.md`.
- [Documento de Escopo e Requisitos do Projeto](https://github.com/vitorOO-hub/Backend_Projeto_App_Cristao/blob/HEAD/docs/escopo-e-requisitos.md): versão principal mantida no backend, com visão do produto, arquitetura proposta, funcionalidades, prioridades, cronograma e critérios de aceite.
- [Requisitos oficiais do Projeto 3](https://insper.github.io/ProgramacaoEficaz/projetos/projeto3/).
