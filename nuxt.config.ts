import tailwindcss from '@tailwindcss/vite'

// URL pública do site. Em produção vem de NUXT_PUBLIC_SITE_URL (Vercel/CI);
// o fallback abaixo é só para dev/preview e deve bater com o domínio real.
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://videai.app'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-08-01',
  devtools: { enabled: true },

  // `@nuxtjs/i18n` precisa rodar antes do `@nuxtjs/seo`: o SEO detecta se o
  // i18n está instalado (`hasNuxtModule`) durante o próprio setup e, se vier
  // depois na lista, ainda não o enxerga — aí registra um `useI18n()` stub
  // (fallback só usado quando não há módulo de i18n) que teria prioridade no
  // auto-import e devolveria sempre o texto de fallback, nunca a tradução.
  modules: ['@nuxt/eslint', '@nuxt/fonts', '@nuxtjs/i18n', '@nuxtjs/seo'],

  css: [
    'primevue/resources/themes/lara-light-indigo/theme.css',
    'primevue/resources/primevue.css',
    'primeicons/primeicons.css',
    'flag-icons/css/flag-icons.min.css',
    '~/assets/css/main.css',
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  // PrimeVue 3.x não tem `exports` map compatível com ESM puro (subpaths tipo
  // `primevue/api` resolvem pra um diretório). Sem isso, o Nitro deixa o
  // import externo e o Node quebra em produção com ERR_UNSUPPORTED_DIR_IMPORT.
  // `transpile` força o Vite a embutir o pacote no bundle SSR.
  build: {
    transpile: ['primevue'],
  },

  runtimeConfig: {
    public: {
      siteUrl,
      // Analytics de produto — PostHog. Sem chave => plugin vira no-op.
      posthogKey: process.env.NUXT_PUBLIC_POSTHOG_KEY || '',
      posthogHost:
        process.env.NUXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      // Login com Google — só liga o botão no front se as duas env vars
      // existirem no servidor (client id/secret nunca chegam ao público).
      googleOauthEnabled: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      ),
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

  // ─── i18n (@nuxtjs/i18n) ───
  // `no_prefix`: mantém a convenção de URL em português do projeto (sem
  // /en, /es... na frente da rota) — trade-off consciente: sem hreflang por
  // URL distinta, o `@nuxtjs/seo` não gera tag de idioma alternativo por rota.
  // Códigos precisam ficar em sincronia com `shared/locales.ts` (validação
  // do idioma salvo em `users.preferredLocale` no server).
  i18n: {
    baseUrl: siteUrl,
    strategy: 'no_prefix',
    defaultLocale: 'pt-BR',
    locales: [
      {
        code: 'pt-BR',
        language: 'pt-BR',
        name: 'Português',
        file: 'pt-BR.json',
      },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json' },
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'de', language: 'de-DE', name: 'Deutsch', file: 'de.json' },
      { code: 'it', language: 'it-IT', name: 'Italiano', file: 'it.json' },
      { code: 'ja', language: 'ja-JP', name: '日本語', file: 'ja.json' },
      { code: 'ko', language: 'ko-KR', name: '한국어', file: 'ko.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'no prefix',
    },
  },

  sitemap: {
    // /app/** é área autenticada; as demais são páginas de auth (noindex).
    exclude: [
      '/app/**',
      '/login',
      '/signup',
      '/verificar-email',
      '/confirme-seu-email',
      '/esqueci-senha',
      '/redefinir-senha',
    ],
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
      // `htmlAttrs.lang` passa a ser setado dinamicamente em app.vue via
      // `useLocaleHead()` (@nuxtjs/i18n), a partir do idioma ativo.
      meta: [{ name: 'theme-color', content: '#E5352B' }],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
})
