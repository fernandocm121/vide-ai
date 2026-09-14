<script setup lang="ts">
const derived = [
  'Legendas',
  'Artigo',
  '5 Shorts',
  'Títulos A/B',
  'Descrição',
  'Show notes',
  'Thread',
  'Newsletter',
  'Capítulos',
  'Melhores momentos',
]
</script>

<template>
  <section id="problema" class="border-b border-line bg-paper">
    <div class="container-page grid gap-12 py-16 lg:grid-cols-2 lg:py-24">
      <SectionHeading
        eyebrow="O problema"
        title="Seus vídeos têm valor escondido"
        subtitle="Milhões de horas de vídeo são gravadas todo dia, mas a maior parte desse conteúdo nunca é aproveitada. Transformar uma gravação em legendas, artigos, cortes e resumos consome tempo demais."
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <div
          class="flex flex-col justify-between rounded-2xl border border-line bg-paper-2 p-6"
        >
          <p
            class="text-xs font-semibold uppercase tracking-wider text-ink-soft"
          >
            Antes
          </p>
          <div class="mt-6">
            <p class="text-2xl font-extrabold text-ink">Vídeo de 2 horas</p>
            <p class="mt-2 text-sm text-ink-soft">
              parado no HD, sem aproveitamento
            </p>
          </div>
        </div>

        <div
          class="flex flex-col justify-between rounded-2xl border border-brand-200 bg-brand-50 p-6"
        >
          <p
            class="text-xs font-semibold uppercase tracking-wider text-brand-600"
          >
            Depois
          </p>
          <div class="mt-6">
            <p class="text-2xl font-extrabold text-ink">10+ conteúdos</p>
            <p class="mt-2 text-sm text-ink-soft">
              derivados de uma única gravação
            </p>
          </div>
        </div>

        <div class="rounded-2xl border border-line bg-paper p-6 sm:col-span-2">
          <p
            class="text-xs font-semibold uppercase tracking-wider text-ink-soft"
          >
            Um vídeo vira
          </p>
          <ul class="mt-4 flex flex-wrap gap-2">
            <li
              v-for="d in derived"
              :key="d"
              class="rounded-full border border-line bg-paper-2 px-3 py-1.5 text-sm text-ink"
            >
              {{ d }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
