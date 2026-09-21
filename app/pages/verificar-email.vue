<script setup lang="ts">
definePageMeta({ layout: 'auth' })
const { t } = useI18n()
useSeoMeta({ title: () => t('auth.verifyEmail.seoTitle'), robots: 'noindex' })

const route = useRoute()
const { user, fetchUser } = useAuth()

const status = ref<'pending' | 'ok' | 'error'>('pending')
const errorMsg = ref('')

onMounted(async () => {
  const token = String(route.query.token ?? '')
  if (!token) {
    status.value = 'error'
    errorMsg.value = t('auth.verifyEmail.invalidToken')
    return
  }
  try {
    await $fetch('/api/auth/verify-email', { method: 'POST', body: { token } })
    await fetchUser()
    status.value = 'ok'
  } catch (err: unknown) {
    const data = (err as { data?: { statusMessage?: string } }).data
    errorMsg.value = data?.statusMessage ?? t('auth.verifyEmail.genericError')
    status.value = 'error'
  }
})
</script>

<template>
  <div
    class="w-full max-w-md rounded-2xl border border-line bg-paper p-7 text-center shadow-xl shadow-ink/5"
  >
    <template v-if="status === 'pending'">
      <span
        class="mx-auto grid size-12 place-items-center rounded-full bg-paper-3 text-ink-soft"
      >
        <span
          class="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      </span>
      <h1 class="mt-4 text-xl font-bold text-ink">
        {{ $t('auth.verifyEmail.pendingTitle') }}
      </h1>
    </template>

    <template v-else-if="status === 'ok'">
      <span
        class="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600"
      >
        <AppIcon name="check" class="size-6" />
      </span>
      <h1 class="mt-4 text-xl font-bold text-ink">
        {{ $t('auth.verifyEmail.successTitle') }}
      </h1>
      <p class="mt-2 text-sm text-ink-soft">
        {{
          user?.email
            ? $t('auth.verifyEmail.successWithEmail', { email: user.email })
            : $t('auth.verifyEmail.successGeneric')
        }}
      </p>
      <BaseButton to="/app" variant="primary" size="md" class="mt-5">
        {{ $t('auth.verifyEmail.goToDashboard') }}
      </BaseButton>
    </template>

    <template v-else>
      <span
        class="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600"
      >
        <AppIcon name="x" class="size-6" />
      </span>
      <h1 class="mt-4 text-xl font-bold text-ink">
        {{ $t('auth.verifyEmail.errorTitle') }}
      </h1>
      <p class="mt-2 text-sm text-ink-soft">{{ errorMsg }}</p>
      <BaseButton to="/app" variant="outline" size="md" class="mt-5">
        {{ $t('auth.verifyEmail.goToDashboard') }}
      </BaseButton>
    </template>
  </div>
</template>
