import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-08-01',
  devtools: { enabled: true },

  modules: ['@nuxt/fonts'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  fonts: {
    families: [
      { name: 'Inter', provider: 'google', weights: [400, 500, 600, 700, 800] },
    ],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Vide AI — Transforme vídeos em inteligência',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Vide AI transforma qualquer vídeo em transcrição, conhecimento pesquisável e conteúdo pronto para publicar. Feito para YouTubers, podcasters, professores e criadores.',
        },
        { property: 'og:title', content: 'Vide AI — Transforme vídeos em inteligência' },
        {
          property: 'og:description',
          content:
            'Do vídeo bruto ao conteúdo pronto: transcrição, capítulos, resumos, cortes e a busca "Pergunte ao seu vídeo".',
        },
        { property: 'og:type', content: 'website' },
        { name: 'theme-color', content: '#E5352B' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
})
