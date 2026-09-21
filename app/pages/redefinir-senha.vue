<script setup lang="ts">
definePageMeta({ layout: 'auth' })
const { t } = useI18n()
useSeoMeta({ title: () => t('auth.resetPassword.seoTitle'), robots: 'noindex' })

const route = useRoute()
const { fetchUser } = useAuth()
const notify = useNotify()

const token = String(route.query.token ?? '')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const pending = ref(false)
const done = ref(false)
const { isValid: passwordIsValid } = usePasswordStrength(password)

async function submit() {
  if (!token) {
    notify.error(t('auth.resetPassword.invalidToken'))
    return
  }
  if (!passwordIsValid.value) {
    notify.error(t('auth.resetPassword.passwordInvalid'))
    return
  }
  if (password.value !== confirmPassword.value) {
    notify.error(t('auth.resetPassword.passwordMismatch'))
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
    notify.error(apiErrorMessage(err, t('auth.resetPassword.genericError')))
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
      <h1 class="mt-4 text-xl font-bold text-ink">
        {{ $t('auth.resetPassword.doneTitle') }}
      </h1>
      <p class="mt-2 text-sm text-ink-soft">
        {{ $t('auth.resetPassword.doneSubtitle') }}
      </p>
      <BaseButton to="/app" variant="primary" size="md" class="mt-5">
        {{ $t('auth.resetPassword.goToDashboard') }}
      </BaseButton>
    </template>

    <template v-else>
      <span class="eyebrow">
        <span class="h-px w-6 bg-brand-500" />
        {{ $t('auth.resetPassword.eyebrow') }}
      </span>
      <h1
        class="mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight text-ink"
      >
        {{ $t('auth.resetPassword.title') }}
      </h1>

      <form class="mt-6 flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col gap-1.5">
          <label for="password" class="text-sm font-medium text-ink">{{
            $t('auth.resetPassword.newPasswordLabel')
          }}</label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              minlength="8"
              autocomplete="new-password"
              :placeholder="$t('auth.resetPassword.passwordPlaceholder')"
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
              <AppIcon
                :name="showPassword ? 'eye' : 'eye-off'"
                class="size-4"
              />
            </button>
          </div>
          <PasswordStrengthMeter :password="password" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="confirm" class="text-sm font-medium text-ink">{{
            $t('auth.resetPassword.confirmLabel')
          }}</label>
          <div class="relative">
            <input
              id="confirm"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              required
              minlength="8"
              autocomplete="new-password"
              :placeholder="$t('auth.resetPassword.confirmPlaceholder')"
              class="h-11 w-full rounded-lg border border-line bg-paper px-3 pr-10 text-sm text-ink outline-none transition-colors focus:border-brand-500"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-3 flex items-center text-ink-soft hover:text-ink"
              :aria-label="
                showConfirmPassword
                  ? $t('common.hidePassword')
                  : $t('common.showPassword')
              "
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <AppIcon
                :name="showConfirmPassword ? 'eye' : 'eye-off'"
                class="size-4"
              />
            </button>
          </div>
        </div>

        <BaseButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="pending"
          block
        >
          {{ $t('auth.resetPassword.submit') }}
        </BaseButton>
      </form>
    </template>
  </div>
</template>
