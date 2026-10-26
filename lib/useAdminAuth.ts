'use client'

import { useMemo } from 'react'

interface AdminAuthInfo {
  id: string | null
  email: string | null
  role: string | null
  permissions: string[]
  isSuperAdmin: boolean
  hasPermission: (permission: string) => boolean
}

function decodeJwt(token: string): Record<string, any> | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('admin_token') ?? null
}

export function useAdminAuth(): AdminAuthInfo {
  return useMemo(() => {
    const token = getAdminToken()
    if (!token) {
      return { id: null, email: null, role: null, permissions: [], isSuperAdmin: false, hasPermission: () => false }
    }

    const payload = decodeJwt(token)
    if (!payload) {
      return { id: null, email: null, role: null, permissions: [], isSuperAdmin: false, hasPermission: () => false }
    }

    const role: string = payload.role ?? ''
    const permissions: string[] = Array.isArray(payload.permissions) ? payload.permissions : []
    // Legacy 'admin' role treated as superadmin for backward compat
    const isSuperAdmin = role === 'superadmin' || role === 'admin'

    return {
      id: payload.id ?? payload._id ?? null,
      email: payload.email ?? null,
      role,
      permissions,
      isSuperAdmin,
      hasPermission: (permission: string) => isSuperAdmin || permissions.includes(permission),
    }
  }, [])
}
