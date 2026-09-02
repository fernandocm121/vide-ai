<script setup lang="ts">
withDefaults(defineProps<{ inverted?: boolean }>(), { inverted: false })
</script>

<template>
  <NuxtLink
    to="/"
    class="inline-flex items-center gap-2 font-extrabold tracking-tight"
    :class="inverted ? 'text-white' : 'text-ink'"
    aria-label="Vide AI — início"
  >
    <span
      class="grid size-7 place-items-center rounded-md bg-brand-500 text-white"
    >
      <AppIcon name="play" class="size-4" />
    </span>
    <span class="text-lg">Vide<span class="text-brand-500"> AI</span></span>
  </NuxtLink>
</template>
