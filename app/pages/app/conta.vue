<script setup lang="ts">
definePageMeta({ layout: 'app' })
const { t } = useI18n()
useHead({ title: () => t('app.account.seoTitle') })

const { user, fetchUser } = useAuth()
const notify = useNotify()

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

async function saveProfile() {
  savingProfile.value = true
  try {
    await $fetch('/api/auth/profile', {
      method: 'PATCH',
      body: { name: name.value },
    })
    await fetchUser()
    notify.success(t('app.account.profileSaved'))
  } catch {
    notify.error(t('app.account.profileSaveError'))
  } finally {
    savingProfile.value = false
  }
}

/* ─── Trocar senha ──────────────────────────────────────────────── */
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const savingPassword = ref(false)
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const { isValid: newPasswordIsValid } = usePasswordStrength(newPassword)

async function changePassword() {
  if (!newPasswordIsValid.value) {
    notify.error(t('app.account.passwordInvalid'))
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    notify.error(t('app.account.passwordMismatch'))
    return
  }
  if (newPassword.value === currentPassword.value) {
    notify.error(t('app.account.passwordSameAsCurrent'))
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
    notify.success(t('app.account.passwordChanged'))
  } catch (err: unknown) {
    notify.error(apiErrorMessage(err, t('app.account.passwordChangeError')))
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">
        {{ $t('app.account.title') }}
      </h1>
      <p class="mt-1 text-sm text-ink-soft">{{ $t('app.account.subtitle') }}</p>
    </div>

    <section class="rounded-2xl border border-line bg-paper p-6">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-ink-soft">
        {{ $t('app.account.profileSection') }}
      </h2>

      <div class="mt-4 flex flex-col gap-4 sm:max-w-sm">
        <div class="flex flex-col gap-1.5">
          <label for="name" class="text-sm font-medium text-ink">{{
            $t('app.account.nameLabel')
          }}</label>
          <input
            id="name"
            v-model="name"
            type="text"
            class="h-11 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-ink">{{
            $t('app.account.emailLabel')
          }}</span>
          <div class="flex items-center gap-2">
            <span class="text-sm text-ink-soft">{{ user?.email }}</span>
            <span
              v-if="user?.emailVerifiedAt"
              class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600"
            >
              {{ $t('app.account.verified') }}
            </span>
            <span
              v-else
              class="rounded-full bg-paper-3 px-2 py-0.5 text-xs font-medium text-ink-soft"
            >
              {{ $t('app.account.notVerified') }}
            </span>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-ink">{{
            $t('app.account.planLabel')
          }}</span>
          <span class="text-sm text-ink-soft">
            {{ planLabels[user?.plan ?? 'free'] }}
          </span>
        </div>

        <BaseButton
          variant="primary"
          size="md"
          :loading="savingProfile"
          class="self-start"
          @click="saveProfile"
        >
          {{ $t('app.account.save') }}
        </BaseButton>
      </div>
    </section>

    <section class="rounded-2xl border border-line bg-paper p-6">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-ink-soft">
        {{ $t('app.account.changePasswordSection') }}
      </h2>

      <form
        class="mt-4 flex flex-col gap-4 sm:max-w-sm"
        @submit.prevent="changePassword"
      >
        <div class="flex flex-col gap-1.5">
          <label for="current" class="text-sm font-medium text-ink">{{
            $t('app.account.currentPasswordLabel')
          }}</label>
          <div class="relative">
            <input
              id="current"
              v-model="currentPassword"
              :type="showCurrentPassword ? 'text' : 'password'"
              required
              autocomplete="current-password"
              class="h-11 w-full rounded-lg border border-line bg-paper px-3 pr-10 text-sm text-ink outline-none transition-colors focus:border-brand-500"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-3 flex items-center text-ink-soft hover:text-ink"
              :aria-label="
                showCurrentPassword
                  ? $t('common.hidePassword')
                  : $t('common.showPassword')
              "
              @click="showCurrentPassword = !showCurrentPassword"
            >
              <AppIcon
                :name="showCurrentPassword ? 'eye' : 'eye-off'"
                class="size-4"
              />
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="new" class="text-sm font-medium text-ink">{{
            $t('app.account.newPasswordLabel')
          }}</label>
          <div class="relative">
            <input
              id="new"
              v-model="newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              required
              minlength="8"
              autocomplete="new-password"
              class="h-11 w-full rounded-lg border border-line bg-paper px-3 pr-10 text-sm text-ink outline-none transition-colors focus:border-brand-500"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-3 flex items-center text-ink-soft hover:text-ink"
              :aria-label="
                showNewPassword
                  ? $t('common.hidePassword')
                  : $t('common.showPassword')
              "
              @click="showNewPassword = !showNewPassword"
            >
              <AppIcon
                :name="showNewPassword ? 'eye' : 'eye-off'"
                class="size-4"
              />
            </button>
          </div>
          <PasswordStrengthMeter :password="newPassword" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="confirm" class="text-sm font-medium text-ink">{{
            $t('app.account.confirmNewPasswordLabel')
          }}</label>
          <div class="relative">
            <input
              id="confirm"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              required
              minlength="8"
              autocomplete="new-password"
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
          size="md"
          :loading="savingPassword"
          class="self-start"
        >
          {{ $t('app.account.changePassword') }}
        </BaseButton>
      </form>
    </section>
  </div>
</template>
