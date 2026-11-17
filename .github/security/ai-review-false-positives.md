Descarte (não reporte) achados destes tipos neste repositório:

- Arquivos de teste (`*.test.ts`, `*.test.mjs`), seeds (`server/db/seed.ts`) e
  migrações geradas (`server/db/migrations/**`), exceto se o arquivo for
  carregado em produção.
- Valores de exemplo em `.env.example` e `docker-compose.yml`: são credenciais
  de desenvolvimento local, documentadas como tal.
- Ausência de rate limiting, de cabeçalhos de segurança (CSP, HSTS) ou de
  limites de tamanho, quando a mudança da PR não altera esse comportamento.
- Uso de `getRouterParam(event, 'id')!` quando a consulta seguinte já filtra
  por `id` **e** `userId`: o `!` não é uma falha de segurança.
- Strings de i18n (`i18n/**`) usadas apenas como texto interpolado pelo
  vue-i18n, sem `v-html`.
- Achados que exigem que o próprio usuário ataque a própria conta ou os
  próprios arquivos (self-XSS, apagar o próprio vídeo).
- Recomendações genéricas de hardening sem um caminho de exploração concreto
  a partir de um ator de menor confiança.

Mantenha (não descarte) mesmo se parecerem de baixa confiança:

- Qualquer consulta a `videos`, `transcripts`, `transcriptSegments` ou
  `transcriptWords` acessível por rota HTTP sem filtro pelo usuário da sessão.
- Qualquer interpolação de dado do usuário em comando de shell, SQL bruto
  (`sql\`...\`` com `sql.raw`) ou `v-html`.
