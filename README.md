# Vide AI

**Video Intelligence** — transforme qualquer vídeo em texto, conhecimento e conteúdo pronto para publicar.

> Posicionamento: não é um "Read AI brasileiro". É uma plataforma de inteligência para vídeos, focada em criadores — YouTubers, podcasters, professores e jornalistas.
> Vídeo → Conhecimento → Conteúdo.

---

## Estado atual

Este repositório contém a **primeira entrega: a Home (landing page)** e a estrutura base do frontend.

- Stack: **Nuxt 4 + Vue 3 + Tailwind CSS v4**
- Fontes self-hosted via `@nuxt/fonts` (Inter)
- Ícones SVG inline (`app/components/AppIcon.vue`) — sem dependências externas

## Rodando o projeto

```bash
npm install
npm run dev      # http://localhost:3000
```

Outros scripts:

```bash
npm run build      # build de produção (Nitro)
npm run preview    # sobe o build localmente
npm run generate   # versão estática da landing
npm run typecheck  # checagem de tipos
```

Node 20.11+ (recomendado: 24 — ver `.nvmrc`).

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
  api/health.get.ts         # healthcheck
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
