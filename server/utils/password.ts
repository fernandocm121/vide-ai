import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

/**
 * Hash de senha com scrypt (nativo do Node, sem dependência).
 * Formato armazenado: `scrypt$<salt hex>$<hash hex>`.
 * A Fase 2 (autenticação) consome estes helpers.
 */
const scryptAsync = promisify(scrypt)
const KEYLEN = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer
  return `scrypt$${salt}$${derived.toString('hex')}`
}

export async function verifyPassword(
  stored: string,
  password: string,
): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false

  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer
  const expected = Buffer.from(hash, 'hex')
  return expected.length === derived.length && timingSafeEqual(expected, derived)
}
