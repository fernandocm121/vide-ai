<script setup lang="ts">
const { track } = useAnalytics()
</script>

<template>
  <section id="cta" class="bg-brand-500">
    <div
      class="container-page flex flex-col items-center gap-6 py-20 text-center"
    >
      <h2
        class="max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
      >
        {{ $t('home.finalCta.title') }}
      </h2>
      <p class="max-w-xl text-lg text-white/85">
        {{ $t('home.finalCta.subtitle') }}
      </p>
      <div class="flex flex-col gap-3 sm:flex-row">
        <BaseButton
          variant="dark"
          size="lg"
          to="/signup"
          @click="track('cta_click', { location: 'final_cta' })"
        >
          {{ $t('home.finalCta.ctaPrimary') }}
          <AppIcon name="arrow-right" class="size-4" />
        </BaseButton>
        <BaseButton
          variant="ghost"
          size="lg"
          href="#planos"
          class="!text-white hover:!bg-white/10"
        >
          {{ $t('home.finalCta.ctaSecondary') }}
        </BaseButton>
      </div>
    </div>
  </section>
</template>
