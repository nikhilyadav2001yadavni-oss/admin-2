/**
 * Admin panel API base must end with `/api/v1` and must NOT include `/admin`
 * (paths already use `/admin/...`, `/support-tickets/...`, etc.).
 *
 * Wrong: http://localhost:3001  → would call /admin/... on host without /api/v1 → 404
 * Wrong: http://localhost:3001/api/v1/admin → double /admin/admin/... → 404
 * Right: http://localhost:3001/api/v1
 */

export function normalizeApiV1BaseUrl(input: string): string {
  let base = input.trim().replace(/\/+$/, '')
  if (/\/admin$/i.test(base)) {
    base = base.replace(/\/admin$/i, '')
  }
  if (!/\/api\/v1$/i.test(base)) {
    base = `${base}/api/v1`
  }
  return base
}

/**
 * Resolved base for axios (always .../api/v1).
 * - If NEXT_PUBLIC_API_URL is set: normalize it.
 * - Else in the browser: same origin + `/api/v1` (use Next rewrites to the real backend).
 * - Else on server: BACKEND_SSR_URL or localhost backend default.
 */
export function resolveApiV1BaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (env) {
    return normalizeApiV1BaseUrl(env)
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/v1`
  }
  return normalizeApiV1BaseUrl(process.env.BACKEND_SSR_URL || 'http://127.0.0.1:3001')
}

/** HTTP origin for Socket.IO (no /api/v1 path). */
export function httpOriginFromApiV1Base(apiV1Base: string): string {
  return apiV1Base.replace(/\/api\/v1$/i, '')
}
