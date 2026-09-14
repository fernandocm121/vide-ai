<script setup lang="ts">
import { audiences } from '~/data/home'
</script>

<template>
  <section id="publico" class="border-b border-line bg-paper-2">
    <div class="container-page py-16 lg:py-24">
      <SectionHeading
        eyebrow="Para quem é"
        title="Feito para quem vive de vídeo"
        subtitle="YouTubers, podcasters, professores e jornalistas que precisam extrair o máximo de cada gravação."
      />

      <div class="mt-12 grid gap-6 md:grid-cols-3">
        <article
          v-for="a in audiences"
          :key="a.tag"
          class="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-6"
        >
          <span
            class="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600"
          >
            <AppIcon :name="a.icon" class="size-5" />
          </span>
          <span
            class="text-xs font-semibold uppercase tracking-wider text-brand-600"
          >
            {{ a.tag }}
          </span>
          <h3 class="text-lg font-bold leading-snug text-ink">{{ a.title }}</h3>
          <p class="text-sm leading-relaxed text-ink-soft">{{ a.desc }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
