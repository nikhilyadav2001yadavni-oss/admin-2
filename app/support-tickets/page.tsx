'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Textarea } from '@/components/ui/Textarea'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { supportTicketAPI } from '@/lib/api'
import { createSupportTicketSocket } from '@/lib/supportSocket'
import { useAdminAuth } from '@/lib/useAdminAuth'
import { format } from 'date-fns'
import { Loader2, Lock, MessageSquare, Send, Wifi, WifiOff, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED'

interface PopulatedUser {
  _id?: string
  name?: string
  email?: string
}

interface TicketRow {
  _id: string
  subject: string
  status: TicketStatus
  lastMessagePreview?: string
  updatedAt?: string
  userId?: PopulatedUser | string
  closedByEmail?: string
  closedByComment?: string
  closedAt?: string
}

interface ChatMessage {
  id: string
  ticketId: string
  senderType: 'USER' | 'SUPPORT'
  senderId: string
  body: string
  attachmentUrls: string[]
  createdAt: string
}

/** API / socket payloads may use `_id` or Date objects; normalize so React keys and merges work. */
function normalizeChatMessage(raw: unknown): ChatMessage | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = r.id ?? r._id
  if (id == null) return null
  const ticketId = r.ticketId ?? r.ticket_id
  if (ticketId == null) return null
  const created = r.createdAt
  const createdAt =
    typeof created === 'string'
      ? created
      : created instanceof Date
        ? created.toISOString()
        : typeof created === 'object' && created !== null && '$date' in (created as object)
          ? String((created as { $date: string }).$date)
          : new Date().toISOString()
  return {
    id: String(id),
    ticketId: String(ticketId),
    senderType: r.senderType === 'SUPPORT' || r.senderType === 'USER' ? r.senderType : 'USER',
    senderId: String(r.senderId ?? ''),
    body: typeof r.body === 'string' ? r.body : '',
    attachmentUrls: Array.isArray(r.attachmentUrls) ? (r.attachmentUrls as string[]) : [],
    createdAt,
  }
}

const OPTIMISTIC_ID_PREFIX = 'local-'

