# Frontend_Projeto_App_Cristao
Frontend do projeto de projeto agil e programação eficaz do app cristao

## Execução

React 19 + TypeScript + Vite 8, com versões exatas em `package.json` e `package-lock.json` (resolvidas em 25/10/2026). Requer Node 22.12+ (`.nvmrc`); Node 24 também funciona. No diretório deste repositório:

```bash
npm ci
npm run dev      # http://localhost:5173, com /api encaminhado ao Flask em 127.0.0.1:5000
npm test         # testes de telas e cliente HTTP (Vitest)
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

## Estrutura de `src/`

```text
src/
  api/                 cliente HTTP central e uma função por endpoint (auth, videos, reports, moderation…)
  components/
    ui/                peças genéricas: Field, Layout, ListStatus, CardSelect, RouteGuards
    feed/              FeedCard, FeedPreview, CommentsPanel
    profile/           EditProfile, MyVideosPanel, OwnVideoActions, BlocksPanel, BlockButton
    moderation/        ReasonForm, ReportsPanel, ReviewPanel
  hooks/               useFieldErrors, usePagedList
  lib/                 funções puras: categories, errorMessage, feed, format, validation, visibility
  pages/               uma tela por rota (nomes em português, iguais às rotas: Feed, Perfil, Moderacao…)
  App.tsx, AppRoutes.tsx, main.tsx, index.css
```

Convenções: o teste fica ao lado do arquivo (`X.test.tsx`); componentes em `PascalCase`; hooks começam com `use`; páginas usam o nome da rota em português e o resto do código usa inglês.

## Fluxos disponíveis

- `/feed` e `/usuarios/:id`: consulta pública de vídeos aprovados, categorias, reprodução manual e passagem bíblica. Para reagir, comentar ou denunciar, é necessário entrar.
- `/perfil`: perfil próprio, edição de nome/bio, publicações em todos os estados, edição de metadados e exclusão com confirmação. Alterar vídeo aprovado o devolve à análise.
- Comentários paginados permitem publicação e remoção apenas pelo autor autenticado. O cliente preserva texto em falha e não repete automaticamente uma publicação após timeout.
- Bloquear um autor ou comentarista refaz as listas e remove conteúdo previamente carregado. A aba **Bloqueados** do perfil permite desbloquear; o filtro é pessoal, sem remoção global.
- `/publicar` envia MP4 para revisão; `/moderacao` oferece fila e tratamento de denúncias para administradores. As permissões são verificadas pelo Flask.

Os clientes usam os endpoints existentes do Flask, com cookie HttpOnly e CSRF; não há acesso direto ao Atlas pelo navegador. Testes de telas e HTTP usam respostas simuladas. Nesta entrega, integração navegador–Flask–Atlas, persistência real, serviço bíblico externo e implantação AWS ainda precisam de verificação em ambiente autorizado.

## Documentação

- Contrato canônico de implementação: [API no backend](https://github.com/vitorOO-hub/Backend_Projeto_App_Cristao/blob/HEAD/docs/api.md), disponível localmente em `../Backend_Projeto_App_Cristao/docs/api.md`.
- [Documento de Escopo e Requisitos do Projeto](https://github.com/vitorOO-hub/Backend_Projeto_App_Cristao/blob/HEAD/docs/escopo-e-requisitos.md): versão principal mantida no backend, com visão do produto, arquitetura proposta, funcionalidades, prioridades, cronograma e critérios de aceite.
- [Requisitos oficiais do Projeto 3](https://insper.github.io/ProgramacaoEficaz/projetos/projeto3/).

https://consonant-amnesty-election.ngrok-free.dev/login
