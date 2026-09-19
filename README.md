# Vide AI

**Video Intelligence** — transforme qualquer vídeo em texto, conhecimento e conteúdo pronto para publicar.

> Posicionamento: não é um "Read AI brasileiro". É uma plataforma de inteligência para vídeos, focada em criadores — YouTubers, podcasters, professores e jornalistas.
> Vídeo → Conhecimento → Conteúdo.

---

## Estado atual

- ✅ **Home (landing page)** + estrutura do frontend
- ✅ **Infra local + camada de dados** (Fase 1): Postgres + Redis + MinIO via Docker, Drizzle ORM, healthcheck
- ✅ **Upload de vídeo/áudio** (Fase 3B): MP4/MOV/WEBM/MP3/WAV via URL pré-assinada, drag-and-drop + progresso, dashboard, exclusão
- ✅ **Transcrição de vídeo e áudio** (Fase 3 + 3B): áudio vai direto ao ElevenLabs Scribe v2 (texto + timestamps por segmento e palavra); vídeo primeiro extrai a trilha de áudio com FFmpeg (inline no Nitro — "Opção A", ver `docs/backlog-issues.pdf` para a versão de produção)
- ✅ **Busca, export (TXT) e limite gratuito mensal**: busca com destaque na transcrição, download em TXT, e bloqueio automático quando o plano estoura o uso do mês

Stack: **Nuxt 4 + Vue 3 + Tailwind CSS v4**, **Drizzle ORM + PostgreSQL**, **Redis** (fila, Fase 4), **S3/MinIO** (storage), **ElevenLabs Scribe v2** (transcrição).

## Rodando o projeto

Pré-requisitos: **Node 20.12+** (ver `.nvmrc`), **Docker** e uma **chave da ElevenLabs**.

```bash
npm install
cp .env.example .env        # valores padrão já batem com o docker-compose
# edite .env e coloque sua ELEVENLABS_API_KEY real

npm run services:up         # sobe Postgres + Redis + MinIO
npm run db:setup            # aplica migrations + popula dados de dev
npm run dev                 # http://localhost:3000
```

Verifique a saúde da infra: `curl http://localhost:3000/api/health` → deve retornar
`status: "ok"` com `database`, `redis` e `storage` todos `up`.

Login de desenvolvimento (após o seed): `dev@videai.local` / `password`.

### Testar o upload

1. Abra `http://localhost:3000/app`
2. Arraste um MP4/MOV/WEBM (até 2 GB) ou MP3/WAV/M4A/AAC (até 25 MB) — a barra de progresso mostra o envio
3. Ao concluir, o item aparece na lista com status `Na fila`

### Testar a transcrição (áudio ou vídeo)

