<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Redefinir senha', robots: 'noindex' })

const route = useRoute()
const { fetchUser } = useAuth()

const token = String(route.query.token ?? '')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const pending = ref(false)
const errorMsg = ref('')
const done = ref(false)

async function submit() {
  errorMsg.value = ''
  if (!token) {
    errorMsg.value = 'Link de redefinição inválido.'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'As senhas não coincidem.'
    return
  }
  pending.value = true
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token, password: password.value },
    })
    await fetchUser()
    done.value = true
  } catch (err: unknown) {
    const data = (err as { data?: { statusMessage?: string } }).data
    errorMsg.value =
      data?.statusMessage ?? 'Não foi possível redefinir sua senha.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div
    class="w-full max-w-md rounded-2xl border border-line bg-paper p-7 shadow-xl shadow-ink/5"
  >
    <template v-if="done">
      <span
        class="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600"
      >
        <AppIcon name="check" class="size-6" />
      </span>
      <h1 class="mt-4 text-xl font-bold text-ink">Senha redefinida</h1>
      <p class="mt-2 text-sm text-ink-soft">
        Você já está logado com a nova senha.
      </p>
      <BaseButton to="/app" variant="primary" size="md" class="mt-5">
        Ir para o painel
      </BaseButton>
    </template>

    <template v-else>
      <span class="eyebrow">
        <span class="h-px w-6 bg-brand-500" />
        Nova senha
      </span>
      <h1
        class="mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight text-ink"
      >
        Crie uma nova senha
      </h1>

      <form class="mt-6 flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col gap-1.5">
          <label for="password" class="text-sm font-medium text-ink"
            >Nova senha</label
          >
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              minlength="8"
              autocomplete="new-password"
              placeholder="Mínimo 8 caracteres"
              class="h-11 w-full rounded-lg border border-line bg-paper px-3 pr-20 text-sm text-ink outline-none transition-colors focus:border-brand-500"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-3 text-xs font-semibold uppercase tracking-wide text-ink-soft hover:text-ink"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="confirm" class="text-sm font-medium text-ink"
            >Confirmar senha</label
          >
          <input
            id="confirm"
            v-model="confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            required
            minlength="8"
            autocomplete="new-password"
            placeholder="Repita a senha"
            class="h-11 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500"
          />
        </div>

        <p v-if="errorMsg" class="text-sm text-brand-600">{{ errorMsg }}</p>

        <BaseButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="pending"
          block
        >
          Redefinir senha
        </BaseButton>
      </form>
    </template>
  </div>
</template>
