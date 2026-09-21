<script setup lang="ts">
const site = useSiteConfig()
const { localeProperties } = useI18n()

// `htmlAttrs.lang`/`dir` reativos ao idioma ativo (@nuxtjs/i18n) — substitui
// o `lang="pt-BR"` fixo que existia antes no `nuxt.config.ts`.
useHead(useLocaleHead())

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
    inLanguage: () => localeProperties.value.language,
  }),
])
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <AppToast />
</template>