1. Envie um arquivo de áudio (**.mp3**/**.wav**/**.m4a**/**.aac**) ou vídeo (**.mp4**/**.mov**/**.webm**)
2. Na página do vídeo, clique em **Transcrever áudio** (áudio) ou **Processar vídeo** (vídeo)
3. Áudio: `Na fila` → `Transcrevendo` → `Pronto`. Vídeo: `Na fila` → `Extraindo áudio` →
   `Transcrevendo` → `Pronto` (polling a cada 3 s)
4. O texto aparece com timestamps por segmento; clicar num segmento posiciona o player

> A extração de vídeo roda com FFmpeg **inline no processo do Nitro** (`server/transcription/extract.ts`,
> binário via `ffmpeg-static`) — funciona bem local/VPS; em produção na Vercel só é confiável para
> vídeos curtos (função serverless pode ser encerrada antes de terminar um vídeo longo, e `/tmp` tem
> pouco espaço). O caminho de produção (fila + worker dedicado) está detalhado em
> [`docs/backlog-issues.pdf`](docs/backlog-issues.pdf) (seção 5).
> Sem chave da ElevenLabs, a transcrição termina em `failed` com a mensagem de erro da API.

### Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | ambiente de desenvolvimento |
| `npm run build` / `preview` | build de produção / preview local |
| `npm run typecheck` | checagem de tipos |
| `npm run services:up` / `services:down` | sobe / derruba a infra Docker |
| `npm run services:reset` | derruba a infra **e apaga os volumes** |
| `npm run db:generate` | gera migration a partir de `server/db/schema.ts` |
| `npm run db:migrate` | aplica migrations pendentes |
| `npm run db:seed` | popula dados de desenvolvimento (idempotente) |
| `npm run db:setup` | `db:migrate` + `db:seed` |
| `npm run db:studio` | abre o Drizzle Studio (GUI do banco) |

Serviços locais: Postgres `:5432` · Redis `:6379` · MinIO API `:9000` · MinIO console `:9001` (`videai` / `videai_secret`).

## Estrutura

```
app/
  assets/css/main.css       # @theme com os design tokens (cores da marca, tipografia)
  components/
    AppHeader.vue           # topo fixo + menu mobile
    AppFooter.vue
    AppLogo.vue
    AppIcon.vue             # ícones SVG inline
    BaseButton.vue          # botão polimórfico (button / a / NuxtLink)
    SectionHeading.vue      # eyebrow + título + subtítulo
    home/
      HeroSection.vue
      ProblemSection.vue
      HowItWorksSection.vue
      DifferentialSection.vue   # Ask Your Video + Biblioteca inteligente
      AudienceSection.vue
      PipelineSection.vue
      PricingSection.vue
      FinalCtaSection.vue
    app/                    # área logada (/app)
      MediaUploader.vue     # upload de vídeo/áudio (drag-and-drop + progresso)
      StatusBadge.vue
      TranscriptView.vue    # texto corrido com busca e destaque
  data/home.ts              # conteúdo das seções (passos, públicos, planos)
  utils/media.ts            # rótulos de status, formatação de tempo/duração
  layouts/
    default.vue             # layout da landing
    app.vue                 # layout da área logada
  pages/
    index.vue               # Home
    app/index.vue           # dashboard: lista de vídeos + uploader
    app/videos/[id].vue     # detalhe: player + transcrição + ações
server/
  api/
    health.get.ts           # healthcheck (DB + Redis + storage)
    videos/                 # CRUD de vídeos/áudios + upload + transcrição
      index.get.ts · index.post.ts
      [id]/index.get.ts · [id]/index.delete.ts
      [id]/complete.post.ts · [id]/transcribe.post.ts
  transcription/
    provider.ts             # interface + elevenlabsScribe (scribe_v2)
    srt.ts                  # lê os blocos de legenda devolvidos pela API
    language.ts             # ISO-639-3 -> ISO-639-1
    timestamps.ts           # associação palavra -> segmento
    run.ts                  # runTranscription(): download -> Scribe v2 -> DB
    extract.ts              # runExtraction(): vídeo -> ffmpeg -> áudio -> encadeia run.ts
    ffmpeg.ts               # wrapper do binário (ffmpeg-static) — extractAudio()
    sweep.ts                # recupera processamentos presos por restart
  db/
    schema.ts               # tabelas Drizzle (users, videos, transcripts, jobs, usage...)
    migrations/              # SQL gerado pelo drizzle-kit
    migrate.ts · seed.ts
  utils/
    env.ts                  # validação das variáveis de ambiente (zod)
    drizzle.ts              # conexão Postgres (useDrizzle)
    redis.ts                # conexão Redis (useRedis)
    storage.ts              # cliente S3 + URLs pré-assinadas (useS3, presignPut, downloadToFile...)
    auth.ts                 # getCurrentUser() — stub do usuário de dev até a Fase 2
    password.ts             # hash de senha (scrypt)
  plugins/
    0.env.ts                # valida env no boot
    1.shutdown.ts           # fecha conexões no encerramento
    2.sweep.ts              # roda o sweep de transcrições no boot
docker-compose.yml          # Postgres + Redis + MinIO (dev local)
drizzle.config.ts
public/                     # favicon, robots.txt
```

## Arquitetura planejada (próximas entregas)

Ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/ROADMAP.md`](docs/ROADMAP.md) e o backlog de tarefas em [`docs/BACKLOG.md`](docs/BACKLOG.md).

Resumo:

| Camada        | Tecnologia                                             |
| ------------- | ------------------------------------------------------ |
| Frontend      | Nuxt / Vue (este repo)                                 |
| API           | Nitro (server/) ou serviço dedicado — usuários, upload |
| Storage       | S3-compatível (vídeos + arquivos gerados)              |
| Queue         | Redis / BullMQ                                         |
| Worker        | FFmpeg → Speech-to-Text → processamentos de IA         |
| Banco         | PostgreSQL                                             |

Variáveis de ambiente: ver [`.env.example`](.env.example).
