<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'dark' | 'outline' | 'ghost'
    size?: 'md' | 'lg'
    to?: string
    href?: string
    block?: boolean
  }>(),
  { variant: 'primary', size: 'md', block: false },
)

const component = computed(() => {
  if (props.to) return resolveComponent('NuxtLink')
  if (props.href) return 'a'
  return 'button'
})

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
    :class="[
      'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
      variants[variant],
      sizes[size],
      block ? 'w-full' : '',
    ]"
  >
    <slot />
  </component>
</template>
