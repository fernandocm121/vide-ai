<script setup lang="ts">
import { plans } from '~/data/home'

const { t, tm, rt } = useI18n()
const { track } = useAnalytics()

const PLAN_TEXT: Record<
  string,
  { tagline: string; features: string; cta: string }
> = {
  starter: {
    tagline: 'home.pricing.plans.starter.tagline',
    features: 'home.pricing.plans.starter.features',
    cta: 'home.pricing.plans.starter.cta',
  },
  pro: {
    tagline: 'home.pricing.plans.pro.tagline',
    features: 'home.pricing.plans.pro.features',
    cta: 'home.pricing.plans.pro.cta',
  },
  agency: {
    tagline: 'home.pricing.plans.agency.tagline',
    features: 'home.pricing.plans.agency.features',
    cta: 'home.pricing.plans.agency.cta',
  },
}

const items = computed(() =>
  plans.map((plan) => {
    const keys = PLAN_TEXT[plan.id]!
    return {
      ...plan,
      tagline: t(keys.tagline as 'home.pricing.plans.starter.tagline'),
      // `tm()` devolve o recurso "cru" (pode ser nó compilado, não string
      // pronta) — `rt()` resolve cada item pro texto final. Usar o array
      // direto quebrava a hidratação (SSR resolvia string, client devolvia
      // o nó da AST).
      features: (
        tm(keys.features as 'home.pricing.plans.starter.features') as unknown[]
      ).map((item) => rt(item as never)),
      cta: t(keys.cta as 'home.pricing.plans.starter.cta'),
    }
  }),
)
</script>

<template>
  <section id="planos" class="border-b border-line bg-paper-2">
    <div class="container-page py-16 lg:py-24">
      <SectionHeading
        align="center"
        :eyebrow="$t('home.pricing.eyebrow')"
        :title="$t('home.pricing.title')"
        :subtitle="$t('home.pricing.subtitle')"
      />

      <div class="mt-12 grid gap-6 lg:grid-cols-3">
        <article
          v-for="plan in items"
          :key="plan.id"
          :class="[
            'flex flex-col rounded-2xl border bg-paper p-7',
            plan.highlight
              ? 'border-brand-500 shadow-xl shadow-brand-500/10 lg:-translate-y-3'
              : 'border-line',
          ]"
        >
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold uppercase tracking-wider text-ink">
              {{ plan.name }}
            </h3>
            <span
              v-if="plan.highlight"
              class="rounded-full bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white"
            >
              {{ $t('home.pricing.mostPopular') }}
            </span>
          </div>

          <div class="mt-4 flex items-baseline gap-1">
            <span class="text-4xl font-extrabold tracking-tight text-ink">
              {{ plan.price }}
            </span>
            <span class="text-sm text-ink-soft">{{ plan.period }}</span>
          </div>
          <p class="mt-2 text-sm text-ink-soft">{{ plan.tagline }}</p>

          <BaseButton
            :variant="plan.highlight ? 'primary' : 'outline'"
            size="md"
            :to="`/signup?plan=${plan.id}`"
            block
            class="mt-6"
            @click="
              track('cta_click', {
                location: 'pricing',
                plan: plan.id,
              })
            "
          >
            {{ plan.cta }}
          </BaseButton>

          <ul class="mt-6 flex flex-col gap-3 border-t border-line pt-6">
            <li
              v-for="f in plan.features"
              :key="f"
              class="flex items-start gap-2.5 text-sm text-ink"
            >
              <AppIcon
                name="check"
                class="mt-0.5 size-4 shrink-0 text-brand-500"
              />
              {{ f }}
            </li>
          </ul>
        </article>
      </div>

      <i18n-t
        keypath="home.pricing.enterpriseNote"
        tag="p"
        class="mt-8 text-center text-sm text-ink-soft"
      >
        <template #plan>
          <span class="font-semibold text-ink">{{
            $t('home.pricing.enterpriseName')
          }}</span>
        </template>
      </i18n-t>
    </div>
  </section>
</template>
