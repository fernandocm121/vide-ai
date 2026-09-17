<template>
  <div class="flex min-h-screen flex-col bg-paper-2">
    <header class="container-page pt-8">
      <AppLogo />
    </header>
    <main class="flex flex-1 items-center justify-center px-6 py-12">
      <slot />
    </main>
  </div>
</template>
