<script setup lang="ts">
import { audiences } from '~/data/home'

const { t } = useI18n()

const AUDIENCE_TEXT: Record<
  string,
  { tag: string; title: string; desc: string }
> = {
  youtubers: {
    tag: 'home.audience.items.youtubers.tag',
    title: 'home.audience.items.youtubers.title',
    desc: 'home.audience.items.youtubers.desc',
  },
  podcasters: {
    tag: 'home.audience.items.podcasters.tag',
    title: 'home.audience.items.podcasters.title',
    desc: 'home.audience.items.podcasters.desc',
  },
  teachers: {
    tag: 'home.audience.items.teachers.tag',
    title: 'home.audience.items.teachers.title',
    desc: 'home.audience.items.teachers.desc',
  },
}

const items = computed(() =>
  audiences.map((a) => {
    const keys = AUDIENCE_TEXT[a.id]!
    return {
      ...a,
      tag: t(keys.tag as 'home.audience.items.youtubers.tag'),
      title: t(keys.title as 'home.audience.items.youtubers.title'),
      desc: t(keys.desc as 'home.audience.items.youtubers.desc'),
    }
  }),
)
</script>

<template>
  <section id="publico" class="border-b border-line bg-paper-2">
    <div class="container-page py-16 lg:py-24">
      <SectionHeading
        :eyebrow="$t('home.audience.eyebrow')"
        :title="$t('home.audience.title')"
        :subtitle="$t('home.audience.subtitle')"
      />

      <div class="mt-12 grid gap-6 md:grid-cols-3">
        <article
          v-for="a in items"
          :key="a.id"
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
