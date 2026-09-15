<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useSeoMeta({
  title: 'Criar conta',
  description:
    'Crie sua conta no Vide AI e transforme seus vídeos em transcrição, conhecimento e conteúdo pronto para publicar.',
  robots: 'noindex',
})

const { signup } = useAuth()
const { track, identify } = useAnalytics()

const name = ref('')
const email = ref('')
const password = ref('')
const acceptedTerms = ref(false)
const showPassword = ref(false)
const pending = ref(false)
const errorMsg = ref('')
const googleNotice = ref(false)

onMounted(() => {
  track('signup_view')
})

function onGoogleClick() {
  googleNotice.value = true
}

async function submit() {
  errorMsg.value = ''
  if (!acceptedTerms.value) {
    errorMsg.value =
      'É preciso concordar com os Termos de Uso e a Política de Privacidade.'
    return
  }
  pending.value = true
  try {
    await signup({
      name: name.value,
      email: email.value,
      password: password.value,
    })
    identify(email.value, { email: email.value, name: name.value })
    track('signup_completed')
    await navigateTo('/app')
  } catch (err: unknown) {
    const data = (err as { data?: { statusMessage?: string } }).data
    errorMsg.value =
      data?.statusMessage ?? 'Não foi possível criar sua conta. Tente de novo.'
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
      Comece gratuitamente
    </span>
    <h1
      class="mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight text-ink"
    >
      Crie sua conta
    </h1>
    <p class="mt-2 text-sm leading-relaxed text-ink-soft">
      Transcreva seu primeiro vídeo em minutos. Sem cartão de crédito.
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
      Login com Google ainda não está disponível — crie sua conta com e-mail e
      senha.
    </p>

    <div class="my-5 flex items-center gap-3">
      <span class="h-px flex-1 bg-line" />
      <span class="text-xs text-ink-soft">ou</span>
      <span class="h-px flex-1 bg-line" />
    </div>

    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <div class="flex flex-col gap-1.5">
        <label for="name" class="text-sm font-medium text-ink"
          >Nome completo</label
        >
        <input
          id="name"
          v-model="name"
          type="text"
          required
          autocomplete="name"
          placeholder="Seu nome"
          class="h-11 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500"
        />
      </div>

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
        <label for="password" class="text-sm font-medium text-ink">Senha</label>
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

      <label class="flex items-start gap-2 text-sm text-ink-soft">
        <input
          v-model="acceptedTerms"
          type="checkbox"
          class="mt-0.5 size-4 shrink-0 rounded border-line accent-brand-500"
        />
        <span>
          Concordo com os
          <a href="#" class="font-medium text-brand-600">Termos de Uso</a>
          e a
          <a href="#" class="font-medium text-brand-600"
            >Política de Privacidade</a
          >
        </span>
      </label>

      <p v-if="errorMsg" class="text-sm text-brand-600">{{ errorMsg }}</p>

      <BaseButton
        type="submit"
        variant="primary"
        size="lg"
        :loading="pending"
        block
      >
        Criar conta
        <AppIcon name="arrow-right" class="size-4" />
      </BaseButton>

      <p class="text-center text-xs text-ink-soft">
        Já tem uma conta?
        <NuxtLink to="/login" class="font-medium text-brand-600"
          >Entrar</NuxtLink
        >
      </p>
    </form>
  </div>
</template>
