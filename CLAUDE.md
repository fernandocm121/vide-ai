# CLAUDE.md

Instruções de projeto para o Claude Code neste repositório (`vide-ai`).

## Commits

Seguir [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>[escopo opcional]: <descrição curta>

<corpo — o quê e por quê, em português, como já era feito>
```

- **Tipos**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
  `build`, `ci`, `chore`, `revert`.
- **Tipo e escopo em inglês** (compatibilidade com ferramentas/changelog
  automático); **descrição e corpo em português**, no mesmo tom direto já
  usado no projeto.
- Escopo é opcional, mas ajuda quando a mudança é claramente de uma área
  (`feat(upload): ...`, `fix(transcricao): ...`).
- Commit sem corpo é aceitável para mudanças pequenas e autoexplicativas;
  mudanças maiores devem detalhar o que foi feito, como os commits
  anteriores a esta convenção já faziam.

Exemplo:
```
feat(transcricao): edição de transcrição por segmento

- PATCH /api/videos/:id/segments/:segmentId atualiza o segmento e
  resincroniza transcripts.text (join por idx) na mesma transaction
- TranscriptView.vue: edição inline no modo Segmentos (textarea no
  dblclick/lápis, salva no blur), indicador de salvando/salvo/erro
- Modo Texto corrido continua só leitura
```

> Commits anteriores a 2026-09-16 usam o estilo antigo ("Fase N —
> descrição", sem prefixo de tipo) e não foram reescritos — a convenção
> vale a partir daqui pra frente.

## Branches

Prefixo pelo mesmo tipo usado nos commits, kebab-case, sem escopo:

```
<tipo>/<descrição-curta-em-kebab-case>
```

Exemplos: `feat/editor-transcricao-por-segmento`,
`fix/upload-timeout`, `docs/convencao-commits`, `chore/atualiza-deps`.

- Tipo igual ao do commit predominante da branch (`feat`, `fix`, `docs`,
  `refactor`, `chore`, etc.).
- Descrição em português, kebab-case, sem acento (compatibilidade com
  URLs/terminal).

> `fase-3b-video-upload-extracao-audio` e `editor-transcricao-por-segmento`
> foram criadas antes desta convenção — não foram renomeadas
> retroativamente se já estiverem mescladas; a branch de trabalho atual foi
> renomeada para seguir o padrão daqui pra frente.

## Stack

Nuxt 4 (Vue 3 + Nitro) com TypeScript. A visão geral do sistema (fluxo de
processamento, filas, worker, banco) está em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) —
não duplicar aqui. Esta seção cobre só as bibliotecas e o porquê de cada
uma, quando não é óbvio:

- **UI**: dar preferência ao **PrimeVue** pra componentes de interface
  (botões, inputs, dialogs, dropdowns, tabelas, toast) — checar o catálogo
  da lib antes de criar um componente novo do zero. Tailwind 4 (via
  `@tailwindcss/vite`) fica pra layout, espaçamento e os design tokens do
  projeto (`app/assets/css/main.css`). Hoje só o Toast está registrado
  (`app/plugins/primevue.ts`); registrar ali os demais componentes do
  PrimeVue conforme forem sendo adotados.
- **Banco**: Drizzle ORM + PostgreSQL, `casing: 'snake_case'`
  (`drizzle.config.ts`) — colunas em snake_case no banco, camelCase no
  TypeScript, tradução automática pelo Drizzle.
- **Storage**: S3-compatível via `@aws-sdk/client-s3` + presigned URLs
  (upload direto do browser).
- **Transcrição**: OpenAI `gpt-transcribe` (`server/transcription/`).
- **E-mail**: Resend (`server/utils/mailer.ts`) — sem `RESEND_API_KEY`, cai
  em log no servidor (dev).
- **Analytics**: PostHog (`posthog-js`), client-only.
- **Validação**: Zod em toda borda (env vars, body de API).
- **Redis** (`ioredis`) e a fila de jobs (BullMQ, ver ARCHITECTURE.md) —
  Redis já está integrado; a fila ainda não foi implementada como
  dependência do projeto.

## Estrutura de pastas

- `app/pages/` — rotas do Nuxt. **URL em português** (`esqueci-senha`,
  `redefinir-senha`, `verificar-email`, `conta`), igual ao que o usuário
  vê no navegador.
- `app/components/app/` — componentes da área autenticada (upload, player,
  transcrição). `app/components/home/` — seções da landing. Direto em
  `app/components/` — componentes de layout/genéricos (`AppHeader`,
  `BaseButton`, etc.).
- `app/composables/` — estado e lógica compartilhada (`useAuth`,
  `useNotify`, `useAnalytics`).
- `server/api/` — rotas do Nitro. Nome do arquivo = rota + método
  (`login.post.ts`, `[id]/index.get.ts`, `[id]/export/[format].get.ts`).
  **Rota em inglês**, mesmo quando a página correspondente é em
  português (`forgot-password.post.ts` serve `esqueci-senha.vue`).
- `server/utils/` — auto-importado pelo Nitro; lógica de servidor
  reutilizável (auth, sessão, drizzle, env, storage).
- `server/db/schema.ts` — schema único do Drizzle (não dividir por
  arquivo); migrations em `server/db/migrations/` são geradas
  (`npm run db:generate`) e **nunca editadas à mão**.
- `server/plugins/` — plugins do Nitro com prefixo numérico pra ordem de
  execução (`0.env.ts` valida env antes de tudo, `1.shutdown.ts`,
  `2.sweep.ts`) — manter o prefixo ao adicionar um novo.

## Convenções de nomenclatura

- **Identificadores de código** (componentes, composables, variáveis,
  colunas do banco, rotas de API): inglês.
- **Texto voltado ao usuário** (URLs de página, comentários, mensagens de
  commit, `statusMessage` de erro, labels de UI): português.
- Componente Vue: `PascalCase.vue`. Composable: `useAlgo.ts` exportando
  `useAlgo()`.

## Padrões de API (server/api)

- Body validado com Zod inline no handler (schema local, não
  compartilhado) — ver `server/api/auth/login.post.ts` como referência.
- Erros via `createError({ statusCode, statusMessage })`; `statusMessage`
  em português e seguro pra mostrar direto ao usuário (400 = validação,
  401 = credencial/sessão inválida).
- No client, `apiErrorMessage()` (`app/utils/api-error.ts`) só confia no
  `statusMessage` do servidor para 4xx — qualquer 5xx cai num fallback
  genérico, pra nunca vazar erro interno na UI.

## Variáveis de ambiente

Toda env var nova precisa ser adicionada ao schema Zod em
`server/utils/env.ts` (com mensagem de erro explicando o formato
esperado) e ao `.env.example`. Nada deve ler `process.env` diretamente
fora desse arquivo — sempre via `useEnv()`.

## Testes

Vitest só cobre lógica pura de servidor (`server/utils/*.test.ts`,
`server/transcription/*.test.ts`) — sem teste de componente Vue nem de
rota de API completa por enquanto. `describe` nomeia a função testada,
`it` descreve o comportamento em português.
