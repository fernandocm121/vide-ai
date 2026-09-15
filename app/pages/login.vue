<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Entrar', robots: 'noindex' })

const { login } = useAuth()
const { track } = useAnalytics()
const route = useRoute()

const email = ref('')
const password = ref('')
const remember = ref(true)
const showPassword = ref(false)
const pending = ref(false)
const errorMsg = ref('')
const googleNotice = ref(false)

function onGoogleClick() {
  googleNotice.value = true
}

async function submit() {
  errorMsg.value = ''
  pending.value = true
  try {
    await login(email.value, password.value, remember.value)
    track('login')
    const redirect = String(route.query.redirect ?? '/app')
    await navigateTo(redirect)
  } catch (err: unknown) {
    const data = (err as { data?: { statusMessage?: string } }).data
    errorMsg.value =
      data?.statusMessage ?? 'Não foi possível entrar. Tente de novo.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div
    class="w-full max-w-md rounded-2xl border border-line bg-paper p-7 shadow-xl shadow-ink/5"
  >
    <span class="eyebrow">
      <span class="h-px w-6 bg-brand-500" />
      Bem-vindo de volta
    </span>
    <h1
      class="mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight text-ink"
    >
      Entrar na sua conta
    </h1>
    <p class="mt-2 text-sm leading-relaxed text-ink-soft">
      Acesse suas transcrições, resumos e cortes em um só lugar.
    </p>

    <button
      type="button"
      class="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-paper text-sm font-medium text-ink transition-colors hover:bg-paper-2"
      @click="onGoogleClick"
    >
      <IconGoogle />
      Continuar com Google
    </button>
    <p v-if="googleNotice" class="mt-2 text-xs text-ink-soft">
      Login com Google ainda não está disponível — entre com e-mail e senha.
    </p>

    <div class="my-5 flex items-center gap-3">
      <span class="h-px flex-1 bg-line" />
      <span class="text-xs text-ink-soft">ou</span>
      <span class="h-px flex-1 bg-line" />
    </div>

    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <div class="flex flex-col gap-1.5">
        <label for="email" class="text-sm font-medium text-ink">E-mail</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          placeholder="voce@empresa.com"
          class="h-11 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <label for="password" class="text-sm font-medium text-ink"
            >Senha</label
          >
          <NuxtLink
            to="/esqueci-senha"
            class="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Esqueceu a senha?
          </NuxtLink>
        </div>
        <div class="relative">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            autocomplete="current-password"
            placeholder="••••••••"
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

      <label class="flex items-center gap-2 text-sm text-ink-soft">
        <input
          v-model="remember"
          type="checkbox"
          class="size-4 rounded border-line accent-brand-500"
        />
        Manter conectado
      </label>

      <p v-if="errorMsg" class="text-sm text-brand-600">{{ errorMsg }}</p>

      <BaseButton
        type="submit"
        variant="primary"
        size="lg"
        :loading="pending"
        block
      >
        Entrar
        <AppIcon name="arrow-right" class="size-4" />
      </BaseButton>

      <p class="text-center text-xs text-ink-soft">
        Não tem uma conta?
        <NuxtLink to="/signup" class="font-medium text-brand-600">
          Comece gratuitamente
        </NuxtLink>
      </p>
    </form>
  </div>
</template>
