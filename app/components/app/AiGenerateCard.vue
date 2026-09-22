<script setup lang="ts">
import type { AiGenerationStatus } from '~/composables/useAiGeneration'

const props = defineProps<{
  icon: string
  title: string
  description: string
  ctaLabel: string
  status: AiGenerationStatus
  generatedAt?: string
  error?: string | null
  busy?: boolean
}>()

const emit = defineEmits<{ generate: []; retry: [] }>()

const { t, locale } = useI18n()

const generatedAtLabel = computed(() => {
  if (!props.generatedAt) return ''
  return new Intl.DateTimeFormat(locale.value, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(props.generatedAt))
})
</script>

<template>
  <div class="rounded-2xl border border-line bg-paper">
    <div
      v-if="status === 'empty'"
      class="flex flex-col items-center gap-3 px-6 py-10 text-center"
    >
      <span
        class="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600"
      >
        <AppIcon :name="icon" class="size-6" />
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink">{{ title }}</h3>
        <p class="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
          {{ description }}
        </p>
      </div>
      <BaseButton :loading="busy" @click="emit('generate')">
        {{ ctaLabel }}
      </BaseButton>
    </div>

    <div
      v-else-if="status === 'generating'"
      class="flex items-center gap-3 px-6 py-10 text-sm text-ink"
    >
      <span class="size-2 animate-pulse rounded-full bg-amber-500" />
      {{ t('aiFeatures.common.generating') }}
    </div>

    <div
      v-else-if="status === 'failed'"
      class="flex flex-col items-center gap-3 px-6 py-10 text-center"
    >
      <p class="text-sm font-medium text-brand-600">
        {{ error || t('aiFeatures.common.genericError') }}
      </p>
      <BaseButton variant="outline" :loading="busy" @click="emit('retry')">
        {{ t('aiFeatures.common.retry') }}
      </BaseButton>
    </div>

    <template v-else>
      <div class="p-5">
        <slot />
      </div>
      <div
        class="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-ink-soft"
      >
        <span>{{
          t('aiFeatures.common.generatedAt', { date: generatedAtLabel })
        }}</span>
        <button
          class="font-medium text-ink-soft transition-colors hover:text-ink"
          @click="emit('retry')"
        >
          {{ t('aiFeatures.common.regenerate') }}
        </button>
      </div>
    </template>
  </div>
</template>
