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
  projeto (`app/assets/css/main.css`). Hoje só Toast e TabView/TabPanel
  estão registrados (`app/plugins/primevue.ts`); registrar ali os demais
  componentes do PrimeVue conforme forem sendo adotados — e, se o
  componente ler strings de `PrimeVue.config.locale` (Calendar, DataTable
  paginado etc.), adicionar o preset do idioma no `LOCALES` do mesmo
  arquivo. Importante: o watcher de locale precisa ficar na mesma chamada
  síncrona do `.use(PrimeVue, ...)` — `usePrimeVue()` usa `inject()` puro do
  Vue, que quebra ("Must be called at the top of a `setup` function") se
  isolado num plugin à parte com `dependsOn` (a espera pela dependência tira
  a chamada do topo do `setup` síncrono).
- **i18n**: `@nuxtjs/i18n`, estratégia `no_prefix` (URL não leva prefixo de
  idioma, mantém a convenção de URL em português). Ver seção **i18n** mais
  abaixo.
- **Banco**: Drizzle ORM + PostgreSQL, `casing: 'snake_case'`
  (`drizzle.config.ts`) — colunas em snake_case no banco, camelCase no
  TypeScript, tradução automática pelo Drizzle.
- **Storage**: S3-compatível via `@aws-sdk/client-s3` + presigned URLs
  (upload direto do browser).
- **Transcrição**: ElevenLabs `scribe_v2` (`server/transcription/`) — texto,
  timestamps por palavra e os blocos de legenda numa chamada só (`additionalFormats`
  exige `diarize: true`). Os blocos viram `transcript_segments`, e SRT/VTT são
  gerados a partir deles em `server/utils/subtitles.ts` (a API não exporta VTT).
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
  commit, `statusMessage` de erro): português. **Texto de UI que aparece na
  tela** (labels, botões, mensagens de validação client-side) não fica
  hardcoded no componente — vai em `i18n/locales/pt-BR.json` (chave em
  inglês, valor em português) e é puxado via `$t()`/`useI18n()`. Ver seção
  **i18n** abaixo.
- Componente Vue: `PascalCase.vue`. Composable: `useAlgo.ts` exportando
  `useAlgo()`.

## i18n

`@nuxtjs/i18n`, 8 idiomas (`pt-BR` padrão, `en`, `es`, `fr`, `de`, `it`,
`ja`, `ko`), estratégia `no_prefix` — mesma URL pra todo idioma, sem prefixo
(`/en/...`), por causa da convenção de URL em português do projeto. Trade-off
consciente: sem hreflang por URL distinta.

- **Arquivos de tradução**: `i18n/locales/<code>.json`. Chave em inglês,
  namespaced por página/componente (`auth.login.title`,
  `app.videoDetail.deleteConfirm`). `pt-BR.json` é a fonte — qualquer chave
  nova entra lá primeiro e precisa existir, com o mesmo formato de
  interpolação (`{year}`, `{email}`...), nos outros 7 arquivos. Literal `@`
  dentro de uma string quebra o compilador de mensagens do vue-i18n (ele lê
  como link `@:`) — escapar como `{'@'}` (ex.: placeholder de e-mail).
- **Dados estruturados** (features de plano, steps do "como funciona" etc.):
  o texto vai pro JSON, só campos não-textuais (id, ícone, preço) ficam em
  `app/data/*.ts` — o componente junta os dois via chave/id.
- **Fora do escopo de UI**: conteúdo transcrito pelo usuário (produto, não
  localização) e o nome do usuário/qualquer dado dinâmico dentro de um
  e-mail (não é traduzido, só o texto fixo do template).
- **Seletor de idioma**: `AppLanguageSwitcher.vue` (bandeiras do pacote
  `flag-icons`, registrado em `nuxt.config.ts`). Anônimo persiste em cookie
  (automático, via `setLocale()` do módulo); logado também salva em
  `users.preferredLocale` (`PATCH /api/auth/locale`).
- **Ordem dos módulos no `nuxt.config.ts` importa**: `@nuxtjs/i18n` precisa
  vir antes de `@nuxtjs/seo` — o SEO detecta o i18n instalado
  (`hasNuxtModule`) durante o próprio setup; se rodar antes, não o enxerga e
  registra um `useI18n()` stub (fallback pra quando não há módulo de i18n)
  que ganha do de verdade no auto-import.
- **`useI18n()` (Composition API do vue-i18n) só funciona dentro do `setup`
  de um componente** — chamado num plugin, lança "Must be called at the top
  of a `setup` function". Em plugins (ex.: `app/plugins/primevue.ts`), usar
  `nuxtApp.$i18n` em vez disso.
- **Mensagens de erro da API** (`statusMessage` de `createError`) são
  traduzidas no server, não no client: `translateError(locale, chave, params?)`
  de `server/utils/i18n.ts`, com dicionários em `server/i18n/errors/<code>.json`
  (separados de `i18n/locales/` — client e server não compartilham o mesmo
  JSON, pra não inflar o bundle do client com chave que ele nunca usa). Zod
  schemas inline (`server/api/**`) passam a **chave** de tradução como
  mensagem custom (ex.: `z.string().email('validation.invalidEmail')`), não
  o texto — o handler resolve com `translateError(locale, issue.message)`.
  `locale` vem de `getRequestLocale(event)`: cookie do `@nuxtjs/i18n`
  (`i18n_redirected`) > header `Accept-Language` > `pt-BR`. Erros 5xx **não**
  passam por tradução (ficam em português — o client já cai no fallback
  genérico pra esses, ver `apiErrorMessage()`).
- **E-mails transacionais** (`server/utils/mailer.ts`) também traduzidos —
  mesmo mecanismo dos erros (`translateEmail`, gerado por
  `createTranslator()` a partir de `server/i18n/emails/<code>.json`).
  `sendVerifyEmail()`/`sendPasswordResetEmail()` montam assunto/corpo
  traduzidos e chamam o `sendMail()` genérico; não montar e-mail com texto
  literal direto num handler de `server/api/**`. Todo fluxo de e-mail usa
  `getRequestLocale(event)` — o idioma da requisição atual, não
  `user.preferredLocale` salvo no banco: as três rotas que mandam e-mail
  (`signup`, `resend-verification`, `forgot-password`) são sempre
  disparadas por uma requisição ao vivo do próprio usuário, e é o cookie
  daquela requisição que reflete o que ele está vendo na tela na hora —
  `preferredLocale` já ficou desatualizado em produção (conta criada antes
  do usuário trocar de idioma como anônimo) e mandou e-mail no idioma
  errado. No signup, esse locale também é gravado como `preferredLocale`
  inicial do novo usuário (define a UI dele daí pra frente, não só aquele
  e-mail). Note que hoje nada lê `preferredLocale` de volta pra aplicar na
  UI no login/`fetchUser()` — só o switcher escreve nele; se isso for
  implementado depois, validar contra `SUPPORTED_LOCALES` antes de usar (a
  coluna é `text()` livre, sem `pgEnum`).

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
