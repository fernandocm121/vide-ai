<script setup lang="ts">
const { t } = useI18n()
const year = new Date().getFullYear()

const groups = computed(() => [
  {
    title: t('footer.groups.product.title'),
    links: [
      { label: t('footer.groups.product.howItWorks'), href: '#como-funciona' },
      { label: t('footer.groups.product.features'), href: '#diferencial' },
      { label: t('footer.groups.product.pricing'), href: '#planos' },
      { label: t('footer.groups.product.roadmap'), href: '#' },
    ],
  },
  {
    title: t('footer.groups.audience.title'),
    links: [
      { label: t('footer.groups.audience.youtubers'), href: '#publico' },
      { label: t('footer.groups.audience.podcasters'), href: '#publico' },
      { label: t('footer.groups.audience.teachers'), href: '#publico' },
      { label: t('footer.groups.audience.companies'), href: '#planos' },
    ],
  },
  {
    title: t('footer.groups.company.title'),
    links: [
      { label: t('footer.groups.company.contact'), href: '#' },
      { label: t('footer.groups.company.terms'), href: '#' },
      { label: t('footer.groups.company.privacy'), href: '#' },
    ],
  },
])
</script>

<template>
  <footer class="border-t border-line bg-paper">
    <div
      class="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]"
    >
      <div class="flex flex-col gap-4">
        <AppLogo />
        <p class="max-w-xs text-sm leading-relaxed text-ink-soft">
          {{ $t('footer.tagline') }}
        </p>
      </div>

      <div
        v-for="group in groups"
        :key="group.title"
        class="flex flex-col gap-3"
      >
        <p class="text-xs font-semibold uppercase tracking-wider text-ink">
          {{ group.title }}
        </p>
        <a
          v-for="link in group.links"
          :key="link.label"
          :href="link.href"
          class="text-sm text-ink-soft transition-colors hover:text-brand-600"
        >
          {{ link.label }}
        </a>
      </div>
    </div>

    <div class="border-t border-line">
      <div
        class="container-page flex flex-col gap-2 py-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between"
      >
        <p>{{ $t('footer.copyright', { year }) }}</p>
        <p>{{ $t('footer.madeFor') }}</p>
      </div>
    </div>
  </footer>
</template>
