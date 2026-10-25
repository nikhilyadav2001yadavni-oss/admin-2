'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Send, Loader2, Smartphone, Mail, BellRing } from 'lucide-react'
import { notificationAPI, userAPI } from '@/lib/api'
import { SearchWithButton } from '@/components/ui/SearchWithButton'

interface UserItem {
  _id: string
  name: string
  email: string
  phone?: string
  referralCode?: string
}

export default function NotificationsPage() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sendInApp, setSendInApp] = useState(true)
  const [sendEmail, setSendEmail] = useState(true)
  const [sendPush, setSendPush] = useState(true)
  const [sendToAll, setSendToAll] = useState(true)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [users, setUsers] = useState<UserItem[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(() => {
    setLoading(true)
    userAPI
      .getAll({ skip: 0, limit: 500 })
      .then((res) => {
        const data = res.data?.data
        setUsers(Array.isArray(data) ? data : [])
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filteredUsers = searchQuery.trim()
    ? users.filter(
        (u) =>
          u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.referralCode?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users

  const handleSearch = () => setSearchQuery(searchInput.trim())

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set())
    } else {
      setSelectedUserIds(new Set(filteredUsers.map((u) => u._id)))
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required')
      return
    }

    if (!sendInApp && !sendEmail && !sendPush) {
      setError('Select at least one option: In-app, Push or Email')
      return
    }

    let userIds: string[] = []
    if (sendToAll) {
      userIds = users.map((u) => u._id)
      if (userIds.length === 0) {
        setError('No users found to send notification to')
        return
      }
    } else {
      userIds = Array.from(selectedUserIds)
      if (userIds.length === 0) {
        setError('Please select at least one user')
        return
      }
    }

    setSending(true)
    try {
      const res = await notificationAPI.sendToUsers({
        userIds,
        title: title.trim(),
        message: message.trim(),
        sendInApp,
        sendEmail,
        sendPush,
      })
      const msg = res.data?.message || `Notification sent to ${userIds.length} user(s)`
      setSuccess(msg)
      setTitle('')
      setMessage('')
      setSelectedUserIds(new Set())
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Send Notifications</h1>
          <p className="text-gray-600 mt-1">Send in-app and/or email notifications to users</p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <Input
                  placeholder="Notification title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-0.5">{title.length}/100</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <Textarea
                  placeholder="Notification message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notification channels</label>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendInApp}
                      onChange={(e) => setSendInApp(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <Smartphone className="w-4 h-4 text-gray-500" />
                    <span>In-app notification</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendPush}
                      onChange={(e) => setSendPush(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <BellRing className="w-4 h-4 text-gray-500" />
                    <span>Push notification</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>Email notification</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">Select at least one. Push sends via Firebase to the user&apos;s device; In-app shows in the app; Email sends to user&apos;s email.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Send to</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sendTo"
                      checked={sendToAll}
                      onChange={() => setSendToAll(true)}
                      className="rounded-full border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>All users ({users.length})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sendTo"
                      checked={!sendToAll}
                      onChange={() => setSendToAll(false)}
                      className="rounded-full border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Selected users</span>
                  </label>
                </div>
              </div>

              {!sendToAll && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex flex-wrap items-center gap-3">
                    <SearchWithButton
                      value={searchInput}
                      onChange={setSearchInput}
                      onSearch={handleSearch}
                      placeholder="Search users..."
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectAll}
                      className="text-xs"
                    >
                      {selectedUserIds.size === filteredUsers.length ? 'Deselect all' : 'Select all'}
                    </Button>
                    <span className="text-xs text-gray-500">
                      {selectedUserIds.size} of {filteredUsers.length} selected
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">No users found</div>
                    ) : (
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10 py-2 px-2">{' '}</TableHead>
                            <TableHead className="py-2 px-2">Name</TableHead>
                            <TableHead className="py-2 px-2">Email</TableHead>
                            <TableHead className="py-2 px-2">Contact</TableHead>
                            <TableHead className="py-2 px-2">Referral Code</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((user) => (
                            <TableRow
                              key={user._id}
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => toggleUser(user._id)}
                            >
                              <TableCell className="py-2 px-2">
                                <input
                                  type="checkbox"
                                  checked={selectedUserIds.has(user._id)}
                                  onChange={() => toggleUser(user._id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                              </TableCell>
                              <TableCell className="py-2 px-2 font-medium">{user.name || '—'}</TableCell>
                              <TableCell className="py-2 px-2 truncate max-w-[12rem]" title={user.email}>
                                {user.email || '—'}
                              </TableCell>
                              <TableCell className="py-2 px-2">{user.phone || '—'}</TableCell>
                              <TableCell className="py-2 px-2">
                                <code className="text-xs bg-gray-100 px-1 rounded">{user.referralCode || '—'}</code>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                  <p className="text-sm text-danger-600">{error}</p>
                </div>
              )}
              {success && (
                <div className="p-3 bg-success-50 border border-success-200 rounded-lg">
                  <p className="text-sm text-success-700">{success}</p>
                </div>
              )}

              <Button type="submit" variant="primary" disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Notification
                  </>
                )}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </MainLayout>
  )
}
