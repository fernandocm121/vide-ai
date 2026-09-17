<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Esqueci minha senha', robots: 'noindex' })

const notify = useNotify()

const email = ref('')
const pending = ref(false)
const done = ref(false)
const devResetUrl = ref('')

async function submit() {
  pending.value = true
  try {
    const res = await $fetch<{ ok: boolean; devResetUrl?: string }>(
      '/api/auth/forgot-password',
      { method: 'POST', body: { email: email.value } },
    )
    devResetUrl.value = res.devResetUrl ?? ''
    done.value = true
  } catch (err: unknown) {
    notify.error(
      apiErrorMessage(err, 'Não foi possível enviar o e-mail. Tente de novo.'),
    )
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div
    class="w-full max-w-md rounded-2xl border border-line bg-paper p-7 shadow-xl shadow-ink/5"
  >
    <template v-if="!done">
      <span class="eyebrow">
        <span class="h-px w-6 bg-brand-500" />
        Redefinir senha
      </span>
      <h1
        class="mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight text-ink"
      >
        Esqueceu a senha?
      </h1>
      <p class="mt-2 text-sm leading-relaxed text-ink-soft">
        Informe seu e-mail e mandamos um link para você criar uma nova senha.
      </p>

      <form class="mt-6 flex flex-col gap-4" @submit.prevent="submit">
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

        <BaseButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="pending"
          block
        >
          Enviar link
        </BaseButton>

        <p class="text-center text-xs text-ink-soft">
          <NuxtLink to="/login" class="font-medium text-brand-600">
            Voltar para o login
          </NuxtLink>
        </p>
      </form>
    </template>

    <template v-else>
      <span
        class="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600"
      >
        <AppIcon name="check" class="size-6" />
      </span>
      <h1 class="mt-4 text-xl font-bold text-ink">Verifique seu e-mail</h1>
      <p class="mt-2 text-sm text-ink-soft">
        Enviamos um link para redefinir a senha para
        <span class="font-medium text-ink">{{ email }}</span
        >.
      </p>
      <p v-if="devResetUrl" class="mt-3 text-xs text-ink-soft">
        (dev, sem provedor de e-mail configurado)
        <NuxtLink :to="devResetUrl" class="font-medium text-brand-600">
          abrir link de redefinição
        </NuxtLink>
      </p>
      <BaseButton to="/login" variant="outline" size="md" class="mt-5">
        Voltar para o login
      </BaseButton>
    </template>
  </div>
</template>
