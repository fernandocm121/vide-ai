<script setup lang="ts">
const year = new Date().getFullYear()

const groups = [
  {
    title: 'Produto',
    links: [
      { label: 'Como funciona', href: '#como-funciona' },
      { label: 'Recursos', href: '#diferencial' },
      { label: 'Preços', href: '#planos' },
      { label: 'Roadmap', href: '#' },
    ],
  },
  {
    title: 'Para quem',
    links: [
      { label: 'YouTubers', href: '#publico' },
      { label: 'Podcasters', href: '#publico' },
      { label: 'Professores', href: '#publico' },
      { label: 'Empresas', href: '#planos' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Contato', href: '#' },
      { label: 'Termos', href: '#' },
      { label: 'Privacidade', href: '#' },
    ],
  },
]
</script>

<template>
  <footer class="border-t border-line bg-paper">
    <div class="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
      <div class="flex flex-col gap-4">
        <AppLogo />
        <p class="max-w-xs text-sm leading-relaxed text-ink-soft">
          Video Intelligence. Transforme qualquer vídeo em texto, conhecimento e
          conteúdo pronto para publicar.
        </p>
      </div>

      <div v-for="group in groups" :key="group.title" class="flex flex-col gap-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-ink">
          {{ group.title }}
        </p>
        <a
          v-for="link in group.links"
          :key="link.label"
          :href="link.href"
          class="text-sm text-ink-soft transition-colors hover:text-brand-600"
        >
          {{ link.label }}
        </a>
      </div>
    </div>

    <div class="border-t border-line">
      <div
        class="container-page flex flex-col gap-2 py-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between"
      >
        <p>© {{ year }} Vide AI. Todos os direitos reservados.</p>
        <p>Feito para quem vive de vídeo.</p>
      </div>
    </div>
  </footer>
</template>
