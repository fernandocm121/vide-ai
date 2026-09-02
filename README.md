# Vide AI

**Video Intelligence** — transforme qualquer vídeo em texto, conhecimento e conteúdo pronto para publicar.

> Posicionamento: não é um "Read AI brasileiro". É uma plataforma de inteligência para vídeos, focada em criadores — YouTubers, podcasters, professores e jornalistas.
> Vídeo → Conhecimento → Conteúdo.

---

## Estado atual

- ✅ **Home (landing page)** + estrutura do frontend
- ✅ **Infra local + camada de dados** (Fase 1): Postgres + Redis + MinIO via Docker, Drizzle ORM, healthcheck

Stack: **Nuxt 4 + Vue 3 + Tailwind CSS v4**, **Drizzle ORM + PostgreSQL**, **Redis** (fila, Fase 4), **S3/MinIO** (storage).

## Rodando o projeto

Pré-requisitos: **Node 20.12+** (ver `.nvmrc`) e **Docker**.

```bash
npm install
cp .env.example .env        # valores padrão já batem com o docker-compose

npm run services:up         # sobe Postgres + Redis + MinIO
npm run db:setup            # aplica migrations + popula dados de dev
npm run dev                 # http://localhost:3000
```

Verifique a saúde da infra: `curl http://localhost:3000/api/health` → deve retornar
`status: "ok"` com `database`, `redis` e `storage` todos `up`.

Login de desenvolvimento (após o seed): `dev@videai.local` / `password`.

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
  data/home.ts              # conteúdo das seções (passos, públicos, planos)
  layouts/default.vue
  pages/index.vue           # monta as seções da Home
server/
  api/health.get.ts         # healthcheck (DB + Redis + storage)
  db/
    schema.ts               # tabelas Drizzle (users, videos, transcripts, jobs, usage...)
    migrations/              # SQL gerado pelo drizzle-kit
    migrate.ts               # runner de migrations
    seed.ts                  # dados de desenvolvimento
  utils/
    env.ts                  # validação das variáveis de ambiente (zod)
    drizzle.ts              # conexão Postgres (useDrizzle)
    redis.ts                # conexão Redis (useRedis)
    storage.ts              # cliente S3 (useS3)
    password.ts             # hash de senha (scrypt)
  plugins/
    0.env.ts                # valida env no boot
    1.shutdown.ts           # fecha conexões no encerramento
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
