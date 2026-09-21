<script setup lang="ts">
import { steps } from '~/data/home'

const { t } = useI18n()

const STEP_TEXT: Record<string, { title: string; desc: string }> = {
  '01': {
    title: 'home.howItWorks.steps.01.title',
    desc: 'home.howItWorks.steps.01.desc',
  },
  '02': {
    title: 'home.howItWorks.steps.02.title',
    desc: 'home.howItWorks.steps.02.desc',
  },
  '03': {
    title: 'home.howItWorks.steps.03.title',
    desc: 'home.howItWorks.steps.03.desc',
  },
  '04': {
    title: 'home.howItWorks.steps.04.title',
    desc: 'home.howItWorks.steps.04.desc',
  },
}

const items = computed(() =>
  steps.map((step) => ({
    ...step,
    title: t(STEP_TEXT[step.id]!.title as 'home.howItWorks.steps.01.title'),
    desc: t(STEP_TEXT[step.id]!.desc as 'home.howItWorks.steps.01.desc'),
  })),
)
</script>

<template>
  <section id="como-funciona" class="border-b border-line bg-paper-2">
    <div class="container-page py-16 lg:py-24">
      <SectionHeading
        :eyebrow="$t('home.howItWorks.eyebrow')"
        :title="$t('home.howItWorks.title')"
        :subtitle="$t('home.howItWorks.subtitle')"
      />

      <ol
        class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4"
      >
        <li
          v-for="step in items"
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
