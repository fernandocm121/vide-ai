<script setup lang="ts">
definePageMeta({ layout: 'app' })
useHead({ title: 'Minha conta — Vide AI' })

const { user, fetchUser } = useAuth()

const planLabels: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency',
}

/* ─── Perfil ────────────────────────────────────────────────────── */
const name = ref(user.value?.name ?? '')
watch(user, (u) => (name.value = u?.name ?? ''), { immediate: true })

const savingProfile = ref(false)
const profileMsg = ref('')

async function saveProfile() {
  profileMsg.value = ''
  savingProfile.value = true
  try {
    await $fetch('/api/auth/profile', {
      method: 'PATCH',
      body: { name: name.value },
    })
    await fetchUser()
    profileMsg.value = 'Perfil atualizado.'
  } catch {
    profileMsg.value = 'Não foi possível salvar. Tente de novo.'
  } finally {
    savingProfile.value = false
  }
}

/* ─── Confirmação de e-mail ─────────────────────────────────────── */
const resendPending = ref(false)
const resendMsg = ref('')

async function resendVerification() {
  resendPending.value = true
  resendMsg.value = ''
  try {
    const res = await $fetch<{ ok: boolean; devVerifyUrl?: string }>(
      '/api/auth/resend-verification',
      { method: 'POST' },
    )
    resendMsg.value = res.devVerifyUrl
      ? `E-mail reenviado. (dev) ${res.devVerifyUrl}`
      : 'E-mail de confirmação reenviado.'
  } finally {
    resendPending.value = false
  }
}

/* ─── Trocar senha ──────────────────────────────────────────────── */
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const savingPassword = ref(false)
const passwordMsg = ref('')
const passwordError = ref('')

async function changePassword() {
  passwordMsg.value = ''
  passwordError.value = ''
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'As senhas não coincidem.'
    return
  }
  savingPassword.value = true
  try {
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      },
    })
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    passwordMsg.value = 'Senha alterada com sucesso.'
  } catch (err: unknown) {
    const data = (err as { data?: { statusMessage?: string } }).data
    passwordError.value =
      data?.statusMessage ?? 'Não foi possível trocar a senha.'
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">
        Minha conta
      </h1>
      <p class="mt-1 text-sm text-ink-soft">Perfil, plano e segurança.</p>
    </div>

    <section class="rounded-2xl border border-line bg-paper p-6">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-ink-soft">
        Perfil
      </h2>

      <div class="mt-4 flex flex-col gap-4 sm:max-w-sm">
        <div class="flex flex-col gap-1.5">
          <label for="name" class="text-sm font-medium text-ink">Nome</label>
          <input
            id="name"
            v-model="name"
            type="text"
            class="h-11 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-ink">E-mail</span>
          <div class="flex items-center gap-2">
            <span class="text-sm text-ink-soft">{{ user?.email }}</span>
            <span
              v-if="user?.emailVerifiedAt"
              class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600"
            >
              Verificado
            </span>
            <span
              v-else
              class="rounded-full bg-paper-3 px-2 py-0.5 text-xs font-medium text-ink-soft"
            >
              Não verificado
            </span>
          </div>
          <button
            v-if="!user?.emailVerifiedAt"
            type="button"
            class="mt-1 self-start text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
            :disabled="resendPending"
            @click="resendVerification"
          >
            Reenviar e-mail de confirmação
          </button>
          <p v-if="resendMsg" class="text-xs text-ink-soft">{{ resendMsg }}</p>
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-ink">Plano</span>
          <span class="text-sm text-ink-soft">
            {{ planLabels[user?.plan ?? 'free'] }}
          </span>
        </div>

        <p v-if="profileMsg" class="text-sm text-ink-soft">{{ profileMsg }}</p>

        <BaseButton
          variant="primary"
          size="md"
          :loading="savingProfile"
          class="self-start"
          @click="saveProfile"
        >
          Salvar
        </BaseButton>
      </div>
    </section>

    <section class="rounded-2xl border border-line bg-paper p-6">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-ink-soft">
        Trocar senha
      </h2>

      <form
        class="mt-4 flex flex-col gap-4 sm:max-w-sm"
        @submit.prevent="changePassword"
      >
        <div class="flex flex-col gap-1.5">
          <label for="current" class="text-sm font-medium text-ink"
            >Senha atual</label
          >
          <input
            id="current"
            v-model="currentPassword"
            type="password"
            required
            autocomplete="current-password"
            class="h-11 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="new" class="text-sm font-medium text-ink"
            >Nova senha</label
          >
          <input
            id="new"
            v-model="newPassword"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="h-11 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="confirm" class="text-sm font-medium text-ink"
            >Confirmar nova senha</label
          >
          <input
            id="confirm"
            v-model="confirmPassword"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="h-11 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500"
          />
        </div>

        <p v-if="passwordError" class="text-sm text-brand-600">
          {{ passwordError }}
        </p>
        <p v-if="passwordMsg" class="text-sm text-ink-soft">
          {{ passwordMsg }}
        </p>

        <BaseButton
          type="submit"
          variant="primary"
          size="md"
          :loading="savingPassword"
          class="self-start"
        >
          Trocar senha
        </BaseButton>
      </form>
    </section>
  </div>
</template>
