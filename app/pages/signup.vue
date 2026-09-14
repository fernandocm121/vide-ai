<script setup lang="ts">
const route = useRoute()
const { track, identify } = useAnalytics()

const plan = computed(() => {
  const p = String(route.query.plan ?? '').toLowerCase()
  return ['starter', 'pro', 'agency'].includes(p) ? p : null
})

useSeoMeta({
  title: 'Criar conta',
  description:
    'Crie sua conta no Vide AI e transforme seus vídeos em transcrição, conhecimento e conteúdo pronto para publicar.',
  robots: 'noindex', // página de conversão — fora do índice
})

const email = ref('')
const name = ref('')
const pending = ref(false)
const done = ref(false)
const errorMsg = ref('')

onMounted(() => {
  track('signup_view', { plan: plan.value })
})

async function submit() {
  errorMsg.value = ''
  pending.value = true
  try {
    await $fetch('/api/leads', {
      method: 'POST',
      body: {
        email: email.value,
        name: name.value || undefined,
        plan: plan.value,
      },
    })
    identify(email.value, { email: email.value, plan: plan.value })
    track('signup_requested', { plan: plan.value })
    done.value = true
  } catch (err: unknown) {
    const data = (err as { data?: { message?: string } }).data
    errorMsg.value =
      data?.message ??
      'Não foi possível registrar. Confira o e-mail e tente de novo.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="border-b border-line bg-paper-2">
    <div
      class="container-page grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24"
    >
      <div class="flex flex-col gap-6">
        <span class="eyebrow">
          <span class="h-px w-6 bg-brand-500" />
          {{ plan ? `Plano ${plan}` : 'Acesso antecipado' }}
        </span>
        <h1
          class="text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl"
        >
          Crie sua conta no <span class="text-brand-500">Vide AI</span>
        </h1>
        <p class="max-w-md text-lg leading-relaxed text-ink-soft">
          Estamos abrindo o acesso aos poucos. Deixe seu e-mail e você entra na
          próxima leva — sem cartão de crédito.
        </p>
        <ul class="flex flex-col gap-2">
          <li
            v-for="b in [
              'Transcrição com timestamps',
              'Capítulos, resumo e melhores momentos',
              'Pergunte ao seu vídeo',
            ]"
            :key="b"
            class="flex items-center gap-2 text-sm text-ink-soft"
          >
            <AppIcon name="check" class="size-4 text-brand-500" />
            {{ b }}
          </li>
        </ul>
      </div>

      <div
        class="rounded-2xl border border-line bg-paper p-7 shadow-xl shadow-ink/5"
      >
        <div
          v-if="done"
          class="flex flex-col items-center gap-3 py-8 text-center"
        >
          <span
            class="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600"
          >
            <AppIcon name="check" class="size-6" />
          </span>
          <h2 class="text-xl font-bold text-ink">Você está na lista</h2>
          <p class="max-w-xs text-sm text-ink-soft">
            Assim que sua vaga abrir, mandamos um e-mail para
            <span class="font-medium text-ink">{{ email }}</span> com o link de
            acesso.
          </p>
          <BaseButton to="/" variant="outline" size="md" class="mt-2">
            Voltar para a home
          </BaseButton>
        </div>

        <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
          <div class="flex flex-col gap-1.5">
            <label for="name" class="text-sm font-medium text-ink">Nome</label>
            <input
              id="name"
              v-model="name"
              type="text"
              autocomplete="name"
              placeholder="Como podemos te chamar?"
              class="h-11 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="email" class="text-sm font-medium text-ink"
              >E-mail</label
            >
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="voce@exemplo.com"
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
            Garantir meu acesso
            <AppIcon name="arrow-right" class="size-4" />
          </BaseButton>

          <p class="text-center text-xs text-ink-soft">
            Já tem conta?
            <NuxtLink to="/app" class="font-medium text-brand-600"
              >Entrar</NuxtLink
            >
          </p>
        </form>
      </div>
    </div>
  </section>
</template>
