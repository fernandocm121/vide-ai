<script setup lang="ts">
definePageMeta({ layout: 'auth' })
const { t } = useI18n()
useSeoMeta({ title: () => t('auth.login.seoTitle'), robots: 'noindex' })

const { login } = useAuth()
const { track } = useAnalytics()
const notify = useNotify()
const route = useRoute()
const { public: publicConfig } = useRuntimeConfig()

const email = ref('')
const password = ref('')
const remember = ref(true)
const showPassword = ref(false)
const pending = ref(false)

const redirectPath = computed(() => String(route.query.redirect ?? '/app'))
const googleAuthHref = computed(
  () => `/api/auth/google?redirect=${encodeURIComponent(redirectPath.value)}`,
)

const GOOGLE_ERRORS: Record<string, () => void> = {
  google_not_configured: () => notify.info(t('auth.login.googleNotConfigured')),
  google_cancelled: () => notify.info(t('auth.login.googleCancelled')),
  google_failed: () => notify.error(t('auth.login.googleFailed')),
}

onMounted(() => {
  const error = String(route.query.error ?? '')
  GOOGLE_ERRORS[error]?.()
})

function onGoogleClick(event: MouseEvent) {
  if (publicConfig.googleOauthEnabled) return
  event.preventDefault()
  GOOGLE_ERRORS.google_not_configured!()
}

async function submit() {
  pending.value = true
  try {
    await login(email.value, password.value, remember.value)
    track('login')
    const redirect = String(route.query.redirect ?? '/app')
    await navigateTo(redirect)
  } catch (err: unknown) {
    notify.error(apiErrorMessage(err, t('auth.login.genericError')))
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
      {{ $t('auth.login.eyebrow') }}
    </span>
    <h1
      class="mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight text-ink"
    >
      {{ $t('auth.login.title') }}
    </h1>
    <p class="mt-2 text-sm leading-relaxed text-ink-soft">
      {{ $t('auth.login.subtitle') }}
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
        <div class="flex items-center justify-between">
          <label for="password" class="text-sm font-medium text-ink">{{
            $t('auth.passwordLabel')
          }}</label>
          <NuxtLink
            to="/esqueci-senha"
            class="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            {{ $t('auth.login.forgotPassword') }}
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
      </div>

      <label class="flex items-center gap-2 text-sm text-ink-soft">
        <input
          v-model="remember"
          type="checkbox"
          class="size-4 rounded border-line accent-brand-500"
        />
        {{ $t('auth.login.remember') }}
      </label>

      <BaseButton
        type="submit"
        variant="primary"
        size="lg"
        :loading="pending"
        block
      >
        {{ $t('auth.login.submit') }}
        <AppIcon name="arrow-right" class="size-4" />
      </BaseButton>

      <p class="text-center text-xs text-ink-soft">
        {{ $t('auth.login.noAccount') }}
        <NuxtLink to="/signup" class="font-medium text-brand-600">
          {{ $t('auth.login.signupLink') }}
        </NuxtLink>
      </p>
    </form>
  </div>
</template>
