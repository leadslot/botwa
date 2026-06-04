import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const PREFIX = 'enc:v1:'

function getKey() {
  const raw = process.env.DATA_ENCRYPTION_KEY?.trim()
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATA_ENCRYPTION_KEY missing')
    }
    return createHash('sha256').update('responbot-local-dev-key').digest()
  }

  if (/^[a-f0-9]{64}$/i.test(raw)) return Buffer.from(raw, 'hex')

  const base64 = Buffer.from(raw, 'base64')
  if (base64.length === 32) return base64

  return createHash('sha256').update(raw).digest()
}

export function encryptSecret(value?: string | null) {
  if (!value) return value ?? null
  if (value.startsWith(PREFIX)) return value

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    PREFIX.slice(0, -1),
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':')
}

export function decryptSecret(value?: string | null) {
  if (!value) return value ?? null
  if (!value.startsWith(PREFIX)) return value

  const [, , ivRaw, tagRaw, encryptedRaw] = value.split(':')
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error('Invalid encrypted secret')

  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivRaw, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

export function decryptMetadataSecrets<T extends Record<string, unknown>>(metadata: T, keys: string[]) {
  const next = { ...metadata }
  for (const key of keys) {
    const value = next[key]
    if (typeof value === 'string') next[key as keyof T] = decryptSecret(value) as T[keyof T]
  }
  return next
}
