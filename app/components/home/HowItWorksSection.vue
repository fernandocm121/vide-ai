<script setup lang="ts">
import { steps } from '~/data/home'
</script>

<template>
  <section id="como-funciona" class="border-b border-line bg-paper-2">
    <div class="container-page py-16 lg:py-24">
      <SectionHeading
        eyebrow="Como funciona"
        title="Do vídeo bruto ao conteúdo pronto"
        subtitle="Quatro etapas automáticas. Você envia a gravação, a plataforma faz o resto."
      />

      <ol class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <li
          v-for="step in steps"
          :key="step.id"
          class="group flex flex-col gap-4 bg-paper p-6 transition-colors hover:bg-paper-2"
        >
          <div class="flex items-center justify-between">
            <span
              class="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-600"
            >
              <AppIcon :name="step.icon" class="size-5" />
            </span>
            <span class="text-sm font-semibold text-ink-soft/50">
              {{ step.id }}
            </span>
          </div>
          <div>
            <h3 class="text-lg font-bold text-ink">{{ step.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-ink-soft">
              {{ step.desc }}
            </p>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>
