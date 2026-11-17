## Contexto do projeto (vide-ai)

App Nuxt 4 (Vue no cliente, Nitro/h3 no servidor) que transcreve vídeos e áudios.
Postgres via Drizzle, fila BullMQ no Redis, arquivos em storage S3-compatível
(MinIO local, R2/S3 em produção), ffmpeg para extrair áudio e e-mails via
nodemailer. Os usuários enviam arquivos próprios e só podem ver os próprios dados.

### Fronteiras de confiança que esta revisão deve verificar

1. **Dono do recurso (IDOR / acesso entre usuários).** Toda rota em
   `server/api/videos/**` recebe um `id` vindo do cliente. O padrão correto é
   `getCurrentUser(event)` seguido de uma consulta filtrada por
   `and(eq(videos.id, id), eq(videos.userId, user.id))`. Uma rota nova ou
   alterada que lê, altera, exporta, transcreve ou apaga um vídeo, uma
   transcrição, um segmento ou uma palavra sem esse filtro por `userId` é um
   achado HIGH.
2. **Autenticação e sessão.** Sessões ficam em `server/utils/session.ts` e
   `server/utils/auth.ts` (cookie → linha em `sessions` com `expiresAt`). Revise
   mudanças em login, cadastro, OAuth do Google (`state`/redirect), verificação
   de e-mail, troca e reset de senha: tokens previsíveis, tokens reutilizáveis,
   ausência de expiração, comparação que vaza tempo, enumeração de contas e
   redirecionamento após o login controlado pelo usuário.
3. **Rotas públicas.** `server/api/leads.post.ts`, `server/api/health.get.ts` e as
   rotas de auth antes do login aceitam entrada anônima. Valide entrada,
   injeção em e-mail/cabeçalhos e vazamento de dados internos.
4. **Storage.** As chaves de objeto e as URLs pré-assinadas
   (`server/utils/storage.ts`) precisam ser derivadas do servidor e ter escopo
   no dono. Uma chave montada com entrada do cliente (path traversal, objeto de
   outro usuário) ou uma URL pré-assinada emitida sem checar o dono é achado.
5. **Processos e arquivos.** `server/transcription/ffmpeg.ts` usa `execFile`.
   Qualquer mudança para `exec`/shell, argumentos vindos do usuário que possam
   virar flags (por exemplo nomes começando com `-`), ou caminhos temporários
   previsíveis/compartilhados deve ser revisada.
6. **Exportação e renderização.** `server/api/videos/[id]/export/[format].get.ts`
   e `server/utils/transcript-export.ts` geram arquivos a partir do texto
   transcrito (dado do usuário). Verifique `Content-Disposition`/`Content-Type`
   e injeção no formato exportado. No cliente, `v-html` ou `innerHTML` com texto
   de transcrição, nome de arquivo ou mensagem traduzida é XSS armazenado.
7. **Segredos e configuração.** Valores de `runtimeConfig` que não são
   `public` nunca devem chegar ao cliente. Credenciais não podem ser commitadas
   nem registradas em log.
8. **Workflows do GitHub (`.github/workflows/**`).** Interpolação de
   `${{ github.event.* }}` controlado pelo usuário dentro de `run:`,
   `pull_request_target` com checkout do código da PR e permissões de
   `GITHUB_TOKEN` maiores que o necessário.

### Critério de achado (adaptado da metodologia security-audit da Cloudflare)

- Só reporte um achado quando conseguir nomear: o ator de menor confiança, a
  entrada que ele controla, o controle que deveria impedir, a fronteira
  atravessada e o efeito concreto (quem é afetado e o quê).
- Recomendação de boa prática sem uma violação alcançável **não** é achado.
- Comportamento do mesmo usuário sobre os próprios dados **não** é achado.
- Não presuma o comportamento de proxy, CDN ou provedor de nuvem que não esteja
  no código. Se a conclusão depende disso, rebaixe para LOW e diga qual fato
  precisa ser verificado.

### Calibragem de severidade

- **HIGH:** anula por completo um controle explícito com consequência real,
  como bypass de autenticação, leitura ou escrita em dados de outro usuário
  (IDOR), XSS armazenado que afeta outros usuários, execução de código ou de
  comando, ou vazamento de segredo de servidor.
- **MEDIUM:** violação real de fronteira com alcance limitado ou pré-condições
  incomuns.
- **LOW:** vazamento de detalhes internos não secretos ou impacto mínimo.

Se não conseguir descrever o dano concreto, a severidade é menor do que parece.

### Idioma

Escreva `description`, `exploit_scenario` e `recommendation` em português.
