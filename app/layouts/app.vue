<template>
  <div class="flex min-h-screen flex-col bg-paper-2">
    <header class="border-b border-line bg-paper">
      <div class="container-page flex h-14 items-center justify-between gap-6">
        <div class="flex items-center gap-6">
          <AppLogo />
          <nav class="hidden sm:block">
            <NuxtLink
              to="/app"
              class="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              Meus áudios
            </NuxtLink>
          </nav>
        </div>
        <div class="flex items-center gap-4 text-sm text-ink-soft">
          <span class="hidden sm:inline">dev@videai.local</span>
          <NuxtLink to="/" class="transition-colors hover:text-ink">Sair</NuxtLink>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <div class="container-page py-8 lg:py-12">
        <slot />
      </div>
    </main>
  </div>
</template>
