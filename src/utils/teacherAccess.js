const TEACHER_ACCESS_KEY = 'truthgrid_teacher_access_v1'
const PBKDF2_ITERATIONS = 120_000

function toBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0))
}

function getCrypto() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error('Secure browser cryptography is unavailable. Open the app from localhost or its HTTPS address.')
  }
  return globalThis.crypto
}

async function deriveVerifier(passcode, salt) {
  const cryptoApi = getCrypto()
  const keyMaterial = await cryptoApi.subtle.importKey(
    'raw',
    new TextEncoder().encode(passcode),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  return cryptoApi.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    256
  )
}

export function hasTeacherPasscode() {
  try {
    return Boolean(localStorage.getItem(TEACHER_ACCESS_KEY))
  } catch {
    return false
  }
}

export async function setTeacherPasscode(passcode) {
  const cryptoApi = getCrypto()
  const salt = cryptoApi.getRandomValues(new Uint8Array(16))
  const verifier = await deriveVerifier(passcode, salt)
  localStorage.setItem(TEACHER_ACCESS_KEY, JSON.stringify({
    salt: toBase64(salt),
    verifier: toBase64(verifier),
    iterations: PBKDF2_ITERATIONS,
  }))
}

export async function verifyTeacherPasscode(passcode) {
  const stored = localStorage.getItem(TEACHER_ACCESS_KEY)
  if (!stored) return false
  const { salt, verifier, iterations } = JSON.parse(stored)
  const candidate = await deriveVerifier(passcode, fromBase64(salt))
  const actualBytes = new Uint8Array(candidate)
  const expectedBytes = fromBase64(verifier)
  if (actualBytes.length !== expectedBytes.length) return false
  let difference = 0
  for (let index = 0; index < actualBytes.length; index += 1) {
    difference |= actualBytes[index] ^ expectedBytes[index]
  }
  return difference === 0 && iterations === PBKDF2_ITERATIONS
}

export function clearTeacherPasscode() {
  localStorage.removeItem(TEACHER_ACCESS_KEY)
}