<script setup lang="ts">
const { t } = useI18n()

const outputs = computed(() => [
  { label: t('home.pipeline.outputs.transcript'), icon: 'file' },
  { label: t('home.pipeline.outputs.summary'), icon: 'brain' },
  { label: t('home.pipeline.outputs.chapters'), icon: 'layers' },
  { label: t('home.pipeline.outputs.subtitles'), icon: 'file' },
  { label: t('home.pipeline.outputs.keywords'), icon: 'search' },
  { label: t('home.pipeline.outputs.bestMoments'), icon: 'bolt' },
  { label: t('home.pipeline.outputs.titles'), icon: 'sparkles' },
  { label: t('home.pipeline.outputs.shorts'), icon: 'scissors' },
])
</script>

<template>
  <section class="border-b border-line bg-paper">
    <div class="container-page py-16 lg:py-24">
      <SectionHeading
        :eyebrow="$t('home.pipeline.eyebrow')"
        :title="$t('home.pipeline.title')"
        :subtitle="$t('home.pipeline.subtitle')"
      />

      <div
        class="mt-12 flex flex-col items-stretch gap-6 lg:flex-row lg:items-center"
      >
        <div
          class="flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-ink px-8 py-6 text-center text-white lg:w-56"
        >
          <AppIcon name="video" class="size-6" />
          <p class="mt-1 text-lg font-bold">
            {{ $t('home.pipeline.recordingLabel') }}
          </p>
          <p class="text-xs text-white/70">
            {{ $t('home.pipeline.recordingCaption') }}
          </p>
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
        {{ $t('home.pipeline.footer') }}
      </div>
    </div>
  </section>
</template>
