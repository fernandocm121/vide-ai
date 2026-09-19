import { useToast } from 'primevue/usetoast'

/**
 * Wrapper fino sobre o Toast do PrimeVue — mensagens de aviso/erro/sucesso
 * transitórias (somem sozinhas), no lugar de texto fixo na tela.
 */
export function useNotify() {
  const toast = useToast()

  function success(detail: string, summary = 'Sucesso') {
    toast.add({ severity: 'success', summary, detail, life: 3500 })
  }

  function error(detail: string, summary = 'Erro') {
    toast.add({ severity: 'error', summary, detail, life: 4500 })
  }

  function info(detail: string, summary = 'Aviso') {
    toast.add({ severity: 'info', summary, detail, life: 3500 })
  }

  function warn(detail: string, summary = 'Atenção') {
    toast.add({ severity: 'warn', summary, detail, life: 4000 })
  }

  return { success, error, info, warn }
}
