<script setup lang="ts">
/**
 * Skin visual do <Toast> do PrimeVue (v3) — a API de `useNotify()`/`toast.add()`
 * não muda em nada, só a aparência.
 *
 * O tema padrão do PrimeVue estiliza `.p-toast-message`/`.p-toast-summary`/
 * etc. com seletores compostos (2 a 4 classes) que vencem qualquer utilitário
 * Tailwind isolado no cálculo de especificidade — por isso os overrides no
 * `pt` usam o modificador `!` (important) onde há choque real de propriedade.
 * Ícone, título e descrição são renderizados via slot `#message`, o jeito
 * oficial de assumir esse conteúdo por completo sem depender das classes
 * internas (`p-toast-summary`, `p-toast-detail`, `p-toast-message-icon`).
 */
type ToastSeverity = 'success' | 'error' | 'warn' | 'info'

const SEVERITY: Record<
  ToastSeverity,
  {
    icon: string
    iconBg: string
    iconColor: string
    title: string
    border: string
  }
> = {
  success: {
    icon: 'check',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: 'text-emerald-700',
    border: 'border-emerald-100',
  },
  error: {
    icon: 'x',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    title: 'text-red-700',
    border: 'border-red-100',
  },
  warn: {
    icon: 'alert-triangle',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    title: 'text-amber-700',
    border: 'border-amber-100',
  },
  info: {
    icon: 'info',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'text-blue-700',
    border: 'border-blue-100',
  },
}

function severityOf(severity: unknown) {
  return SEVERITY[severity as ToastSeverity] ?? SEVERITY.info
}

const pt = {
  root: {
    class: '!w-[calc(100vw-2rem)] !max-w-[calc(100vw-2rem)] sm:!w-[400px]',
  },
  container: ({ props }: { props: { message: { severity?: string } } }) => ({
    class: [
      '!m-0 !mb-3 !overflow-hidden !rounded-2xl !border !bg-white !shadow-lg !backdrop-blur-none',
      severityOf(props.message.severity).border,
    ],
  }),
  content: {
    class:
      '!flex !items-start !gap-3 !border-0 !bg-transparent !p-0 !px-5 !py-4',
  },
  closeButton: {
    class:
      '!m-0 !size-7 !shrink-0 !rounded-full !bg-transparent !text-gray-400 !ring-0 transition-colors hover:!bg-black/5 hover:!text-gray-600 focus-visible:!outline-none',
  },
  closeIcon: {
    class: '!size-4',
  },
}
</script>

<template>
  <Toast position="top-center" :pt="pt">
    <template #message="{ message }">
      <div class="flex min-w-0 flex-1 items-center gap-3.5">
        <span
          class="grid size-10 shrink-0 place-items-center rounded-full"
          :class="severityOf(message.severity).iconBg"
        >
          <AppIcon
            :name="severityOf(message.severity).icon"
            :stroke="2"
            class="size-5"
            :class="severityOf(message.severity).iconColor"
          />
        </span>
        <div class="min-w-0 flex-1">
          <p
            class="text-base font-semibold"
            :class="severityOf(message.severity).title"
          >
            {{ message.summary }}
          </p>
          <p
            v-if="message.detail"
            class="mt-1 break-words text-sm leading-relaxed text-ink-soft"
          >
            {{ message.detail }}
          </p>
        </div>
      </div>
    </template>
  </Toast>
</template>
