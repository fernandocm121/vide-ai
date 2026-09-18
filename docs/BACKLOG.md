# Backlog — Vide AI

Ordem de desenvolvimento, do estado atual até o MVP e além.
Tamanho: **S** (~1 dia) · **M** (~2–4 dias) · **L** (~1 semana+).

Estado atual: ✅ Landing page (Home) + estrutura do frontend.

---

## Decisões a tomar antes da Fase 1

Escolhas que travam o resto do trabalho. Sugestão entre parênteses.

| Tema | Opções | Sugestão |
| --- | --- | --- |
| Speech-to-Text | OpenAI Whisper API · Deepgram · AssemblyAI · faster-whisper self-hosted | **Whisper API** para o MVP (barato, sem infra); migrar para self-hosted se o custo escalar |
| LLM (resumo, Q&A, geração) | Claude (Anthropic) · GPT · Gemini | **Claude** (`claude-sonnet-5` para qualidade, `claude-haiku-4-5` para tarefas simples) |
| ORM / DB toolkit | Drizzle · Prisma | **Drizzle** (leve, SQL-first, bom com Nitro) |
| Autenticação | nuxt-auth-utils · Lucia · Supabase Auth · Clerk | **nuxt-auth-utils** (simples, self-hosted) ou **Supabase** se quiser DB+Auth+Storage juntos |
| Object storage | Cloudflare R2 · AWS S3 · MinIO (local) | **R2** em produção (sem custo de egress), **MinIO** no docker local |
| Fila | BullMQ (Redis) | **BullMQ** |
| Hosting do worker | precisa de FFmpeg e CPU dedicada | VPS (Hetzner/Fly.io) — **não** serverless para o worker |
| Hosting do frontend/API | Vercel · Cloudflare · Node no mesmo VPS | Vercel/Cloudflare para a landing; API pode ficar junto do worker |

---

## Fase 0 — Fundação do repositório  · `M`

- [ ] ESLint + Prettier (`@nuxt/eslint`) — **S**
- [ ] CI no GitHub Actions: `lint` + `typecheck` + `build` — **S**
- [ ] Deploy da landing (Vercel ou Cloudflare Pages) com domínio — **S**
- [ ] Analytics de produto (PostHog ou Plausible) — **S**
- [ ] Conectar CTAs da Home a `/signup` (hoje apontam para âncoras) — **S**
- [ ] SEO: `sitemap.xml`, imagem OG real, dados estruturados — **S**
- [ ] `CONTRIBUTING` / convenção de commits + branch (opcional) — **S**

## Fase 1 — Infra base do app  · `M`  ✅

- [x] `docker-compose.yml` local: PostgreSQL + Redis + MinIO — **S**
- [x] Validação de env com `zod` (`server/utils/env.ts`) — **S**
- [x] Drizzle + conexão + primeira migration — **M**
- [x] Schema inicial: `users`, `sessions`, `videos`, `transcripts`, `transcript_segments`, `jobs`, `usage` — **M**
- [x] Seed de desenvolvimento — **S**
- [x] Healthcheck estendido (DB + Redis + storage) — **S**

## Fase 2 — Autenticação e contas  · `M`  ✅

- [x] Integrar solução de auth escolhida — **M** (sessão própria por token opaco, sobre o schema `users`/`sessions` já existente)
- [x] Fluxo signup / login / logout + verificação de e-mail — **M**
- [x] Middleware de rota protegida + layout `app` — **S**
- [x] Páginas `/login`, `/signup`, `/app` (dashboard vazio) — **S**
- [x] Registro de usuário cria plano `free` por padrão — **S**
- [x] Página `/app/conta` (perfil, trocar senha) — **S**

## Fase 3 — Áudio: upload de MP3 + transcrição (Whisper)  · `M`  🔨

Fatia vertical ponta a ponta. Código pronto — falta verificar com Docker + chave OpenAI reais.

