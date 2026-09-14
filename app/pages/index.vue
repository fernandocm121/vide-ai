<script setup lang="ts">
import { plans } from '~/data/home'

useSeoMeta({
  title: 'Transforme vídeos em inteligência',
  description:
    'Envie qualquer vídeo e receba transcrição, capítulos, resumo, cortes e uma base de conhecimento pesquisável. Feito para criadores.',
})

// Dados estruturados: a aplicação e seus planos.
const priceFrom = Math.min(
  ...plans.map((p) => Number(p.price.replace(/[^\d]/g, ''))),
)

useSchemaOrg([
  defineSoftwareApp({
    name: 'Vide AI',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: priceFrom,
      priceCurrency: 'BRL',
    },
  }),
])
</script>

<template>
  <div>
    <HomeHeroSection />
    <HomeProblemSection />
    <HomeHowItWorksSection />
    <HomeDifferentialSection />
    <HomeAudienceSection />
    <HomePipelineSection />
    <HomePricingSection />
    <HomeFinalCtaSection />
  </div>
</template>
