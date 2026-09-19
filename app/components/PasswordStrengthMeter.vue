<script setup lang="ts">
const props = defineProps<{ password: string }>()
const password = toRef(props, 'password')
const { criteria, level } = usePasswordStrength(password)

const LEVEL_META: Record<
  string,
  { label: string; bar: string; width: string; text: string }
> = {
  weak: {
    label: 'Fraca',
    bar: 'bg-red-500',
    width: 'w-1/3',
    text: 'text-red-600',
  },
  medium: {
    label: 'Média',
    bar: 'bg-amber-500',
    width: 'w-2/3',
    text: 'text-amber-600',
  },
  strong: {
    label: 'Forte',
    bar: 'bg-emerald-500',
    width: 'w-full',
    text: 'text-emerald-600',
  },
}
</script>

<template>
  <div v-if="password" class="mt-2.5 flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-3">
        <div
          class="h-full rounded-full transition-all duration-200"
          :class="[LEVEL_META[level]?.bar, LEVEL_META[level]?.width]"
        />
      </div>
      <span
        class="w-12 shrink-0 text-xs font-medium"
        :class="LEVEL_META[level]?.text"
      >
        {{ LEVEL_META[level]?.label }}
      </span>
    </div>

    <ul class="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
      <li
        v-for="c in criteria"
        :key="c.key"
        class="flex items-center gap-1.5 text-xs"
        :class="c.met ? 'text-emerald-600' : 'text-ink-soft'"
      >
        <AppIcon v-if="c.met" name="check" class="size-3.5 shrink-0" />
        <span
          v-else
          class="size-3.5 shrink-0 rounded-full border border-line"
        />
        {{ c.label }}
      </li>
    </ul>
  </div>
</template>
