<script setup lang="ts">
const bullets = [
  'Transcrição com timestamps',
  'Legendas SRT e VTT',
  'Sem cartão de crédito',
]

const outputs = [
  'Transcrição completa',
  'Capítulos e resumo automáticos',
  'Melhores momentos para Shorts',
  '48 min processados',
]
</script>

<template>
  <section class="relative overflow-hidden border-b border-line bg-paper-2">
    <div
      class="container-page grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24"
    >
      <div class="flex flex-col gap-7">
        <span class="eyebrow">
          <span class="h-px w-6 bg-brand-500" />
          Video Intelligence
        </span>

        <h1
          class="text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl"
        >
          Transforme vídeos em
          <span class="text-brand-500">inteligência</span>.
        </h1>

        <p class="max-w-xl text-lg leading-relaxed text-ink-soft">
          Envie qualquer vídeo ou áudio e receba transcrição, capítulos, resumo,
          cortes e uma base de conhecimento onde você pergunta e encontra o
          momento exato.
        </p>

        <div class="flex flex-col gap-3 sm:flex-row">
          <BaseButton variant="primary" size="lg" href="#cta">
            Começar gratuitamente
            <AppIcon name="arrow-right" class="size-4" />
          </BaseButton>
          <BaseButton variant="outline" size="lg" href="#como-funciona">
            Ver como funciona
          </BaseButton>
        </div>

        <ul class="flex flex-wrap gap-x-6 gap-y-2 pt-1">
          <li
            v-for="b in bullets"
            :key="b"
            class="flex items-center gap-2 text-sm text-ink-soft"
          >
            <AppIcon name="check" class="size-4 text-brand-500" />
            {{ b }}
          </li>
        </ul>
      </div>

      <div class="relative">
        <div
          class="rounded-2xl border border-line bg-paper p-5 shadow-xl shadow-ink/5"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Novo processamento
            </span>
            <span class="flex items-center gap-1.5 text-xs font-medium text-brand-600">
              <span class="size-1.5 animate-pulse rounded-full bg-brand-500" />
              processando
            </span>
          </div>

          <div
            class="mt-4 grid place-items-center gap-2 rounded-xl border border-dashed border-line bg-paper-2 px-6 py-10 text-center"
          >
            <AppIcon name="upload" class="size-7 text-ink-soft" />
            <p class="text-sm font-medium text-ink">entrevista-podcast-42.mp4</p>
            <p class="text-xs text-ink-soft">MP4 · 1080p · 52:14</p>
          </div>

          <ul class="mt-4 flex flex-col gap-2.5">
            <li
              v-for="o in outputs"
              :key="o"
              class="flex items-center gap-2.5 rounded-lg bg-paper-2 px-3 py-2.5 text-sm text-ink"
            >
              <span class="grid size-5 place-items-center rounded-full bg-brand-500 text-white">
                <AppIcon name="check" class="size-3" />
              </span>
              {{ o }}
            </li>
          </ul>
        </div>

        <div
          class="absolute -bottom-5 -left-5 hidden rounded-xl border border-line bg-paper px-4 py-3 shadow-lg shadow-ink/5 sm:block"
        >
          <p class="text-xs text-ink-soft">Momento encontrado</p>
          <p class="text-sm font-semibold text-ink">"GTA 6" · 04:31</p>
        </div>
      </div>
    </div>
  </section>
</template>
