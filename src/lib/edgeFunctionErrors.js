const EDGE_FUNCTION_SKIP_TTL_MS = 5 * 60 * 1000

function getEdgeFunctionStorageKey(functionName) {
  return `macromedica:edge-function-unavailable:${functionName}`
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && Boolean(window.sessionStorage)
}

export function isEdgeFunctionTemporarilyUnavailable(functionName) {
  if (!functionName || !canUseSessionStorage()) return false

  const rawValue = window.sessionStorage.getItem(getEdgeFunctionStorageKey(functionName))
  if (!rawValue) return false

  const expiresAt = Number(rawValue)
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    window.sessionStorage.removeItem(getEdgeFunctionStorageKey(functionName))
    return false
  }

  return true
}

export function markEdgeFunctionUnavailable(functionName) {
  if (!functionName || !canUseSessionStorage()) return
  window.sessionStorage.setItem(
    getEdgeFunctionStorageKey(functionName),
    String(Date.now() + EDGE_FUNCTION_SKIP_TTL_MS),
  )
}

export function clearEdgeFunctionUnavailable(functionName) {
  if (!functionName || !canUseSessionStorage()) return
  window.sessionStorage.removeItem(getEdgeFunctionStorageKey(functionName))
}

export function describeEdgeFunctionError(error, functionName) {
  const rawMessage = error?.message || String(error || '')

  if (/Failed to send a request to the Edge Function|ERR_FAILED|Failed to fetch/i.test(rawMessage)) {
    return `La fonction IA "${functionName}" est inaccessible depuis le navigateur. Verifiez son deploiement Supabase et les regles CORS.`
  }

  if (/CORS|preflight/i.test(rawMessage)) {
    return `La fonction IA "${functionName}" bloque actuellement les appels depuis cette URL. Verifiez le deploiement et la configuration CORS sur Supabase.`
  }

  return rawMessage || `La fonction IA "${functionName}" a renvoye une erreur.`
}
