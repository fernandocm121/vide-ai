import tailwindcss from '@tailwindcss/vite'

// URL pública do site. Em produção vem de NUXT_PUBLIC_SITE_URL (Vercel/CI);
// o fallback abaixo é só para dev/preview e deve bater com o domínio real.
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://videai.app'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-08-01',
  devtools: { enabled: true },

  modules: ['@nuxt/eslint', '@nuxt/fonts', '@nuxtjs/seo'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    public: {
      siteUrl,
      // Analytics de produto — PostHog. Sem chave => plugin vira no-op.
      posthogKey: process.env.NUXT_PUBLIC_POSTHOG_KEY || '',
      posthogHost:
        process.env.NUXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    },
  },

  fonts: {
    families: [
      { name: 'Inter', provider: 'google', weights: [400, 500, 600, 700, 800] },
    ],
  },

  // ─── SEO (@nuxtjs/seo: sitemap + robots + schema.org + meta) ───
  site: {
    url: siteUrl,
    name: 'Vide AI',
    description:
      'Vide AI transforma qualquer vídeo em transcrição, conhecimento pesquisável e conteúdo pronto para publicar.',
    defaultLocale: 'pt-BR',
  },

  sitemap: {
    // /app/** é área autenticada; /signup é noindex (página de conversão).
    exclude: ['/app/**', '/signup'],
  },

  // As regras de robots.txt vêm de public/_robots.txt (o módulo só acrescenta
  // a linha Sitemap:).

  // Imagem OG: PNG estático e branded em /public/og-image.png (definido em
  // app.vue). Sem pipeline de renderização — não precisamos de OG dinâmico
  // por rota numa landing.
  ogImage: {
    enabled: false,
  },

  eslint: {
    config: {
      // O style fica com o Prettier; o ESLint cuida só da qualidade do código.
      stylistic: false,
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      meta: [{ name: 'theme-color', content: '#E5352B' }],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
})
