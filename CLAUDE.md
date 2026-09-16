# CLAUDE.md

Instruções de projeto para o Claude Code neste repositório (`vide-ai`).

## Commits

Seguir [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>[escopo opcional]: <descrição curta>

<corpo — o quê e por quê, em português, como já era feito>
```

- **Tipos**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
  `build`, `ci`, `chore`, `revert`.
- **Tipo e escopo em inglês** (compatibilidade com ferramentas/changelog
  automático); **descrição e corpo em português**, no mesmo tom direto já
  usado no projeto.
- Escopo é opcional, mas ajuda quando a mudança é claramente de uma área
  (`feat(upload): ...`, `fix(transcricao): ...`).
- Commit sem corpo é aceitável para mudanças pequenas e autoexplicativas;
  mudanças maiores devem detalhar o que foi feito, como os commits
  anteriores a esta convenção já faziam.

Exemplo:
```
feat(transcricao): edição de transcrição por segmento

- PATCH /api/videos/:id/segments/:segmentId atualiza o segmento e
  resincroniza transcripts.text (join por idx) na mesma transaction
- TranscriptView.vue: edição inline no modo Segmentos (textarea no
  dblclick/lápis, salva no blur), indicador de salvando/salvo/erro
- Modo Texto corrido continua só leitura
```

> Commits anteriores a 2026-09-16 usam o estilo antigo ("Fase N —
> descrição", sem prefixo de tipo) e não foram reescritos — a convenção
> vale a partir daqui pra frente.