- [x] Migration: status `uploaded` + coluna `media_kind` — **S**
- [x] `env.ts`: `OPENAI_API_KEY` + `MAX_UPLOAD_BYTES` — **S**
- [x] `POST /api/videos` — cria registro + URL pré-assinada (PUT) — **M**
- [x] Helpers de storage: `presignPut` / `presignGet` / `headObject` / `getObjectBuffer` / `deleteObject` — **S**
- [x] `POST /api/videos/:id/complete` — confirma upload, status → `uploaded` — **S**
- [x] `<AudioUploader>`: drag-and-drop, validação, PUT com barra de progresso (XHR) — **M**
- [x] Botão "Transcrever" + `POST /api/videos/:id/transcribe` (202, background) — **S**
- [x] `server/transcription/provider.ts` — interface + `openaiWhisper` (`verbose_json`) — **M**
- [x] `runTranscription()` — download → Whisper → `transcripts` + `transcript_segments` → `ready` + `usage` — **M**
- [x] Erro → status `failed` + mensagem; sweep no boot recupera presos — **S**
- [x] `/app` (dashboard): lista com status; `/app/videos/[id]`: player + polling + transcrição + "Tentar de novo" — **M**
- [x] `DELETE /api/videos/:id` — storage + DB (cascade) — **S**
- [ ] **Verificar o fluxo completo** com `services:up` + `OPENAI_API_KEY` real

## Fase 3B — Upload e extração de áudio de vídeo  · `M`  🔨

- [x] Upload de MP4 / MOV / WEBM (mesmo fluxo pré-assinado, validando mimetype + tamanho por tipo) — **M**
- [x] Registro `videos` vai direto para `queued` ao confirmar o upload — **S**
- [x] Job de extração de áudio com ffmpeg (`extracting` → `transcribing`) — **Opção A: inline no Nitro**
      (`server/transcription/extract.ts` + `ffmpeg.ts`, binário via `ffmpeg-static`). Baixa o vídeo em
      stream para um arquivo temp, extrai o áudio (mono/16kHz/mp3), sobe `media/{id}/extracted-audio.mp3`
      e encadeia `runTranscription()` reaproveitando o pipeline do Whisper que já existia para áudio.
      Funciona local/VPS; **não é confiável em serverless (Vercel) para vídeos longos** — ver
      `docs/backlog-issues.pdf` (seção 5) para a versão de produção (Opção B, BullMQ + worker).
- [ ] Thumbnail real do vídeo (hoje o dashboard usa um ícone por `mediaKind` como placeholder)
- [ ] Arquivos de áudio > 25 MB: chunking com ffmpeg antes de enviar ao gpt-transcribe

## Fase 4 — Pipeline de transcrição escalável  · `L`

Substitui o processamento em background simples da Fase 3/3B (que hoje roda
inline no processo do Nitro — sem fila real, sem retry automático, e sem
garantia de sobreviver a um restart ou a um limite de tempo de função
serverless). Spec completa (motivação, arquitetura, plano de migração,
critérios de aceite) em [`docs/backlog-issues.pdf`](backlog-issues.pdf)
(seção 5 — Worker dedicado).

- [ ] Setup BullMQ + processo `worker` separado (`worker/`, `npm run worker`) — **M**
- [ ] Mover `runTranscription` para um job da fila `transcribe` — **M**
- [ ] Retry com backoff + dead-letter para falhas — **S**
- [ ] Concorrência configurável / rate limit por provider — **S**
- [ ] Substituir o sweep de boot pela reentrega automática do BullMQ — **S**
- [ ] Painel de filas (Bull Board) em dev — **S**
- [ ] Atualização de status em tempo real (SSE) no lugar do polling — **M**

## Fase 5 — Visualização e export (V1)  · `M`  → **fecha o MVP V1**

- [x] Player de vídeo/áudio + transcrição sincronizada (clicar no trecho → seek) — **L**
- [x] Busca dentro da transcrição (destaca ocorrências, navega entre elas) — **S**
- [x] Export TXT — **S**
- [x] Export SRT e VTT — **S**
- [x] Edição inline da transcrição por segmento — `PATCH /api/videos/:id/segments/:segmentId`
      atualiza o segmento e resincroniza `transcripts.text` (join dos segmentos por `idx`) na
      mesma transaction; edição fica restrita ao modo Segmentos (Texto corrido continua só
      leitura) — **M**
