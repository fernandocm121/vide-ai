<script setup lang="ts">
const searchResults = [
  {
    video: 'Podcast #12 — Carreira em tech',
    moment: '18:44',
    match: 'autenticação OAuth',
  },
  {
    video: 'Aula React — Semana 3',
    moment: '42:07',
    match: 'fluxo de OAuth com refresh token',
  },
  {
    video: 'Entrevista — Segurança',
    moment: '05:31',
    match: 'OAuth vs. sessão',
  },
]
</script>

<template>
  <section id="diferencial" class="border-b border-line bg-paper">
    <div class="container-page py-16 lg:py-24">
      <SectionHeading
        eyebrow="O diferencial"
        title="Não é apenas transcrição. É inteligência sobre seus vídeos"
        subtitle="Cada vídeo processado vira parte de uma base de conhecimento pesquisável — do momento exato à resposta pronta."
      />

      <div class="mt-12 grid gap-6 lg:grid-cols-2">
        <!-- Ask Your Video -->
        <div
          class="flex flex-col rounded-2xl border border-line bg-paper-2 p-6"
        >
          <div class="flex items-center gap-2">
            <AppIcon name="sparkles" class="size-5 text-brand-600" />
            <h3 class="text-lg font-bold text-ink">Ask Your Video</h3>
          </div>
          <p class="mt-2 text-sm text-ink-soft">
            Pergunte em linguagem natural e receba o vídeo, o momento e a
            resposta.
          </p>

          <div class="mt-5 rounded-xl border border-line bg-paper p-4">
            <p class="rounded-lg bg-paper-2 px-3 py-2 text-sm text-ink">
              "Em qual momento foi falado sobre GTA 6?"
            </p>
            <div class="mt-3 flex items-start gap-3 px-1">
              <span
                class="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-500 text-white"
              >
                <AppIcon name="play" class="size-4" />
              </span>
              <div class="text-sm">
                <p class="font-semibold text-ink">
                  Gameplay GTA 6 · <span class="text-brand-600">04:31</span>
                </p>
                <p class="mt-1 leading-relaxed text-ink-soft">
                  O assunto aparece quando o criador comenta sobre o novo
                  trailer e compara com as expectativas da comunidade.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Biblioteca inteligente -->
        <div
          class="flex flex-col rounded-2xl border border-line bg-paper-2 p-6"
        >
          <div class="flex items-center gap-2">
            <AppIcon name="search" class="size-5 text-brand-600" />
            <h3 class="text-lg font-bold text-ink">Biblioteca inteligente</h3>
          </div>
          <p class="mt-2 text-sm text-ink-soft">
            O Google dos seus vídeos: busque um assunto e veja em quais
            gravações você já falou dele.
          </p>

          <div class="mt-5 rounded-xl border border-line bg-paper p-4">
            <div
              class="flex items-center gap-2 rounded-lg border border-line px-3 py-2"
            >
              <AppIcon name="search" class="size-4 text-ink-soft" />
              <span class="text-sm text-ink"
                >Em qual vídeo falei sobre autenticação OAuth?</span
              >
            </div>
            <ul class="mt-3 flex flex-col divide-y divide-line">
              <li
                v-for="r in searchResults"
                :key="r.video"
                class="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <div class="min-w-0">
                  <p class="truncate font-medium text-ink">{{ r.video }}</p>
                  <p class="truncate text-xs text-ink-soft">“{{ r.match }}”</p>
                </div>
                <span
                  class="shrink-0 rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-600"
                >
                  {{ r.moment }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
