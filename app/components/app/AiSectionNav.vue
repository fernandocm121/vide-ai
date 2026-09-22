<script setup lang="ts">
import { dropdownPt } from '~/utils/dropdown-pt'

export interface AiSection {
  id: string
  label: string
  icon: string
}

defineProps<{
  modelValue: string
  sections: AiSection[]
}>()

const emit = defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
  <div>
    <!-- desktop: pills com scroll horizontal -->
    <div class="hidden gap-1 overflow-x-auto border-b border-line sm:flex">
      <button
        v-for="s in sections"
        :key="s.id"
        type="button"
        class="flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors"
        :class="
          s.id === modelValue
            ? 'border-brand-500 text-brand-600'
            : 'border-transparent text-ink-soft hover:border-brand-300 hover:text-brand-600'
        "
        @click="emit('update:modelValue', s.id)"
      >
        <AppIcon :name="s.icon" class="size-4" />
        {{ s.label }}
      </button>
    </div>

    <!-- mobile: dropdown de seção -->
    <Dropdown
      class="w-full sm:hidden"
      :model-value="modelValue"
      :options="sections"
      option-label="label"
      option-value="id"
      :pt="dropdownPt"
      @update:model-value="(v) => emit('update:modelValue', v as string)"
    />
  </div>
</template>