- [ ] Identificação de falantes (diarização) — **M** — spec em
      `docs/backlog-issues.pdf` (seção 3)
- [ ] Compartilhar transcrição por link público (opcional) — **M**

## Fase 6 — Inteligência (V2)  · `L`

- [ ] Job `analyze`: resumo automático (LLM) — **M**
- [ ] Job `analyze`: capítulos com timestamps — **M**
- [ ] Job `analyze`: palavras-chave / tópicos — **S**
- [ ] UI: abas Resumo / Capítulos / Keywords na página do vídeo — **M**
- [ ] Q&A sobre um vídeo (chat com contexto da transcrição) — **M**
- [ ] Reprocessar análise sob demanda — **S**

## Fase 7 — Base de conhecimento (V3)  · `L`

- [ ] `pgvector` + geração de embeddings por segmento (job `embed`) — **M**
- [ ] **Ask Your Video**: pergunta → resposta + vídeo + timestamp + deep link — **L**
- [ ] **Biblioteca inteligente**: busca semântica entre todos os vídeos do usuário — **L**
- [ ] UI de busca global no dashboard — **M**
- [ ] Filtros (por vídeo, data, tipo) — **S**

## Fase 8 — Geração de conteúdo (V4 / premium)  · `L`

- [ ] Gerar títulos (variações A/B) e descrições — **M**
- [ ] Sugestão de melhores momentos por potencial de retenção — **M**
- [ ] Roteiro de Shorts / cortes sugeridos (lista de timestamps + motivo) — **M**
- [ ] Render de cortes de vídeo com FFmpeg (download do clipe) — **L**
- [ ] Show notes / thread / newsletter a partir do vídeo — **M**
- [ ] Templates de saída editáveis — **M**
- [ ] Integrações YouTube / TikTok / Instagram (publicação) — **L** (pós-lançamento)

## Fase 9 — Billing e planos  · `M`

- [x] Enforcement de limite de horas/mês por plano — `server/utils/plans.ts` +
      `usage.ts`, bloqueia `POST /transcribe` com `402` quando o plano
      estoura — falta só o `free` ter um dono de verdade (Fase 2) — **M**
- [ ] Stripe: checkout, webhooks, customer portal — **M**
- [ ] Planos Starter / Pro / Agency no Stripe + mapeamento no DB — **S**
- [ ] Paywall nas features Pro (Ask Video, geração, busca global) — **S**
- [ ] Tela de uso/consumo no `/app/conta` — **S**
- [ ] E-mails transacionais (upload pronto, limite atingido) — **M**

Spec completa do billing (Stripe + tela de consumo) em
[`docs/backlog-issues.pdf`](backlog-issues.pdf) (seção 4).

## Fase 10 — Produção e escala  · `L`

- [ ] Observabilidade: Sentry (erros) + logs estruturados + métricas de fila — **M**
- [ ] Rate limiting nas rotas de API e upload — **S**
- [ ] Lifecycle de storage: apagar arquivos temporários, política de retenção — **S**
- [ ] Otimização de custo de STT/LLM (cache, modelo menor para tarefas simples) — **M**
- [ ] Testes E2E com Playwright nos fluxos críticos — **M**
- [ ] LGPD: política de privacidade, termos, exclusão de conta e dados — **M**
- [ ] Load test do pipeline (fila sob carga) — **S**
- [ ] Verificar domínio próprio no Resend (SPF/DKIM) para o remetente de
      e-mail transacional — hoje usa `onboarding@resend.dev` (domínio
      compartilhado de teste), que entrega mas cai em spam com facilidade — **S**

---

## Caminho crítico até o primeiro usuário pagante

```
Fase 0 → 1 → 2 → 3 → 4 → 5   (MVP V1: upload → transcrição → player + export)
                              ↓
                         Fase 9 (billing) + Fase 6 (resumo/capítulos)
                              ↓
                         Lançamento pago
```

Fases 7 e 8 são o diferencial de marketing ("Pergunte ao seu vídeo", geração de
conteúdo) — priorizar logo após o lançamento para justificar o plano Pro.
