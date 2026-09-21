// Texto (título, descrição, tagline, features, cta) vem de i18n/locales/*.json —
// aqui só ficam os campos estruturais (id, ícone, preço) usados para montar as
// chaves de tradução e a URL do plano (`/signup?plan=${plan.id}`).
export interface Step {
  id: string
  icon: string
}

export const steps: Step[] = [
  { id: '01', icon: 'upload' },
  { id: '02', icon: 'brain' },
  { id: '03', icon: 'layers' },
  { id: '04', icon: 'sparkles' },
]

export interface Audience {
  id: string
  icon: string
}

export const audiences: Audience[] = [
  { id: 'youtubers', icon: 'video' },
  { id: 'podcasters', icon: 'mic' },
  { id: 'teachers', icon: 'book' },
]

export interface Plan {
  id: string
  name: string
  price: string
  period: string
  highlight?: boolean
}

// `price`/`period` não são traduzidos por idioma — conversão de moeda é uma
// decisão de billing, fora do escopo desta issue (só UI).
export const plans: Plan[] = [
  { id: 'starter', name: 'Starter', price: 'R$49', period: '/mês' },
  { id: 'pro', name: 'Pro', price: 'R$149', period: '/mês', highlight: true },
  { id: 'agency', name: 'Agency', price: 'R$399', period: '/mês' },
]
