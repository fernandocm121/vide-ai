import PrimeVue from 'primevue/config'
import Toast from 'primevue/toast'
import ToastService from 'primevue/toastservice'

/**
 * Só usamos o PrimeVue pelo Toast (notificações). O resto da UI é
 * Tailwind + componentes próprios — não registramos o restante da lib.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(PrimeVue, { ripple: true })
  nuxtApp.vueApp.use(ToastService)
  nuxtApp.vueApp.component('Toast', Toast)
})
