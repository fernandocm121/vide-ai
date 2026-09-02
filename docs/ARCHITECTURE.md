# Arquitetura — Vide AI

## Visão

```
Vídeo → Extração de áudio (FFmpeg) → Speech-to-Text → Transcrição
      → IA analisa → Resumo / Capítulos / Keywords / Melhores momentos
      → Conteúdo derivado (títulos, descrições, Shorts, legendas)
      → Índice pesquisável (Ask Your Video / Biblioteca)
```

## Componentes

### 1. Frontend (este repositório)

Nuxt 4 + Vue 3. Responsável por:

- Landing / marketing (entregue)
- App autenticado: upload, listagem de vídeos, player sincronizado com a transcrição, busca, geração de conteúdo (próximas entregas)

### 2. API

Camada de usuários, autenticação, uploads (URLs pré-assinadas para o storage) e
orquestração de jobs. Pode começar dentro do `server/` do Nuxt (Nitro) e ser
extraída para um serviço dedicado conforme o volume crescer.

Entidades principais:

- `users`, `subscriptions`
- `videos` (metadados, status de processamento)
- `transcripts` (texto + segmentos com timestamps)
- `chapters`, `highlights`, `derived_content`
- `embeddings` (busca semântica — pgvector)

### 3. Storage

Bucket S3-compatível para os arquivos originais e os artefatos gerados
(SRT, VTT, TXT, cortes). Upload direto do browser via URL pré-assinada.

### 4. Queue

Redis + BullMQ. Uma fila por tipo de job:

- `audio.extract` — FFmpeg
- `transcribe` — Speech-to-Text
- `analyze` — resumo, capítulos, keywords
- `embed` — geração de embeddings
- `generate` — conteúdo derivado sob demanda

### 5. Worker

Processo separado que consome as filas. Precisa de FFmpeg instalado e acesso ao
storage, ao banco e aos provedores de IA.

### 6. Banco

PostgreSQL. Extensão `pgvector` para a busca "Pergunte ao seu vídeo" e para a
busca entre vídeos (Biblioteca inteligente).

## Fluxo de processamento

1. Cliente pede URL pré-assinada → faz upload do vídeo direto no storage.
2. API cria registro `videos` (status `queued`) e enfileira `audio.extract`.
3. Worker extrai o áudio, enfileira `transcribe`.
4. Transcrição salva em `transcripts`; enfileira `analyze` e `embed`.
5. Análise preenche `chapters` / `highlights`; embeddings vão para `pgvector`.
6. Status vira `ready`; frontend recebe via polling ou WebSocket.
7. `generate` roda sob demanda quando o usuário pede um novo ativo.

## Desafios (do documento de visão)

Custos de processamento · filas · armazenamento · escalabilidade · qualidade da IA.
Dificuldade estimada: MVP 5–6/10, produto escalável 7–8/10.
