# Fase 4 — Worker dedicado (BullMQ + VPS) para extração/transcrição

> Sucessor da Fase 3B "Opção A" (extração de áudio inline no Nitro,
> `server/transcription/extract.ts` + `ffmpeg.ts`). Opção A resolve o MVP e
> funciona bem local/VPS; esta issue implementa o caminho de produção —
> escalável, resiliente a restart, e que não depende dos limites de uma
> função serverless.

## Contexto — por que isso existe

Hoje (`server/transcription/run.ts`, `extract.ts`) o processamento roda
**inline no mesmo processo do Nitro**, disparado em background sem `await`
a partir de `POST /api/videos/:id/transcribe`. Isso tem 6 limitações
conhecidas, verificadas na implementação da Opção A:

1. **Sem garantia de execução em serverless.** O endpoint responde `202` e
   dispara `runExtraction()`/`runTranscription()` sem aguardar. Em
   plataformas serverless (Vercel, que é o deploy atual do projeto — ver
   `docs/DEPLOY.md`) não há garantia de que o processo continue vivo depois
   da resposta HTTP ser enviada. Funciona hoje porque o dev/VPS roda um
   processo Node de vida longa; **não está validado que funcione na Vercel**.
2. **Limite de tempo de função.** Extração de vídeo com ffmpeg é
   CPU-pesada; um vídeo de alguns minutos pode facilmente estourar o timeout
   de uma function serverless (10–60s no plano free/hobby da Vercel, até
   900s no plano Pro com Fluid Compute).
3. **Disco temporário limitado.** `runExtraction` baixa o vídeo para
   `os.tmpdir()`. Em serverless esse diretório (`/tmp`) costuma ter uma cota
   pequena (≈512 MB–2 GB) — não comporta o limite de upload atual de vídeo
   (`MAX_VIDEO_UPLOAD_BYTES`, hoje 2 GB).
4. **Sem retry real.** Falhou, falhou — o usuário precisa clicar em "Tentar
   de novo" manualmente. Não há backoff, não há limite de tentativas
   automático (o `jobs.maxAttempts` existe na tabela mas nada o usa hoje).
5. **Sem controle de concorrência.** Se 10 usuários sobem vídeo ao mesmo
   tempo, 10 processos `ffmpeg` competem pela CPU do mesmo servidor da API —
   sem fila, sem limite configurável.
6. **Recuperação de restart é um curativo.** `server/transcription/sweep.ts`
   roda uma vez no boot e marca como `failed` qualquer coisa presa há mais de
   15 min — não retenta, só desiste. Um restart no meio de uma transcrição
   sempre perde o trabalho.

O `docs/ARCHITECTURE.md` já previa isso desde o início (seção "Queue" e
"Worker"): Redis + BullMQ, uma fila por tipo de job (`audio.extract`,
`transcribe`, `analyze`, `embed`, `generate`), processadas por um worker
separado, hospedado numa VPS (não serverless) porque precisa de FFmpeg e CPU
dedicada. Esta issue é essa peça.

## Objetivo

Mover o processamento (extração de áudio + transcrição, e no futuro
`analyze`/`embed`/`generate`) de "chamada de função em background dentro da
API" para "job numa fila real, consumido por um worker dedicado", sem trocar
a lógica de negócio já validada em `extract.ts`/`run.ts`/`provider.ts` — só
o mecanismo de execução ao redor dela.

## Escopo

**Dentro:**
- Processo `worker` separado (mesmo repo), consumindo filas BullMQ.
- Filas `audio-extract` e `transcribe` (as que já existem hoje).
- Retry com backoff exponencial + limite de tentativas.
- Recuperação automática de job travado por restart do worker (nativo do
  BullMQ — substitui `sweep.ts`).
- Concorrência configurável por fila (CPU para extração, rate limit da
  OpenAI para transcrição).
- Painel de monitoramento (Bull Board) em dev/staging.
- Deploy do worker numa VPS com FFmpeg instalado, com Redis "de verdade"
  (não serverless-only) acessível a partir dela.
- Migração do endpoint `POST /api/videos/:id/transcribe` para enfileirar em
  vez de chamar as funções diretamente.

**Fora (deixar para depois):**
- Filas `analyze`/`embed`/`generate` (Fases 6/7 — só deixar a estrutura
  pronta para adicionar sem reescrever o worker).
