import { useEnv } from './env'

export type PlanName = 'free' | 'starter' | 'pro' | 'agency'

/**
 * Limite de transcrição por plano, em segundos de áudio processado/mês.
 * Starter/Pro/Agency batem com o marketing em `app/data/home.ts`
 * (10h/40h/150h) — ainda sem cobrança real (Stripe, Fase 9), então hoje só
 * o plano `free` é de fato necessário; os outros já ficam prontos.
 */
export function planLimitSeconds(plan: PlanName): number {
  const limits: Record<PlanName, number> = {
    free: useEnv().FREE_PLAN_MONTHLY_SECONDS,
    starter: 10 * 3600,
    pro: 40 * 3600,
    agency: 150 * 3600,
  }
  return limits[plan]
}
