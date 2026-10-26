'use client'

import { io, type Socket } from 'socket.io-client'
import { httpOriginFromApiV1Base, normalizeApiV1BaseUrl, resolveApiV1BaseUrl } from './apiBaseUrl'

function defaultBackendOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SOCKET_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_ORIGIN?.trim() ||
    process.env.BACKEND_API_ORIGIN?.trim() ||
    'http://127.0.0.1:3001'
  ).replace(/\/+$/, '')
}

/** Backend HTTP origin for Engine.IO (Node server, not the Next.js dev port). */
export function getSupportSocketOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SOCKET_ORIGIN?.trim()
  if (explicit) {
    return explicit.replace(/\/+$/, '')
  }
  const apiEnv = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (apiEnv) {
    return httpOriginFromApiV1Base(normalizeApiV1BaseUrl(apiEnv))
  }
  // No explicit API URL: REST goes through Next rewrites; Socket.IO must hit the API server directly.
  if (typeof window !== 'undefined') {
    return defaultBackendOrigin()
  }
  return defaultBackendOrigin()
}

export const SUPPORT_SOCKET_PATH = '/api/v1/support-tickets/socket.io'

export function createSupportTicketSocket(token: string): Socket {
  return io(getSupportSocketOrigin(), {
    path: SUPPORT_SOCKET_PATH,
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
  })
}
