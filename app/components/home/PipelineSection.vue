<script setup lang="ts">
const outputs = [
  { label: 'Transcrição', icon: 'file' },
  { label: 'Resumo', icon: 'brain' },
  { label: 'Capítulos', icon: 'layers' },
  { label: 'Legendas SRT/VTT', icon: 'file' },
  { label: 'Palavras-chave', icon: 'search' },
  { label: 'Melhores momentos', icon: 'bolt' },
  { label: 'Títulos e descrições', icon: 'sparkles' },
  { label: 'Cortes para Shorts', icon: 'scissors' },
]
</script>

<template>
  <section class="border-b border-line bg-paper">
    <div class="container-page py-16 lg:py-24">
      <SectionHeading
        eyebrow="Pipeline de conteúdo"
        title="Um vídeo. Múltiplos conteúdos"
        subtitle="A mesma gravação alimenta todo o seu calendário editorial."
      />

      <div
        class="mt-12 flex flex-col items-stretch gap-6 lg:flex-row lg:items-center"
      >
        <div
          class="flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-ink px-8 py-6 text-center text-white lg:w-56"
        >
          <AppIcon name="video" class="size-6" />
          <p class="mt-1 text-lg font-bold">30 min</p>
          <p class="text-xs text-white/70">de gravação</p>
        </div>

        <div class="hidden shrink-0 text-ink-soft lg:block">
          <AppIcon name="arrow-right" class="size-6" />
        </div>
        <div class="flex justify-center text-ink-soft lg:hidden">
          <AppIcon name="arrow-down" class="size-6" />
        </div>

        <div class="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="o in outputs"
            :key="o.label"
            class="flex items-center gap-2.5 rounded-xl border border-line bg-paper-2 px-3.5 py-3 text-sm font-medium text-ink"
          >
            <AppIcon :name="o.icon" class="size-4 text-brand-600" />
            {{ o.label }}
          </div>
        </div>
      </div>

      <div
        class="mt-6 flex items-center justify-center rounded-2xl bg-brand-500 px-6 py-5 text-center text-sm font-semibold text-white"
      >
        Tudo pronto para publicar no YouTube, TikTok, Instagram e newsletter.
      </div>
    </div>
  </section>
</template>
