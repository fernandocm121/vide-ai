import PrimeVue from 'primevue/config'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'
import Toast from 'primevue/toast'
import ToastService from 'primevue/toastservice'

/**
 * Só usamos o PrimeVue pelo Toast (notificações) e pelo TabView/TabPanel
 * (abas Texto corrido / Segmentado da transcrição). O resto da UI é
 * Tailwind + componentes próprios — não registramos o restante da lib.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(PrimeVue, { ripple: true })
  nuxtApp.vueApp.use(ToastService)
  nuxtApp.vueApp.component('Toast', Toast)
  nuxtApp.vueApp.component('TabView', TabView)
  nuxtApp.vueApp.component('TabPanel', TabPanel)
})