function newOptimisticId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${OPTIMISTIC_ID_PREFIX}${crypto.randomUUID()}`
  }
  return `${OPTIMISTIC_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function createOptimisticSupportMessage(
  ticketId: string,
  body: string,
  senderId: string
): ChatMessage {
  return {
    id: newOptimisticId(),
    ticketId: String(ticketId),
    senderType: 'SUPPORT',
    senderId,
    body,
    attachmentUrls: [],
    createdAt: new Date().toISOString(),
  }
}

/** Upsert a message into a sorted list, replacing any optimistic with matching body+senderType. */
function upsertMessage(messages: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  // Remove any optimistic duplicate (same body + senderType for this ticket)
  const cleaned = messages.filter((m) => {
    if (!m.id.startsWith(OPTIMISTIC_ID_PREFIX)) return true
    return !(
      String(m.ticketId) === String(incoming.ticketId) &&
      m.body === incoming.body &&
      m.senderType === incoming.senderType
    )
  })
  // Skip if server message already present
  if (cleaned.some((m) => m.id === incoming.id)) return cleaned
  return [...cleaned, incoming].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
}

function statusVariant(status: TicketStatus): 'info' | 'warning' | 'success' {
  if (status === 'OPEN') return 'info'
  if (status === 'IN_PROGRESS') return 'warning'
  return 'success'
}

function userLabel(ticket: TicketRow): string {
  const u = ticket.userId
  if (u && typeof u === 'object') {
    return u.name || u.email || 'User'
  }
  return 'User'
}

export default function SupportTicketsPage() {
  const { id: adminId, email: adminEmail } = useAdminAuth()
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [closing, setClosing] = useState(false)
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [closeComment, setCloseComment] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)
  const [socketError, setSocketError] = useState<string | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())
  /** Always use in socket handlers — avoids stale `selectedId` when effects/socket callbacks reorder. */
  const selectedIdRef = useRef<string | null>(null)
  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  const loadTickets = useCallback(() => {
    setListLoading(true)
    supportTicketAPI
      .list({
        page: 1,
        limit: 100,
        ...(statusFilter ? { status: statusFilter as TicketStatus } : {}),
      })
      .then((res) => {
        const data = res.data?.data
        setTickets(Array.isArray(data?.tickets) ? data.tickets : [])
      })
      .catch(() => setTickets([]))
      .finally(() => setListLoading(false))
  }, [statusFilter])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  const loadDetail = useCallback((ticketId: string) => {
    setDetailLoading(true)
    supportTicketAPI
      .getDetail(ticketId, { page: 1, limit: 200 })
      .then((res) => {
        const data = res.data?.data
        const t = data?.ticket
        if (t) {
          setSelectedTicket({
            _id: t._id,
            subject: t.subject,
            status: t.status,
            lastMessagePreview: t.lastMessagePreview,
            updatedAt: t.updatedAt,
            userId: t.userId,
            closedByEmail: t.closedByEmail,
            closedByComment: t.closedByComment,
            closedAt: t.closedAt,
          })
        }
        const rawList = Array.isArray(data?.messages) ? data.messages : []
        const apiMsgs: ChatMessage[] = rawList
          .map((m: unknown) => normalizeChatMessage(m))
          .filter((m: ChatMessage | null): m is ChatMessage => m != null)
          .sort(
            (a: ChatMessage, b: ChatMessage) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        seenIdsRef.current = new Set(apiMsgs.map((m) => m.id))
        setMessages(apiMsgs)
      })
      .catch(() => {
        setSelectedTicket(null)
        setMessages([])
        seenIdsRef.current = new Set()
      })
      .finally(() => setDetailLoading(false))
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!selectedId) {
      setSelectedTicket(null)
      setMessages([])
      seenIdsRef.current = new Set()
      return
    }
    // Only show the active ticket — avoids mixing threads and fixes merge races with Socket.IO.
    setMessages([])
    seenIdsRef.current = new Set()
    loadDetail(selectedId)
  }, [selectedId, loadDetail])

  useEffect(() => {
    if (typeof window === 'undefined' || !selectedId) {
      if (socketRef.current) {
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setSocketConnected(false)
      return
    }

    const token = localStorage.getItem('admin_token')
    if (!token) return

    const socket = createSupportTicketSocket(token)
    socketRef.current = socket
    setSocketError(null)

    const onConnect = () => {
      console.log('[socket] connected, id:', socket.id)
      setSocketConnected(true)
      const tid = selectedIdRef.current
      if (tid) {
        console.log('[socket] joining room for ticket:', tid)
        socket.emit('join_room', { ticketId: tid }, (ack: unknown) => {
          console.log('[socket] join_room ack:', ack)
        })
      }
    }

    const onDisconnect = () => setSocketConnected(false)

    const onReceive = (payload: unknown) => {
      console.log('[socket] receive_message', payload)
      const raw =
        payload && typeof payload === 'object' && 'message' in (payload as object) && (payload as { message?: unknown }).message
          ? (payload as { message: unknown }).message
          : payload
      const message = normalizeChatMessage(raw)
      if (!message) {
        console.warn('[socket] could not normalize message', raw)
        return
      }
      const active = selectedIdRef.current
      if (!active || String(message.ticketId) !== String(active)) return
      seenIdsRef.current.add(message.id)
      setMessages((prev) => upsertMessage(prev, message))
      setTickets((prev) =>
        prev.map((t) =>
          String(t._id) === String(active)
            ? {
                ...t,
                lastMessagePreview: message.body?.slice(0, 120),
                updatedAt: message.createdAt,
              }
            : t
        )
      )
    }

    const onTicketError = ({ message }: { message: string }) => {
      setSocketError(message || 'Socket error')
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('receive_message', onReceive)
    socket.on('ticket_error', onTicketError)
    socket.on('connect_error', (err: Error) => {
      setSocketConnected(false)
      setSocketError(err?.message || 'connect_error')
    })

    if (socket.connected) onConnect()

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('receive_message', onReceive)
      socket.off('ticket_error', onTicketError)
      socket.disconnect()
      if (socketRef.current === socket) socketRef.current = null
      setSocketConnected(false)
    }
  }, [selectedId])

  const handleCloseTicket = async () => {
    if (!selectedId || closing) return
    setClosing(true)
    const comment = closeComment.trim()
    try {
      const res = await supportTicketAPI.closeTicket(selectedId, comment)
      const t = res.data?.data?.ticket
      const closedInfo = {
        status: 'CLOSED' as TicketStatus,
        closedByEmail: t?.closedByEmail || adminEmail || '',
        closedByComment: t?.closedByComment || comment,
        closedAt: t?.closedAt || new Date().toISOString(),
      }
      setSelectedTicket((prev) => (prev ? { ...prev, ...closedInfo } : prev))
      setTickets((prev) =>
        prev.map((row) => (row._id === selectedId ? { ...row, ...closedInfo } : row))
      )
      setCloseModalOpen(false)
      setCloseComment('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to close ticket'
      setSocketError(msg)
    } finally {
      setClosing(false)
    }
  }

  const handleSend = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !selectedId) return

    setSocketError(null)
    const ticketId = selectedId
    const optimistic = createOptimisticSupportMessage(ticketId, text, String(adminId ?? ''))
    const optimisticId = optimistic.id

    setDraft('')
    setMessages((prev) => [...prev, optimistic])

    const s = socketRef.current

    if (s?.connected) {
      setSending(true)
      s.emit(
        'send_message',
        { text, attachmentUrls: [] },
        (ack: { ok?: boolean; message?: unknown } | undefined) => {
          console.log('[socket] send_message ack', ack)
          setSending(false)
          if (ack && ack.ok === false) {
            const errText = ack.message
            setSocketError(typeof errText === 'string' ? errText : 'Send failed')
            setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
            setDraft(text)
            return
          }
          // Replace optimistic with server message from ack
          const ackMsg = ack && typeof ack === 'object' && 'message' in ack ? (ack as { message?: unknown }).message : undefined
          const normalized = normalizeChatMessage(ackMsg)
          if (normalized) {
            seenIdsRef.current.add(normalized.id)
            setMessages((prev) => {
              const without = prev.filter((m) => m.id !== optimisticId)
              return upsertMessage(without, normalized)
            })
          }
        }
      )
      return
    }

    setSending(true)
    try {
      await supportTicketAPI.sendMessage(selectedId, text, [])
      const res = await supportTicketAPI.getDetail(selectedId, { page: 1, limit: 200 })
      const rawMsgs = res.data?.data?.messages ?? []
      const msgs: ChatMessage[] = rawMsgs
        .map((m: unknown) => normalizeChatMessage(m))
        .filter((m: ChatMessage | null): m is ChatMessage => m != null)
      seenIdsRef.current = new Set(msgs.map((m) => m.id))
      setMessages(msgs)
      const t = res.data?.data?.ticket
      if (t) {
        setSelectedTicket((prev) =>
          prev
            ? {
                ...prev,
                status: t.status,
                lastMessagePreview: t.lastMessagePreview,
                updatedAt: t.updatedAt,
              }
            : prev
        )
        setTickets((prev) =>
          prev.map((row) =>
            row._id === selectedId
              ? {
                  ...row,
                  status: t.status,
                  lastMessagePreview: t.lastMessagePreview,
                  updatedAt: t.updatedAt,
                }
              : row
          )
        )
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send'
      setSocketError(msg)
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      setDraft(text)
    } finally {
      setSending(false)
    }
  }

  return (
    <MainLayout>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-7 h-7 text-primary-600" />
          Support tickets
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-11rem)]">
        <Card className="lg:col-span-4 flex flex-col overflow-hidden">
          <CardBody className="flex flex-col flex-1 min-h-0 p-0">
            <div className="p-4 border-b border-gray-200 space-y-2">
              <label className="text-xs font-medium text-gray-500">Filter by status</label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div className="flex-1 overflow-y-auto">
              {listLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
              ) : tickets.length === 0 ? (
                <p className="text-center text-gray-500 py-12 text-sm">No tickets yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {tickets.map((t) => {
                    const active = selectedId === t._id
                    return (
                      <li key={t._id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(t._id)}
                          className={cn(
                            'w-full text-left px-4 py-3 transition-colors hover:bg-gray-50',
                            active && 'bg-primary-50 border-l-4 border-l-primary-600'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-gray-900 text-sm line-clamp-2">{t.subject}</span>
                            <Badge variant={statusVariant(t.status)} className="shrink-0">
                              {t.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{userLabel(t)}</p>
                          {t.lastMessagePreview ? (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{t.lastMessagePreview}</p>
                          ) : null}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-8 flex flex-col overflow-hidden">
          <CardBody className="flex flex-col flex-1 min-h-0 p-0">
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-8">
                Select a ticket to view the conversation.
              </div>
            ) : detailLoading && !selectedTicket ? (
              <div className="flex-1 flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedTicket?.subject}</h2>
                    <p className="text-xs text-gray-500">
                      {selectedTicket ? userLabel(selectedTicket) : ''}
                      {selectedTicket?.userId && typeof selectedTicket.userId === 'object' && selectedTicket.userId.email
                        ? ` · ${selectedTicket.userId.email}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedTicket ? (
                      <Badge variant={statusVariant(selectedTicket.status)}>
                        {selectedTicket.status.replace('_', ' ')}
                      </Badge>
                    ) : null}
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md',
                        socketConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {socketConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                      {socketConnected ? 'Live' : 'Offline'}
                    </span>
                    {selectedTicket && selectedTicket.status !== 'CLOSED' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCloseModalOpen(true)}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span className="ml-1">Close</span>
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/80">
                  {messages.map((m) => {
                    const fromSupport = m.senderType === 'SUPPORT'
                    const mine = fromSupport && adminId && m.senderId === adminId
                    return (
                      <div
                        key={m.id}
                        className={cn('flex', fromSupport ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className={cn(
                            'max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                            fromSupport
                              ? 'bg-primary-600 text-white rounded-br-md'
                              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
                          )}
                        >
                          <p className="text-[10px] opacity-80 mb-1">
                            {fromSupport ? (mine ? 'You (support)' : 'Support') : 'User'} ·{' '}
                            {m.createdAt
                              ? format(new Date(m.createdAt), 'MMM d, h:mm a')
                              : ''}
                          </p>
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          {m.attachmentUrls?.length ? (
                            <div className="mt-2 space-y-1">
                              {m.attachmentUrls.map((url) => (
                                <a
                                  key={url}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={cn(
                                    'text-xs underline block truncate',
                                    fromSupport ? 'text-primary-100' : 'text-primary-600'
                                  )}
                                >
                                  {url}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {socketError ? (
                  <div className="px-4 py-2 bg-amber-50 text-amber-900 text-xs border-t border-amber-100">
                    {socketError}
                  </div>
                ) : null}

                {selectedTicket?.status === 'CLOSED' ? (
                  <div className="px-4 py-3 border-t border-gray-200 bg-red-50">
                    <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-1">
                      <Lock className="w-4 h-4" />
                      Ticket closed
                      {selectedTicket.closedAt
                        ? ` on ${format(new Date(selectedTicket.closedAt), 'MMM d, yyyy · h:mm a')}`
                        : ''}
                    </div>
                    {selectedTicket.closedByEmail ? (
                      <p className="text-xs text-red-600">
                        Closed by: <span className="font-medium">{selectedTicket.closedByEmail}</span>
                      </p>
                    ) : null}
                    {selectedTicket.closedByComment ? (
                      <p className="text-xs text-red-600 mt-1">
                        Reason: <span className="italic">{selectedTicket.closedByComment}</span>
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <form onSubmit={handleSend} className="p-3 border-t border-gray-200 bg-white">
                    <div className="flex items-end gap-2">
                      <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            if (draft.trim() && !sending) handleSend(e)
                          }
                        }}
                        placeholder="Type a reply… (Enter to send, Shift+Enter for newline)"
                        rows={1}
                        className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                        disabled={sending}
                      />
                      <Button type="submit" disabled={sending || !draft.trim()} className="shrink-0">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span className="ml-1 hidden sm:inline">Send</span>
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        isOpen={closeModalOpen}
        onClose={() => { if (!closing) { setCloseModalOpen(false); setCloseComment('') } }}
        title="Close ticket"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to close this ticket? Please add a comment explaining the reason.
        </p>
        <Textarea
          value={closeComment}
          onChange={(e) => setCloseComment(e.target.value)}
          placeholder="Reason for closing this ticket…"
          rows={3}
          className="w-full"
          disabled={closing}
        />
        <ModalFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setCloseModalOpen(false); setCloseComment('') }}
            disabled={closing}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleCloseTicket}
            disabled={closing || !closeComment.trim()}
          >
            {closing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
            Close ticket
          </Button>
        </ModalFooter>
      </Modal>
    </MainLayout>
  )
}
