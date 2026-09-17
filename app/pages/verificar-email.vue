<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Confirmar e-mail', robots: 'noindex' })

const route = useRoute()
const { user, fetchUser } = useAuth()

const status = ref<'pending' | 'ok' | 'error'>('pending')
const errorMsg = ref('')

onMounted(async () => {
  const token = String(route.query.token ?? '')
  if (!token) {
    status.value = 'error'
    errorMsg.value = 'Link de confirmação inválido.'
    return
  }
  try {
    await $fetch('/api/auth/verify-email', { method: 'POST', body: { token } })
    await fetchUser()
    status.value = 'ok'
  } catch (err: unknown) {
    const data = (err as { data?: { statusMessage?: string } }).data
    errorMsg.value =
      data?.statusMessage ?? 'Não foi possível confirmar seu e-mail.'
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
      <h1 class="mt-4 text-xl font-bold text-ink">Confirmando seu e-mail…</h1>
    </template>

    <template v-else-if="status === 'ok'">
      <span
        class="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600"
      >
        <AppIcon name="check" class="size-6" />
      </span>
      <h1 class="mt-4 text-xl font-bold text-ink">E-mail confirmado</h1>
      <p class="mt-2 text-sm text-ink-soft">
        {{
          user?.email
            ? `${user.email} está confirmado.`
            : 'Sua conta está pronta.'
        }}
      </p>
      <BaseButton to="/app" variant="primary" size="md" class="mt-5">
        Ir para o painel
      </BaseButton>
    </template>

    <template v-else>
      <span
        class="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600"
      >
        <AppIcon name="x" class="size-6" />
      </span>
      <h1 class="mt-4 text-xl font-bold text-ink">
        Não foi possível confirmar
      </h1>
      <p class="mt-2 text-sm text-ink-soft">{{ errorMsg }}</p>
      <BaseButton to="/app" variant="outline" size="md" class="mt-5">
        Ir para o painel
      </BaseButton>
    </template>
  </div>
</template>
