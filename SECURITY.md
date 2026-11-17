# Política de segurança

## Como reportar uma vulnerabilidade

Não abra issue pública para falhas de segurança. Use o reporte privado do
GitHub: aba **Security** → **Report a vulnerability** neste repositório.

Inclua o que for possível: rota ou arquivo afetado, passos para reproduzir
(com contas de teste, nunca dados de terceiros) e o impacto esperado.

## Escopo

Código deste repositório (app Nuxt, API em `server/`, workflows em
`.github/`). Testes contra o ambiente de produção, ataques de negação de
serviço e engenharia social estão fora do escopo.

## Como o projeto se protege

Toda PR para `main` passa pelo quality gate de segurança descrito em
[docs/SECURITY-GATE.md](docs/SECURITY-GATE.md).