- Múltiplas réplicas do worker / autoscaling.
- SSE para status em tempo real no lugar do polling (é citado no
  `docs/BACKLOG.md` da Fase 4 mas pode virar uma issue própria depois desta —
  não é pré-requisito para o worker funcionar).

## Arquitetura proposta

```
┌─────────────┐    enqueue     ┌───────────┐   BRPOPLPUSH   ┌──────────────┐
│  Nitro (API)│ ─────────────► │   Redis   │ ◄───────────── │    Worker    │
│  Vercel     │                │  (BullMQ) │                │  VPS/Fly.io  │
└─────────────┘                └───────────┘                └──────┬───────┘
                                                                     │
                                              ┌──────────────────────┼───────┐
                                              │ FFmpeg (audio-extract)│       │
                                              │ OpenAI Whisper (transcribe)   │
                                              └───────────────────────────────┘
                                       lê/escreve vídeo+áudio via S3/R2,
                                       lê/escreve status via Postgres
                                       (mesmas credenciais que a API)
```

- **Fila por tipo de job**, como já documentado em `docs/ARCHITECTURE.md`:
  `audio-extract` e `transcribe` agora; `analyze`/`embed`/`generate` quando
  as Fases 6/7 chegarem.
- A tabela `jobs` (`server/db/schema.ts`) continua sendo a fonte de verdade
  auditável (status, tentativas, erro, resultado). O BullMQ é só a camada de
  agendamento/execução por cima — **não duplicar estado**: o `jobId` do
  BullMQ pode ser o mesmo UUID da linha em `jobs` (idempotência).
- Encadeamento `audio-extract → transcribe`: o processor de extração, ao
  terminar com sucesso, enfileira o job de transcrição (igual ao que
  `runExtraction()` já faz hoje chamando `runTranscription()` diretamente —
  só troca a chamada direta por `transcribeQueue.add(...)`). BullMQ tem
  `FlowProducer` (open-source, sem custo) para dependências pai/filho, mas
  não é necessário — encadear manualmente no `worker.on('completed')` do
  processor de extração é mais simples e já é o padrão do código atual.

## Plano técnico detalhado

### 1. Dependências novas
```bash
npm install bullmq @bull-board/api @bull-board/express
```
`ioredis` já é dependência do projeto (usado por `server/utils/redis.ts`) —
BullMQ usa `ioredis` por baixo, reaproveitar a mesma configuração de conexão
(`REDIS_URL`).

### 2. Provedor de Redis — atenção especial

BullMQ precisa de comandos bloqueantes (`BRPOPLPUSH`/`BLMPOP` etc.) e de uma
conexão persistente — **não funciona** com Redis "REST-only" (ex.: Upstash
no modo REST API/edge, que é serverless-friendly mas não fala o protocolo
Redis nativo completo para blocking commands).
- Upstash: usar o plano com **TCP/Redis nativo** (não o REST endpoint), ou
- Redis Cloud, ou
- Redis rodando na própria VPS do worker (mais simples de operar, um serviço
  a menos para pagar, mas acopla a disponibilidade do Redis à da VPS).

Decidir isso **antes** de começar a implementação — é a escolha que mais
afeta o resto do deploy.

### 3. Filas e conexão (`worker/queues.ts` — novo)
```ts
import { Queue } from 'bullmq'
import { useEnv } from '../server/utils/env'

const connection = { url: useEnv().REDIS_URL } // ou parse manual host/port/tls

export const audioExtractQueue = new Queue('audio-extract', { connection })
export const transcribeQueue = new Queue('transcribe', { connection })
```

### 4. Processors (`worker/processors/extract.ts`, `worker/processors/transcribe.ts` — novos)

Adaptar `server/transcription/extract.ts` e `run.ts`: a lógica de negócio
(download → ffmpeg → upload → atualizar `videos`/`jobs`) é a mesma; muda só
quem chama e como o erro é sinalizado (lançar o erro para o BullMQ tratar
retry, em vez do try/catch que hoje marca `failed` direto na primeira
falha):

```ts
import { Worker } from 'bullmq'
import { runExtractionCore } from '../../server/transcription/extract' // refatorado para lançar em vez de engolir o erro
import { transcribeQueue } from '../queues'

export const extractWorker = new Worker(
  'audio-extract',
  async (job) => {
    const { videoId, jobId } = job.data
    const { audioKey } = await runExtractionCore(videoId, jobId) // lança em caso de erro -> BullMQ decide retry
    await transcribeQueue.add('transcribe', { videoId, sourceKey: audioKey })
  },
  {
    connection,
    concurrency: 2, // ffmpeg é CPU-bound — calibrar pelos cores da VPS
  },
)

extractWorker.on('failed', async (job, err) => {
  // depois de esgotar as tentativas: marcar `videos`/`jobs` como failed
  // (mesma lógica que hoje está no catch de runExtraction)
})
```

