<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    subtitle?: string
    align?: 'left' | 'center'
  }>(),
  { align: 'left' },
)
</script>

<template>
  <div
    :class="[
      'flex flex-col gap-4',
      align === 'center'
        ? 'items-center text-center mx-auto max-w-2xl'
        : 'max-w-2xl',
    ]"
  >
    <span v-if="eyebrow" class="eyebrow">
      <span class="h-px w-6 bg-brand-500" />
      {{ eyebrow }}
    </span>
    <h2 class="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
      {{ title }}<span class="text-brand-500">.</span>
    </h2>
    <p v-if="subtitle" class="text-lg leading-relaxed text-ink-soft">
      {{ subtitle }}
    </p>
  </div>
</template>
