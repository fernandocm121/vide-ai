<script setup lang="ts">
const { t } = useI18n()

const derived = computed(() => [
  t('home.problem.derived1'),
  t('home.problem.derived2'),
  t('home.problem.derived3'),
  t('home.problem.derived4'),
  t('home.problem.derived5'),
  t('home.problem.derived6'),
  t('home.problem.derived7'),
  t('home.problem.derived8'),
  t('home.problem.derived9'),
  t('home.problem.derived10'),
])
</script>

<template>
  <section id="problema" class="border-b border-line bg-paper">
    <div class="container-page grid gap-12 py-16 lg:grid-cols-2 lg:py-24">
      <SectionHeading
        :eyebrow="$t('home.problem.eyebrow')"
        :title="$t('home.problem.title')"
        :subtitle="$t('home.problem.subtitle')"
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <div
          class="flex flex-col justify-between rounded-2xl border border-line bg-paper-2 p-6"
        >
          <p
            class="text-xs font-semibold uppercase tracking-wider text-ink-soft"
          >
            {{ $t('home.problem.beforeLabel') }}
          </p>
          <div class="mt-6">
            <p class="text-2xl font-extrabold text-ink">
              {{ $t('home.problem.beforeTitle') }}
            </p>
            <p class="mt-2 text-sm text-ink-soft">
              {{ $t('home.problem.beforeDesc') }}
            </p>
          </div>
        </div>

        <div
          class="flex flex-col justify-between rounded-2xl border border-brand-200 bg-brand-50 p-6"
        >
          <p
            class="text-xs font-semibold uppercase tracking-wider text-brand-600"
          >
            {{ $t('home.problem.afterLabel') }}
          </p>
          <div class="mt-6">
            <p class="text-2xl font-extrabold text-ink">
              {{ $t('home.problem.afterTitle') }}
            </p>
            <p class="mt-2 text-sm text-ink-soft">
              {{ $t('home.problem.afterDesc') }}
            </p>
          </div>
        </div>

        <div class="rounded-2xl border border-line bg-paper p-6 sm:col-span-2">
          <p
            class="text-xs font-semibold uppercase tracking-wider text-ink-soft"
          >
            {{ $t('home.problem.derivedLabel') }}
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