**Importante:** isso implica refatorar `runExtraction`/`runTranscription`
para **separar** "a lógica de negócio" (baixar, processar, subir, retornar
resultado ou lançar erro) de "o que fazer quando falha definitivamente"
(hoje as duas coisas estão juntas no mesmo try/catch). O jeito mais simples:
extrair o corpo do `try` para uma função `xCore()` que só lança, e mover o
`catch` que atualiza status para `failed` para o listener `worker.on('failed')`
— que só dispara depois que o BullMQ já esgotou as tentativas configuradas.

### 5. Retry e backoff
```ts
await audioExtractQueue.add(
  'extract',
  { videoId, jobId },
  {
    jobId, // usa o UUID da linha em `jobs` — idempotência, evita duplicar
    attempts: 3,
    backoff: { type: 'exponential', delay: 10_000 }, // 10s, 20s, 40s
  },
)
```
Atualizar `jobs.attempts` a cada tentativa (BullMQ expõe `job.attemptsMade`
no processor).

### 6. Concorrência / rate limit
- `audio-extract`: `concurrency` baseado em núcleos de CPU da VPS (ex.: 2 em
  uma VPS de 2 vCPU) — ffmpeg satura CPU rápido.
- `transcribe`: `concurrency` mais alto (é I/O-bound, espera a API da
  OpenAI), mas com `limiter: { max: N, duration: 60_000 }` para respeitar o
  rate limit da conta OpenAI (ver limites do plano em platform.openai.com).

### 7. Recuperação de stalled jobs
Nativo do BullMQ (`stalledInterval`, `maxStalledCount` no `Worker`) — um job
cujo worker morreu no meio volta pra fila automaticamente. **Isso substitui
`server/transcription/sweep.ts` e o plugin `server/plugins/2.sweep.ts`** —
remover os dois quando o worker estiver validado em produção.

### 8. Monitoramento (Bull Board)
Montar `@bull-board/express` numa rota interna (ex.: `/internal/queues`,
protegida por auth básica ou IP allowlist — **não expor publicamente**) para
ver jobs em andamento, falhos, retentar/remover manualmente. Útil em
dev desde já.

### 9. Endpoint da API muda de "executar" para "enfileirar"

`server/api/videos/[id]/transcribe.post.ts` para de chamar
`runExtraction`/`runTranscription` diretamente e passa a fazer:
```ts
if (video.mediaKind === 'video') {
  await audioExtractQueue.add('extract', { videoId: id, jobId: job.id }, { jobId: job.id, attempts: 3, backoff: {...} })
} else {
  await transcribeQueue.add('transcribe', { videoId: id, jobId: job.id }, { jobId: job.id, attempts: 3, backoff: {...} })
}
```
Nenhuma mudança de contrato com o frontend — a resposta continua `202
{ status: 'queued' }`.

### 10. Deploy do worker

- **Onde:** VPS (Hetzner CX22 ou similar, ~€4–5/mês — sugestão que já estava
  em `docs/BACKLOG.md`) ou Fly.io (um app separado do da web, mais fácil de
  automatizar via `flyctl`, mas verificar se o plano cobre CPU suficiente
  para ffmpeg sem throttling agressivo).
- **Como:** Dockerfile dedicado (`Dockerfile.worker` ou um stage separado
  num Dockerfile multi-stage):
  ```dockerfile
  FROM node:24-slim
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --omit=dev
  COPY . .
  CMD ["node", "--import", "tsx", "worker/index.ts"]
  ```
  (usar `ffmpeg-static` como já está — não precisa `apt-get install ffmpeg`
  na imagem, o binário estático já resolve; só confirmar que a imagem base
  tem as libs de sistema que o binário estático do FFmpeg exige — `slim`
  costuma bastar, testar).
- **Variáveis de ambiente do worker** — as mesmas que a API já usa,
  reaproveitando `server/utils/env.ts`: `DATABASE_URL`, `REDIS_URL`,
  `S3_ENDPOINT`/`S3_REGION`/`S3_BUCKET`/`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`,
  `OPENAI_API_KEY`, `MAX_UPLOAD_BYTES`, `MAX_VIDEO_UPLOAD_BYTES`.
