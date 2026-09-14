<script setup lang="ts">
import { plans } from '~/data/home'

const { track } = useAnalytics()

const planSlug = (name: string) => name.toLowerCase()
</script>

<template>
  <section id="planos" class="border-b border-line bg-paper-2">
    <div class="container-page py-16 lg:py-24">
      <SectionHeading
        align="center"
        eyebrow="Planos"
        title="Escolha o plano certo para você"
        subtitle="Não competimos por preço de transcrição. Você paga por valor: conteúdo pronto e conhecimento pesquisável."
      />

      <div class="mt-12 grid gap-6 lg:grid-cols-3">
        <article
          v-for="plan in plans"
          :key="plan.name"
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
              Mais popular
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
            :to="`/signup?plan=${planSlug(plan.name)}`"
            block
            class="mt-6"
            @click="
              track('cta_click', {
                location: 'pricing',
                plan: planSlug(plan.name),
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

      <p class="mt-8 text-center text-sm text-ink-soft">
        Precisa de mais? O plano
        <span class="font-semibold text-ink">Enterprise</span>
        atende empresas com volume alto e necessidades específicas.
      </p>
    </div>
  </section>
</template>
