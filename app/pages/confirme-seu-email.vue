<script setup lang="ts">
/**
 * Tela de espera pra quem já tem sessão mas ainda não confirmou o e-mail —
 * o middleware global (`app/middleware/auth.global.ts`) manda pra cá quem
 * tenta entrar em `/app/**` sem `emailVerifiedAt`.
 *
 * Redirecionamento automático: sem infra de tempo real (WebSocket/SSE) no
 * projeto, a estratégia é polling curto (5s) em `/api/auth/me` — suficiente
 * pra esse caso de uso, sem adicionar infra nova. Complementado por um
 * listener de `visibilitychange`: como o fluxo típico é abrir o e-mail numa
 * outra aba e voltar pra esta, isso pega a confirmação na hora em vez de
 * esperar o próximo tick do polling.
 */
definePageMeta({ layout: 'auth' })
const { t } = useI18n()
useSeoMeta({
  title: () => t('auth.confirmYourEmail.seoTitle'),
  robots: 'noindex',
})

const { user, fetchUser, logout } = useAuth()
const notify = useNotify()

const POLL_INTERVAL_MS = 5000
const COOLDOWN_SECONDS = 60

const resendPending = ref(false)
const cooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | undefined
let pollTimer: ReturnType<typeof setInterval> | undefined

function startCooldown() {
  cooldown.value = COOLDOWN_SECONDS
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0 && cooldownTimer) clearInterval(cooldownTimer)
  }, 1000)
}

async function resend() {
  resendPending.value = true
  try {
    await $fetch('/api/auth/resend-verification', { method: 'POST' })
    notify.success(t('auth.confirmYourEmail.resendSuccess'))
    startCooldown()
  } catch (err: unknown) {
    notify.error(apiErrorMessage(err, t('auth.confirmYourEmail.resendError')))
  } finally {
    resendPending.value = false
  }
}

async function checkVerified() {
  await fetchUser()
  if (user.value?.emailVerifiedAt) {
    await navigateTo('/app')
  }
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') checkVerified()
}

onMounted(() => {
  pollTimer = setInterval(checkVerified, POLL_INTERVAL_MS)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (cooldownTimer) clearInterval(cooldownTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div
    class="w-full max-w-md rounded-2xl border border-line bg-paper p-7 text-center shadow-xl shadow-ink/5"
  >
    <span
      class="mx-auto grid size-12 place-items-center rounded-full bg-blue-50 text-blue-600"
    >
      <AppIcon name="info" class="size-6" />
    </span>

    <h1 class="mt-4 text-xl font-bold text-ink">
      {{ $t('auth.confirmYourEmail.title') }}
    </h1>
    <i18n-t
      keypath="auth.confirmYourEmail.subtitle"
      tag="p"
      class="mt-2 text-sm leading-relaxed text-ink-soft"
    >
      <template #email>
        <span class="font-medium text-ink">{{ user?.email }}</span>
      </template>
    </i18n-t>

    <BaseButton
      variant="primary"
      size="md"
      class="mt-6 w-full"
      :loading="resendPending"
      :disabled="cooldown > 0"
      @click="resend"
    >
      {{
        cooldown > 0
          ? $t('auth.confirmYourEmail.resendCooldown', { seconds: cooldown })
          : $t('auth.confirmYourEmail.resend')
      }}
    </BaseButton>

    <button
      type="button"
      class="mt-4 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      @click="logout"
    >
      {{ $t('auth.confirmYourEmail.logoutAndUseOther') }}
    </button>
  </div>
</template>