- **CI/CD:** novo workflow (`.github/workflows/deploy-worker.yml`) que builda
  a imagem e publica (`flyctl deploy` ou SSH + `docker compose pull && up -d`
  na VPS) em push para `main` — separado do deploy da Vercel (que continua
  cuidando só da API/frontend).

### 11. Plano de migração (sem downtime, sem big-bang)

1. Subir o worker em paralelo, apontando para o **mesmo Redis/Postgres** de
   produção, mas ainda sem tráfego (filas vazias).
2. Trocar o endpoint `/transcribe` para enfileirar em vez de chamar direto —
   deploy da API.
3. Validar em produção com vídeos reais: acompanhar pelo Bull Board, conferir
   que `videos`/`jobs` chegam em `ready`/`failed` como antes.
4. Matar o worker de propósito no meio de um job (teste de caos manual) e
   confirmar que o BullMQ reenfileira sozinho.
5. Remover `server/transcription/sweep.ts` + `server/plugins/2.sweep.ts`.
6. Atualizar `docs/ARCHITECTURE.md` (já bate, é só marcar como implementado),
   `docs/DEPLOY.md` (adicionar seção do worker) e `docs/BACKLOG.md`.

## Arquivos afetados (mapa para quem for implementar)

| Arquivo | Mudança |
| --- | --- |
| `package.json` | + `bullmq`, `@bull-board/api`, `@bull-board/express`; script `worker` |
| `worker/index.ts` | **novo** — entrypoint, registra os `Worker`s e o Bull Board |
| `worker/queues.ts` | **novo** — instâncias `Queue` compartilhadas (API e worker importam daqui) |
| `worker/processors/extract.ts` | **novo** — `Worker('audio-extract', ...)`, chama a lógica refatorada de `extract.ts` |
| `worker/processors/transcribe.ts` | **novo** — `Worker('transcribe', ...)`, chama a lógica refatorada de `run.ts` |
| `server/transcription/extract.ts` | refatorar: separar lógica (`runExtractionCore`, lança erro) do tratamento de falha final |
| `server/transcription/run.ts` | mesma refatoração |
| `server/api/videos/[id]/transcribe.post.ts` | trocar chamada direta por `queue.add(...)` |
| `server/transcription/sweep.ts` + `server/plugins/2.sweep.ts` | **remover** após validar o worker em produção |
| `Dockerfile.worker` | **novo** |
| `.github/workflows/deploy-worker.yml` | **novo** |
| `docs/DEPLOY.md` | + seção "Deploy do worker" |
| `docs/ARCHITECTURE.md` | marcar a seção Queue/Worker como implementada |

## Decisões a tomar antes de começar

| Decisão | Opções | Observação |
| --- | --- | --- |
| Provedor de Redis | Upstash (plano TCP) · Redis Cloud · self-host na VPS | precisa suportar blocking commands — REST-only não serve |
| Onde roda o worker | Hetzner VPS · Fly.io | Hetzner é mais barato e já era a sugestão do backlog original; Fly.io é mais rápido de automatizar |
| Bull Board fica exposto onde | rota interna autenticada · só acessível via túnel/VPN | não expor sem auth — dá para ver/apagar jobs de outros usuários |

## Critérios de aceite

- [ ] `npm run worker` sobe um processo separado que conecta no Redis e
      registra os workers de `audio-extract` e `transcribe`
- [ ] Upload de vídeo → job aparece no Bull Board → é consumido pelo worker
      → status evolui `queued` → `extracting` → `transcribing` → `ready`,
      idêntico ao resultado da Opção A hoje
- [ ] Matar o processo do worker no meio de uma extração e reiniciá-lo:
      o job é retomado/reenfileirado automaticamente, sem intervenção manual
      e sem precisar do sweep de boot
- [ ] Um vídeo corrompido/sem áudio falha definitivamente após as tentativas
      configuradas (não fica retentando pra sempre) e o usuário vê o erro
      na página do vídeo, igual hoje
- [ ] Duas extrações simultâneas respeitam o `concurrency` configurado (não
      disparam mais processos `ffmpeg` do que o configurado)
- [ ] `server/transcription/sweep.ts` removido, sem regressão
- [ ] Worker deployado numa VPS separada da Vercel, com FFmpeg funcionando,
      consumindo o mesmo Redis/Postgres/S3 de produção
