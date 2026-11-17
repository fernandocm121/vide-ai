# Quality gate de segurança

Toda PR para `main` passa por checks de segurança que aprovam ou reprovam a
mudança. Os checks marcados como obrigatórios no ruleset da `main` impedem o
merge enquanto não passarem.

## Os checks

| Check | Workflow | O que reprova | Determinístico? |
| --- | --- | --- | --- |
| `secrets · gitleaks` | `security.yml` | Segredo (chave, token, senha) em algum commit da PR | Sim |
| `sast · semgrep` | `security.yml` | Padrão inseguro **novo** em relação à base da PR (injeção, XSS, workflow injetável…) | Sim |
| `deps · dependency review` | `security.yml` | Dependência **nova** com vulnerabilidade conhecida alta ou crítica | Sim |
| `ai · security review` | `security-ai-review.yml` | Achado de severidade HIGH na revisão do Claude (só no modo `enforce`) | Não |
| CodeQL (code scanning) | configuração padrão do GitHub | Alerta novo de severidade alta ou maior | Sim |
| `lint · typecheck · build` | `ci.yml` | Lint, tipos, testes ou build quebrados | Sim |

Além dos pacotes públicos, o Semgrep usa as regras do projeto em
`.semgrep/vide-ai.yml`. Elas tratam `getQuery`, `readBody`, `getRouterParam` e
as demais funções de entrada do h3 como dado do usuário, e reprovam quando esse
dado chega a um comando de shell, a `sql.raw()` ou a um caminho de arquivo.
As regras públicas não reconhecem essas funções do Nitro.

Os checks determinísticos olham só o que a PR introduz. A dívida que já existe
(por exemplo, as vulnerabilidades atuais do `npm audit`) não reprova PRs: ela
aparece em **Security → Dependabot** e deve ser tratada à parte.

## Revisão por IA

O workflow `security-ai-review.yml` roda a Action
[`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action)
autenticada com a **assinatura do Claude** (não usa chave de API). O Claude lê
o diff da PR, comenta nas linhas e devolve os achados como JSON validado por
schema (`--json-schema`). Quem decide aprovar ou reprovar é o script
`.github/scripts/security-gate.mjs`, que é determinístico e tem testes
(`security-gate.test.mjs`).

As instruções específicas do projeto ficam em `.github/security/`:

- `ai-review-instructions.md`: fronteiras de confiança do vide-ai (dono do
  vídeo, sessão, storage, ffmpeg, exportação) e o critério de achado, adaptado da
  metodologia [security-audit da Cloudflare](https://github.com/cloudflare/security-audit-skill).
- `ai-review-false-positives.md`: o que descartar e o que nunca descartar.

Ajuste esses arquivos quando a revisão gerar ruído ou deixar passar algo.

### Modos

Definidos pela variável de repositório `AI_SECURITY_GATE_MODE`
(Settings → Secrets and variables → Actions → Variables):

| Modo | Achado HIGH | Revisão não rodou ou deu erro |
| --- | --- | --- |
| `advisory` (padrão) | aviso, não reprova | aviso, não reprova |
| `enforce` | **reprova** | **reprova** (fail-closed) |

Comece em `advisory` e acompanhe os comentários por algumas PRs. Quando os
falsos positivos estiverem sob controle, troque para enforce:

```sh
gh variable set AI_SECURITY_GATE_MODE --body enforce
```

### Requisitos e limites

- **Token da assinatura:** secret `CLAUDE_CODE_OAUTH_TOKEN`. Para criar, rode
  `claude setup-token` (abre o navegador para login; planos Pro e Max) e
  depois `gh secret set CLAUDE_CODE_OAUTH_TOKEN`, colando o token quando o
  comando pedir. Sem esse secret a revisão não roda. O token expira: quando
  isso acontecer, o check passa a avisar que a revisão não rodou; gere outro e
  repita o `gh secret set`.
- **Uso da assinatura:** a revisão roda a cada push na PR e consome o mesmo
  limite de uso que o seu Claude Code. Para gastar menos, troque o modelo com
  `gh variable set AI_SECURITY_REVIEW_MODEL --body claude-sonnet-5-5`
  (o padrão é `claude-opus-5-5`). Cada revisão tem no máximo 40 turnos.
- **PRs de fork:** o GitHub não entrega secrets a forks, então a revisão por IA
  não roda nessas PRs. No modo `enforce`, o check reprova e um mantenedor
  revisa manualmente.
- **Injeção de prompt:** texto malicioso na PR pode tentar manipular a revisão.
  Por isso ela nunca é a única barreira (os checks determinísticos não dependem
  de IA). O prompt não inclui título nem descrição da PR, o Claude só pode ler
  arquivos, ver o diff e comentar em linha, e mudanças em `.github/` exigem
  aprovação do code owner.
- **Resultado não determinístico:** a mesma PR pode gerar achados diferentes
  em execuções diferentes.

## Quando o gate reprova

1. Leia o resumo do job (aba **Checks** da PR) e os comentários nas linhas.
2. Se o achado for real, corrija e faça push. O gate roda de novo.
3. Se for falso positivo:
   - Semgrep: adicione `// nosemgrep: <rule-id>` na linha, com um comentário
     explicando por quê;
   - gitleaks: adicione o fingerprint ao `.gitleaksignore`;
   - IA: ajuste `.github/security/ai-review-false-positives.md`.
4. Em emergência, o administrador do repositório pode fazer merge ignorando os
   checks (bypass do ruleset). O GitHub registra o bypass.

## Rodando localmente

```sh
gitleaks git . --redact                                  # segredos no histórico
docker run --rm -v "$PWD:/src" -w /src semgrep/semgrep \
  semgrep scan --config p/javascript --config p/typescript \
  --config p/nodejs --config p/owasp-top-ten \
  --config .semgrep/ --metrics=off                          # SAST
npm audit --audit-level=high                              # dependências
```

No Claude Code, `/security-review` faz uma revisão por IA equivalente nas
mudanças da branch atual.

## Configuração do repositório

Já ativada; registrada aqui para o caso de precisar refazer:

- Ruleset `main` com os checks obrigatórios acima, regra de code scanning
  (CodeQL, alta ou maior), PR obrigatória, revisão de code owner, bloqueio de
  force-push e de exclusão da branch, e bypass só para o admin.
- Secret scanning com push protection, alertas do Dependabot, CodeQL na
  configuração padrão e reporte privado de vulnerabilidades.
- Token padrão do Actions somente leitura; workflows de colaboradores externos
  exigem aprovação.
