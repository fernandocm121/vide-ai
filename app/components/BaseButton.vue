<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'dark' | 'outline' | 'ghost'
    size?: 'md' | 'lg'
    to?: string
    href?: string
    block?: boolean
    disabled?: boolean
    loading?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  { variant: 'primary', size: 'md', block: false, disabled: false, loading: false },
)

const component = computed(() => {
  if (props.to) return resolveComponent('NuxtLink')
  if (props.href) return 'a'
  return 'button'
})

const isDisabled = computed(() => props.disabled || props.loading)

const variants: Record<string, string> = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/20',
  dark: 'bg-ink text-white hover:bg-ink/90',
  outline: 'border border-line text-ink hover:border-ink/40 hover:bg-paper-2',
  ghost: 'text-ink hover:bg-paper-3',
}

const sizes: Record<string, string> = {
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[0.95rem]',
}
</script>

<template>
  <component
    :is="component"
    :to="to"
    :href="href"
    :type="component === 'button' ? type ?? 'button' : undefined"
    :disabled="component === 'button' ? isDisabled : undefined"
    :aria-disabled="isDisabled || undefined"
    :class="[
      'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
      variants[variant],
      sizes[size],
      block ? 'w-full' : '',
      isDisabled ? 'pointer-events-none opacity-55' : '',
    ]"
  >
    <span
      v-if="loading"
      class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
    <slot />
  </component>
</template>
