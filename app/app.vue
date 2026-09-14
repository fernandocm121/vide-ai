<script setup lang="ts">
const site = useSiteConfig()

// Defaults do site — cada página sobrescreve título/descrição com useSeoMeta.
// O nuxt-seo-utils cuida do titleTemplate ("%s · Vide AI") a partir do site.name.
useSeoMeta({
  ogSiteName: 'Vide AI',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  ogImage: '/og-image.png',
  twitterImage: '/og-image.png',
})

// Dados estruturados (JSON-LD) para o site inteiro.
useSchemaOrg([
  defineOrganization({
    name: 'Vide AI',
    url: site.url,
    logo: '/favicon.svg',
    description: site.description,
  }),
  defineWebSite({
    name: 'Vide AI',
    inLanguage: 'pt-BR',
  }),
])
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
