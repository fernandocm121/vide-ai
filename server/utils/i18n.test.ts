import { describe, expect, it } from 'vitest'
import { resolveLocale, translateEmail, translateError } from './i18n'

describe('translateError', () => {
  it('traduz uma chave conhecida no idioma pedido', () => {
    expect(translateError('en', 'auth.notAuthenticated')).toBe(
      'Not authenticated',
    )
    expect(translateError('pt-BR', 'auth.notAuthenticated')).toBe(
      'Não autenticado',
    )
  })

  it('interpola os parâmetros na mensagem', () => {
    expect(translateError('pt-BR', 'videos.fileTooLarge', { max: 25 })).toBe(
      'Arquivo acima do limite de 25 MB',
    )
    expect(translateError('en', 'videos.fileTooLarge', { max: 25 })).toBe(
      'File above the 25 MB limit',
    )
  })

  it('mantém o placeholder original se o parâmetro não for passado', () => {
    expect(translateError('pt-BR', 'videos.fileTooLarge')).toBe(
      'Arquivo acima do limite de {max} MB',
    )
  })

  it('cai no pt-BR quando o idioma não tem dicionário', () => {
    expect(translateError('fr-CA' as never, 'auth.notAuthenticated')).toBe(
      'Não autenticado',
    )
  })

  it('devolve a própria chave quando ela não existe em nenhum dicionário', () => {
    expect(translateError('en', 'chave.que.nao.existe')).toBe(
      'chave.que.nao.existe',
    )
    expect(translateError('pt-BR', 'chave.que.nao.existe')).toBe(
      'chave.que.nao.existe',
    )
  })
})

describe('resolveLocale', () => {
  it('usa o cookie quando ele é um idioma suportado', () => {
    expect(resolveLocale('en', undefined)).toBe('en')
    expect(resolveLocale('ja', 'pt-BR')).toBe('ja')
  })

  it('ignora cookie com valor não suportado e cai pro Accept-Language', () => {
    expect(resolveLocale('xx-YY', 'es')).toBe('es')
  })

  it('sem cookie, usa o idioma de maior prioridade do Accept-Language', () => {
    expect(resolveLocale(undefined, 'fr;q=0.5, de;q=0.9, es;q=0.1')).toBe('de')
  })

  it('casa uma variante regional pela língua base (en-GB -> en)', () => {
    expect(resolveLocale(undefined, 'en-GB,en;q=0.9')).toBe('en')
  })

  it('casa "pt" solto com "pt-BR" (único português suportado)', () => {
    expect(resolveLocale(undefined, 'pt,pt;q=0.9')).toBe('pt-BR')
  })

  it('cai em pt-BR quando não há cookie nem Accept-Language reconhecível', () => {
    expect(resolveLocale(undefined, undefined)).toBe('pt-BR')
    expect(resolveLocale(undefined, 'zz-ZZ')).toBe('pt-BR')
  })
})

describe('translateEmail', () => {
  it('traduz assunto e corpo de um template com interpolação de URL', () => {
    expect(translateEmail('pt-BR', 'passwordReset.subject')).toBe(
      'Redefinir senha — Vide AI',
    )
    expect(
      translateEmail('en', 'passwordReset.body', {
        url: 'https://videai.app/reset?token=abc',
      }),
    ).toContain('https://videai.app/reset?token=abc')
  })

  it('usa dicionário e chaves independentes do translateError (mesmo idioma, sem colisão)', () => {
    expect(translateEmail('ja', 'emailVerify.subject')).toBe(
      'メールアドレスの確認 — Vide AI',
    )
    // a mesma chave não existe no dicionário de erros
    expect(translateError('ja', 'emailVerify.subject')).toBe(
      'emailVerify.subject',
    )
  })

  it('tem uma variante de saudação com nome e outra sem', () => {
    expect(
      translateEmail('pt-BR', 'emailVerify.greetingWithName', {
        name: 'Ana',
      }),
    ).toBe('Olá, Ana! ')
    expect(translateEmail('pt-BR', 'emailVerify.greetingNoName')).toBe('Olá! ')
  })

  it('cai no pt-BR quando o idioma não tem dicionário de e-mail', () => {
    expect(translateEmail('fr-CA' as never, 'passwordReset.subject')).toBe(
      'Redefinir senha — Vide AI',
    )
  })
})
