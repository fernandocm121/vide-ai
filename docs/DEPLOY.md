# Deploy — Vide AI

A aplicação é um Nuxt 4 (Nitro) único: serve a **landing** (`/`, `/signup`) e o
**app** (`/app/**` + `/api/**`). O deploy recomendado é **Vercel** — o Nitro
detecta o ambiente e usa o preset `vercel` sem configuração extra.

> Cloudflare Pages também funciona (preset `cloudflare_pages`), mas exige um
> Postgres/Redis/S3 acessíveis do edge. Vercel (Node runtime) é o caminho curto.

---

## 1. Criar o projeto na Vercel

1. **New Project** → importe o repositório do GitHub.
2. Framework: **Nuxt** (detectado). Build command, output e install ficam no
   automático (`npm run build`, `.output`, `npm ci`).
3. Não faça o primeiro deploy ainda — configure as variáveis abaixo.

## 2. Variáveis de ambiente (Production + Preview)

| Variável | Obrigatória | Observação |
| --- | --- | --- |
| `NUXT_PUBLIC_SITE_URL` | **sim** | URL canônica: `https://SEU-DOMINIO`. Alimenta `sitemap.xml`, `robots.txt`, tags canônicas e a imagem OG. |
| `NUXT_PUBLIC_POSTHOG_KEY` | recomendada | Project API Key do PostHog. Sem ela o analytics vira no-op. |
| `NUXT_PUBLIC_POSTHOG_HOST` | não | Default `https://us.i.posthog.com`. Use `https://eu.i.posthog.com` se o projeto for na UE. |
| `DATABASE_URL` | para o `/app` | Postgres gerenciado (Neon, Supabase, RDS…). A landing sobe sem ela; rotas de `/app` retornam 500 até existir. |
| `REDIS_URL` | para o pipeline | Redis gerenciado (Upstash, Redis Cloud). |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | para upload | Cloudflare R2 ou AWS S3. Em R2, `S3_FORCE_PATH_STYLE=false`. |
| `MAX_UPLOAD_BYTES` | não | Default 25 MB. |
| `OPENAI_API_KEY` | para transcrição | Chave da OpenAI (Whisper). |

> Só a landing? Basta `NUXT_PUBLIC_SITE_URL` (+ PostHog). O boot do servidor
> tolera a infra ausente em produção — ver `server/plugins/0.env.ts`.

## 3. Domínio próprio

1. Vercel → Project → **Settings → Domains** → adicione `seu-dominio.com` e
   `www.seu-dominio.com`.
2. No registrador do domínio, aponte os registros que a Vercel mostrar
   (normalmente `A 76.76.21.21` para o apex e `CNAME cname.vercel-dns.com`
   para o `www`), ou troque os nameservers para os da Vercel.
3. Assim que o DNS propagar, atualize `NUXT_PUBLIC_SITE_URL` para o domínio
   final e faça **Redeploy** (o valor é lido no build).

## 4. Analytics (PostHog)

1. Crie um projeto em [posthog.com](https://posthog.com) (cloud US ou EU).
2. Copie a **Project API Key** → `NUXT_PUBLIC_POSTHOG_KEY` na Vercel.
3. Eventos já instrumentados: `$pageview`, `cta_click` (com `location`/`plan`),
   `signup_view`, `signup_requested`. O `identify` usa o e-mail no submit de
   `/signup`.

## 5. Pós-deploy — checklist

- [ ] `https://SEU-DOMINIO/` carrega e responde 200
- [ ] `https://SEU-DOMINIO/sitemap.xml` lista `/` e `/signup`
- [ ] `https://SEU-DOMINIO/robots.txt` aponta para o sitemap
- [ ] Os CTAs da Home levam a `/signup` (não são mais âncoras)
- [ ] `/signup` registra o lead (log da função) e dispara `signup_requested`
- [ ] [OpenGraph.xyz](https://www.opengraph.xyz/) mostra a imagem OG e o título
- [ ] Rich Results Test valida o JSON-LD (`Organization`, `WebSite`, `SoftwareApplication`)
- [ ] PostHog recebe `$pageview`

## CI

`.github/workflows/ci.yml` roda em todo push/PR para `main`: `lint` →
`typecheck` → `build`. O deploy da Vercel é acionado pelo push (integração
GitHub ↔ Vercel), independente do CI.
