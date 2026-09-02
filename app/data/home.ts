export interface Step {
  id: string
  title: string
  desc: string
  icon: string
}

export const steps: Step[] = [
  {
    id: '01',
    title: 'Upload',
    desc: 'Envie MP4, MOV, MP3, WAV ou WEBM. O áudio é extraído com FFmpeg automaticamente.',
    icon: 'upload',
  },
  {
    id: '02',
    title: 'Understand',
    desc: 'Speech-to-Text gera a transcrição completa com timestamps precisos, palavra por palavra.',
    icon: 'brain',
  },
  {
    id: '03',
    title: 'Extract',
    desc: 'A IA analisa o conteúdo e extrai resumo, capítulos, palavras-chave e melhores momentos.',
    icon: 'layers',
  },
  {
    id: '04',
    title: 'Create',
    desc: 'Gere títulos, descrições, roteiros de Shorts e cortes prontos para publicar.',
    icon: 'sparkles',
  },
]

export interface Audience {
  tag: string
  title: string
  desc: string
  icon: string
}

export const audiences: Audience[] = [
  {
    tag: 'YouTubers',
    title: 'Transforme vídeos longos em conteúdo pronto',
    desc: 'Títulos, descrições, capítulos e cortes gerados automaticamente a partir de cada gravação.',
    icon: 'video',
  },
  {
    tag: 'Podcasters',
    title: 'Show notes, cortes e destaques',
    desc: 'Da conversa de duas horas para show notes completas e os melhores trechos em minutos.',
    icon: 'mic',
  },
  {
    tag: 'Professores',
    title: 'Aulas viram material de estudo',
    desc: 'Resumo, tópicos e material de apoio gerados direto da gravação da aula.',
    icon: 'book',
  },
]

export interface Plan {
  name: string
  price: string
  period: string
  tagline: string
  features: string[]
  highlight?: boolean
  cta: string
}

export const plans: Plan[] = [
  {
    name: 'Starter',
    price: 'R$49',
    period: '/mês',
    tagline: 'Para criadores pequenos começando a escalar.',
    features: [
      '10 horas de processamento por mês',
      'Transcrição automática + timestamps',
      'Legendas SRT / VTT',
      'Resumo e capítulos',
      'Exportação TXT / SRT',
    ],
    cta: 'Começar',
  },
  {
    name: 'Pro',
    price: 'R$149',
    period: '/mês',
    tagline: 'Para criadores profissionais que publicam toda semana.',
    highlight: true,
    features: [
      '40 horas de processamento por mês',
      'Tudo do Starter',
      'Ask Your Video (pergunte ao seu vídeo)',
      'Busca entre todos os seus vídeos',
      'Sugestões de melhores momentos',
      'Geração de Shorts e roteiros',
      'Títulos e descrições otimizados',
    ],
    cta: 'Começar',
  },
  {
    name: 'Agency',
    price: 'R$399',
    period: '/mês',
    tagline: 'Para agências e equipes que gerenciam vários canais.',
    features: [
      '150 horas de processamento por mês',
      'Tudo do Pro',
      'Múltiplos membros de equipe',
      'Espaços de trabalho por cliente',
      'Suporte prioritário',
    ],
    cta: 'Falar com vendas',
  },
]
