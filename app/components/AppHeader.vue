<script setup lang="ts">
const links = [
  { label: 'O problema', href: '#problema' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Recursos', href: '#diferencial' },
  { label: 'Preços', href: '#planos' },
]

const open = ref(false)
const route = useRoute()
watch(() => route.hash, () => (open.value = false))
</script>

<template>
  <header
    class="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md"
  >
    <div class="container-page flex h-16 items-center justify-between gap-6">
      <AppLogo />

      <nav class="hidden items-center gap-8 md:flex">
        <a
          v-for="link in links"
          :key="link.href"
          :href="link.href"
          class="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          {{ link.label }}
        </a>
      </nav>

      <div class="hidden items-center gap-2 md:flex">
        <BaseButton variant="ghost" size="md" href="#planos">Entrar</BaseButton>
        <BaseButton variant="primary" size="md" href="#cta">
          Começar gratuitamente
        </BaseButton>
      </div>

      <button
        class="grid size-10 place-items-center rounded-lg border border-line text-ink md:hidden"
        :aria-expanded="open"
        aria-label="Abrir menu"
        @click="open = !open"
      >
        <AppIcon :name="open ? 'x' : 'menu'" class="size-5" />
      </button>
    </div>

    <div
      v-if="open"
      class="border-t border-line bg-paper px-6 py-4 md:hidden"
    >
      <nav class="flex flex-col gap-1">
        <a
          v-for="link in links"
          :key="link.href"
          :href="link.href"
          class="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-paper-3"
          @click="open = false"
        >
          {{ link.label }}
        </a>
      </nav>
      <div class="mt-3 flex flex-col gap-2">
        <BaseButton variant="outline" size="md" href="#planos" block>Entrar</BaseButton>
        <BaseButton variant="primary" size="md" href="#cta" block>
          Começar gratuitamente
        </BaseButton>
      </div>
    </div>
  </header>
</template>
