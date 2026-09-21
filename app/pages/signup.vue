<script setup lang="ts">
definePageMeta({ layout: 'auth' })
const { t } = useI18n()
useSeoMeta({
  title: () => t('auth.signup.seoTitle'),
  description: () => t('auth.signup.seoDescription'),
  robots: 'noindex',
})

const { signup } = useAuth()
const { track, identify } = useAnalytics()
const notify = useNotify()
const { public: publicConfig } = useRuntimeConfig()

const name = ref('')
const email = ref('')
const password = ref('')
const acceptedTerms = ref(false)
const showPassword = ref(false)
const pending = ref(false)
const { isValid: passwordIsValid } = usePasswordStrength(password)

const googleAuthHref = '/api/auth/google?redirect=' + encodeURIComponent('/app')

onMounted(() => {
  track('signup_view')
})

function onGoogleClick(event: MouseEvent) {
  if (publicConfig.googleOauthEnabled) return
  event.preventDefault()
  notify.info(t('auth.signup.googleNotConfigured'))
}

async function submit() {
  if (!passwordIsValid.value) {
    notify.error(t('auth.signup.passwordInvalid'))
    return
  }
  if (!acceptedTerms.value) {
    notify.error(t('auth.signup.termsRequired'))
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
    await navigateTo('/confirme-seu-email')
  } catch (err: unknown) {
    notify.error(apiErrorMessage(err, t('auth.signup.genericError')))
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
      {{ $t('auth.signup.eyebrow') }}
    </span>
    <h1
      class="mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight text-ink"
    >
      {{ $t('auth.signup.title') }}
    </h1>
    <p class="mt-2 text-sm leading-relaxed text-ink-soft">
      {{ $t('auth.signup.subtitle') }}
    </p>

    <a
      :href="googleAuthHref"
      class="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-paper text-sm font-medium text-ink transition-colors hover:bg-paper-2"
      @click="onGoogleClick"
    >
      <IconGoogle />
      {{ $t('auth.continueWithGoogle') }}
    </a>

    <div class="my-5 flex items-center gap-3">
      <span class="h-px flex-1 bg-line" />
      <span class="text-xs text-ink-soft">{{ $t('common.or') }}</span>
      <span class="h-px flex-1 bg-line" />
    </div>

    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <div class="flex flex-col gap-1.5">
        <label for="name" class="text-sm font-medium text-ink">{{
          $t('auth.signup.nameLabel')
        }}</label>
        <input
          id="name"
          v-model="name"
          type="text"
          required
          autocomplete="name"
          :placeholder="$t('auth.signup.namePlaceholder')"
          class="h-11 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="email" class="text-sm font-medium text-ink">{{
          $t('auth.emailLabel')
        }}</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          :placeholder="$t('auth.emailPlaceholder')"
          class="h-11 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="password" class="text-sm font-medium text-ink">{{
          $t('auth.passwordLabel')
        }}</label>
        <div class="relative">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            minlength="8"
            autocomplete="new-password"
            :placeholder="$t('auth.signup.passwordPlaceholder')"
            class="h-11 w-full rounded-lg border border-line bg-paper px-3 pr-10 text-sm text-ink outline-none transition-colors focus:border-brand-500"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-3 flex items-center text-ink-soft hover:text-ink"
            :aria-label="
              showPassword
                ? $t('common.hidePassword')
                : $t('common.showPassword')
            "
            @click="showPassword = !showPassword"
          >
            <AppIcon :name="showPassword ? 'eye' : 'eye-off'" class="size-4" />
          </button>
        </div>
        <PasswordStrengthMeter :password="password" />
      </div>

      <label class="flex items-start gap-2 text-sm text-ink-soft">
        <input
          v-model="acceptedTerms"
          type="checkbox"
          class="mt-0.5 size-4 shrink-0 rounded border-line accent-brand-500"
        />
        <span>
          {{ $t('auth.signup.termsPrefix') }}
          <a href="#" class="font-medium text-brand-600">{{
            $t('auth.signup.termsLink')
          }}</a>
          {{ $t('auth.signup.termsAnd') }}
          <a href="#" class="font-medium text-brand-600">{{
            $t('auth.signup.privacyLink')
          }}</a>
        </span>
      </label>

      <BaseButton
        type="submit"
        variant="primary"
        size="lg"
        :loading="pending"
        block
      >
        {{ $t('auth.signup.submit') }}
        <AppIcon name="arrow-right" class="size-4" />
      </BaseButton>

      <p class="text-center text-xs text-ink-soft">
        {{ $t('auth.signup.hasAccount') }}
        <NuxtLink to="/login" class="font-medium text-brand-600">{{
          $t('auth.signup.loginLink')
        }}</NuxtLink>
      </p>
    </form>
  </div>
</template>
