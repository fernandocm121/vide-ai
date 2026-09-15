<script setup lang="ts">
const { user, logout } = useAuth()
const loggingOut = ref(false)

async function onLogout() {
  loggingOut.value = true
  try {
    await logout()
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-paper-2">
    <header class="border-b border-line bg-paper">
      <div class="container-page flex h-14 items-center justify-between gap-6">
        <div class="flex items-center gap-6">
          <AppLogo />
          <nav class="hidden items-center gap-6 sm:flex">
            <NuxtLink
              to="/app"
              class="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              Meus áudios
            </NuxtLink>
            <NuxtLink
              to="/app/conta"
              class="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              Minha conta
            </NuxtLink>
          </nav>
        </div>
        <div class="flex items-center gap-4 text-sm text-ink-soft">
          <span class="hidden sm:inline">{{ user?.email }}</span>
          <button
            type="button"
            class="font-medium transition-colors hover:text-ink disabled:opacity-50"
            :disabled="loggingOut"
            @click="onLogout"
          >
            Sair
          </button>
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
