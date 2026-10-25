'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Edit, Ban, CheckCircle, ChevronDown, ChevronUp, X, Eye, EyeOff } from 'lucide-react'
import { userAPI } from '@/lib/api'
import type { User } from '@/types'
import { ExportDropdown } from '@/components/ExportDropdown'
import { SearchWithButton } from '@/components/ui/SearchWithButton'

interface WithdrawalLimit {
  enabled: boolean
  period: 'daily' | 'weekly' | 'monthly'
  amount: number
}

interface UserListItem {
  _id: string
  name: string
  email: string
  phone: string
  password?: string
  status: 'active' | 'suspended'
  walletBalance: number
  roiWallet?: number
  gamingWallet?: number
  referralCode: string
  joinedDate: string
  withdrawalLimit?: WithdrawalLimit | null
}


export default function UsersPage() {
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [users, setUsers] = useState<UserListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [skip, setSkip] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    referralCode: '',
  })
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', status: 'active' as 'active' | 'suspended', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [limitForm, setLimitForm] = useState<{ enabled: boolean; period: 'daily' | 'weekly' | 'monthly'; amount: string }>({ enabled: false, period: 'daily', amount: '' })
  const [limitLoading, setLimitLoading] = useState(false)
  const [limitError, setLimitError] = useState<string | null>(null)
  const [limitSuccess, setLimitSuccess] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'inactive' | 'noDeposits'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const hasActiveFilters = statusFilter !== 'all' || fromDate !== '' || toDate !== '' || searchQuery !== ''

  const fetchUsers = useCallback(() => {
    setLoading(true)
    setError(null)
    const params: { skip: number; limit: number; status?: string; fromDate?: string; toDate?: string; search?: string } = { skip, limit: pageSize }
    if (statusFilter !== 'all') params.status = statusFilter
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    if (searchQuery) params.search = searchQuery
    userAPI
      .getAll(params)
      .then((res) => {
        const data = res.data?.data
        const totalCount = res.data?.total ?? 0
        setUsers(Array.isArray(data) ? data : [])
        setTotal(totalCount)
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load users')
        setUsers([])
      })
      .finally(() => setLoading(false))
  }, [skip, statusFilter, fromDate, toDate, pageSize, searchQuery])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    setSkip(0)
  }, [statusFilter, fromDate, toDate])

  const handleClearFilters = () => {
    setStatusFilter('all')
    setFromDate('')
    setToDate('')
    setSearchInput('')
    setSearchQuery('')
    setSkip(0)
  }

  const handleSearch = () => {
    setSearchQuery(searchInput.trim())
  }

  const searchFilteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.referralCode && u.referralCode.toLowerCase().includes(q))
    )
  }, [users, searchQuery])

  const handleEditUser = (user: UserListItem) => {
    setSelectedUser({
      ...user,
      createdAt: user.joinedDate,
      updatedAt: user.joinedDate,
    })
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      password: user.password || '',
    })
    setShowPassword(false)
    setLimitForm({
      enabled: user.withdrawalLimit?.enabled ?? false,
      period: user.withdrawalLimit?.period ?? 'daily',
      amount: user.withdrawalLimit?.amount != null ? String(user.withdrawalLimit.amount) : '',
    })
    setEditError(null)
    setLimitError(null)
    setLimitSuccess(false)
    setIsModalOpen(true)
  }

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setEditError(null)
    setEditLoading(true)
    const updateData: Record<string, string> = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        status: editForm.status,
      }
    if (editForm.password.trim()) {
        updateData.password = editForm.password.trim()
      }
    userAPI
      .update(selectedUser._id, updateData)
      .then(() => {
        setIsModalOpen(false)
        fetchUsers()
      })
      .catch((err) => {
        setEditError(err.response?.data?.message || 'Failed to update user')
      })
      .finally(() => setEditLoading(false))
  }

  const handleLimitSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setLimitError(null)
    setLimitSuccess(false)
    setLimitLoading(true)
    userAPI
      .setWithdrawalLimit(selectedUser._id, {
        enabled: limitForm.enabled,
        period: limitForm.period,
        amount: limitForm.amount === '' ? 0 : Number(limitForm.amount),
      })
      .then(() => {
        setLimitSuccess(true)
        fetchUsers()
      })
      .catch((err: any) => {
        setLimitError(err.response?.data?.message || 'Failed to update withdrawal limit')
      })
      .finally(() => setLimitLoading(false))
  }

  const handleStatusChange = (userId: string, newStatus: 'active' | 'suspended') => {
    setStatusUpdatingId(userId)
    userAPI
      .updateStatus(userId, newStatus)
      .then(() => {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, status: newStatus } : u))
        )
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Failed to update status'
        alert(msg)
      })
      .finally(() => setStatusUpdatingId(null))
  }

  const handleAddUserOpen = () => {
    setNewUserForm({ name: '', email: '', phone: '', password: '', referralCode: '' })
    setCreateError(null)
    setIsAddModalOpen(true)
  }

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    setCreateLoading(true)
    userAPI
      .create({
        name: newUserForm.name.trim(),
        email: newUserForm.email.trim(),
        phone: newUserForm.phone.trim(),
        password: newUserForm.password,
        referralCode: newUserForm.referralCode.trim() || undefined,
      })
      .then(() => {
        setIsAddModalOpen(false)
        fetchUsers()
      })
      .catch((err) => {
        setCreateError(err.response?.data?.message || 'Failed to create user')
      })
      .finally(() => setCreateLoading(false))
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage all registered users</p>
          </div>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddUserOpen}>
            Add New User
          </Button>
        </div>

        {/* Filters - single row on desktop; on mobile search + "More filters" then expandable row */}
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-end gap-3 sm:gap-4">
              <SearchWithButton
                value={searchInput}
                onChange={setSearchInput}
                onSearch={handleSearch}
                placeholder="Search by name, email, or phone..."
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="sm:hidden w-full sm:w-auto"
                onClick={() => setFiltersExpanded((e) => !e)}
                rightIcon={filtersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              >
                {filtersExpanded ? 'Hide filters' : 'More filters'}
              </Button>
              <div className={`w-full ${filtersExpanded ? 'flex flex-col gap-3' : 'hidden'} sm:contents`}>
                <div className="w-full sm:w-44 shrink-0">
                  <label className="block text-xs text-gray-500 mb-0.5">Status</label>
                  <Select
                    options={[
                      { value: 'all', label: 'All Users' },
                      { value: 'active', label: 'Active' },
                      { value: 'suspended', label: 'Suspended' },
                      { value: 'inactive', label: 'Inactive (zero balance)' },
                      { value: 'noDeposits', label: 'No deposits' },
                    ]}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  />
                </div>
                <div className="w-full sm:w-36 shrink-0">
                  <label className="block text-xs text-gray-500 mb-0.5">From date</label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-36 shrink-0">
                  <label className="block text-xs text-gray-500 mb-0.5">To date</label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
                {hasActiveFilters && (
                  <div className="w-full sm:w-auto shrink-0 flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      leftIcon={<X className="w-3.5 h-3.5" />}
                      className="text-gray-500 hover:text-gray-700 whitespace-nowrap"
                    >
                      Clear filters
                    </Button>
                  </div>
                )}
                <ExportDropdown
                  reportType="users"
                  fetchData={async (p) => {
                    const res = await userAPI.getAll(p)
                    return { data: res.data?.data ?? res.data?.users ?? [] }
                  }}
                  columns={[
                    { key: 'name', label: 'Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'roiWallet', label: 'ROI Wallet' },
                    { key: 'gamingWallet', label: 'Gaming Wallet' },
                    { key: 'walletBalance', label: 'Total Balance' },
                    { key: 'referralCode', label: 'Referral Code' },
                    { key: 'status', label: 'Status' },
                    { key: 'joinedDate', label: 'Joined Date' },
                  ]}
                  params={{
                    search: searchQuery || undefined,
                    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
                    ...(fromDate ? { fromDate } : {}),
                    ...(toDate ? { toDate } : {}),
                  }}
                  label="Export"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Users Table */}
        <Card>
          <CardBody className="p-0">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
              </div>
            )}
            {error && (
              <div className="p-4 bg-danger-50 border-b border-danger-200">
                <p className="text-danger-600">{error}</p>
              </div>
            )}
            {!loading && (
              <div className="overflow-x-auto">
                <Table className="w-full min-w-[800px] text-xs sm:text-sm">
                  <colgroup>
                    <col className="w-[16%]" />
                    <col className="w-[10%]" />
                    <col className="w-[11%]" />
                    <col className="w-[11%]" />
                    <col className="w-[11%]" />
                    <col className="w-[10%]" />
                    <col className="w-[14%]" />
                    <col className="w-[17%]" />
                  </colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-2 px-2 sm:px-3 text-xs">User</TableHead>
                      <TableHead className="py-2 px-2 sm:px-3 text-xs">Contact</TableHead>
                      <TableHead className="py-2 px-2 sm:px-3 text-xs">ROI Wallet</TableHead>
                      <TableHead className="py-2 px-2 sm:px-3 text-xs">Gaming Wallet</TableHead>
                      <TableHead className="py-2 px-2 sm:px-3 text-xs">Referral</TableHead>
                      <TableHead className="py-2 px-2 sm:px-3 text-xs">Status</TableHead>
                      <TableHead className="py-2 px-2 sm:px-3 text-xs">Joined</TableHead>
                      <TableHead className="py-2 px-2 sm:px-3 text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchFilteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-500 py-6 text-xs sm:text-sm">
                          {users.length === 0 ? 'No users found' : 'No users match your search'}
                        </TableCell>
                      </TableRow>
                    )}
                    {searchFilteredUsers.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell className="py-2 px-2 sm:px-3">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate" title={user.name}>{user.name}</p>
                            <p className="text-gray-500 truncate" title={user.email}>{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3">
                          <p className="truncate" title={user.phone || ''}>{user.phone || '—'}</p>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          {formatCurrency(user.roiWallet ?? 0)}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          {formatCurrency(user.gamingWallet ?? 0)}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3">
                          <code className="px-1.5 py-0.5 bg-gray-100 rounded truncate max-w-full inline-block align-middle" title={user.referralCode || ''}>
                            {user.referralCode || '—'}
                          </code>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3">
                          <Badge
                            variant={
                              (user.walletBalance ?? 0) === 0
                                ? 'default'
                                : user.status === 'active'
                                ? 'success'
                                : user.status === 'suspended'
                                ? 'danger'
                                : 'default'
                            }
                          >
                            {(user.walletBalance ?? 0) === 0 ? 'Inactive' : user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          {formatDate(user.joinedDate)}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditUser(user)}
                              leftIcon={<Edit className="w-3 h-3" />}
                              className="text-xs px-2 py-1 min-w-0"
                            >
                              Edit
                            </Button>
                            {user.status === 'active' ? (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleStatusChange(user._id, 'suspended')}
                                leftIcon={<Ban className="w-3 h-3" />}
                                disabled={statusUpdatingId === user._id}
                                isLoading={statusUpdatingId === user._id}
                                className="text-xs px-2 py-1 min-w-0"
                              >
                                Suspend
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => handleStatusChange(user._id, 'active')}
                                leftIcon={<CheckCircle className="w-3 h-3" />}
                                disabled={statusUpdatingId === user._id}
                                isLoading={statusUpdatingId === user._id}
                                className="text-xs px-2 py-1 min-w-0"
                              >
                                Activate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {!loading && total > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-gray-600">
                  {total > 0 ? `Showing ${skip + 1}–${Math.min(skip + pageSize, total)} of ${total}` : 'No results'}
                </p>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-gray-500 whitespace-nowrap">Rows per page</label>
                  <select
                    className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setSkip(0) }}
                  >
                    {[10, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSkip((s) => Math.max(0, s - pageSize))}
                    disabled={skip === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSkip((s) => s + pageSize)}
                    disabled={skip + pageSize >= total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Add New User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New User"
        size="lg"
      >
        <form onSubmit={handleAddUserSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-600">{createError}</p>
            </div>
          )}
          <Input
            label="Name"
            value={newUserForm.name}
            onChange={(e) => setNewUserForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Abhay"
            required
          />
          <Input
            label="Email"
            type="email"
            value={newUserForm.email}
            onChange={(e) => setNewUserForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="e.g. user@example.com"
            required
          />
          <Input
            label="Phone"
            value={newUserForm.phone}
            onChange={(e) => setNewUserForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="e.g. 4563269875"
            required
          />
          <Input
            label="Password"
            type="password"
            value={newUserForm.password}
            onChange={(e) => setNewUserForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
            required
          />
          <Input
            label="Referral Code (optional)"
            value={newUserForm.referralCode}
            onChange={(e) => setNewUserForm((f) => ({ ...f, referralCode: e.target.value }))}
            placeholder="Leave empty if none"
          />
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createLoading}>
              Create User
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit User"
        size="lg"
      >
        {selectedUser && (
          <>
          <form onSubmit={handleEditUserSubmit} className="space-y-4">
            {editError && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-sm text-danger-600">{editError}</p>
              </div>
            )}
            <Input
              label="Name"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="Email"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
            <Input
              label="Phone"
              value={editForm.phone}
              onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              required
            />
            <Select
              label="Status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
              ]}
              value={editForm.status}
              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as 'active' | 'suspended' }))}
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={editForm.password}
              onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Leave blank to keep current password"
              rightIcon={
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="cursor-pointer text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
            <ModalFooter>
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={editLoading}>
                Save Changes
              </Button>
            </ModalFooter>
          </form>

          {/* Withdrawal Limit Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Withdrawal Limit</h3>
            <form onSubmit={handleLimitSubmit} className="space-y-4">
              {limitError && (
                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                  <p className="text-sm text-danger-600">{limitError}</p>
                </div>
              )}
              {limitSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-600">Withdrawal limit saved successfully.</p>
                </div>
              )}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={limitForm.enabled}
                    onChange={(e) => setLimitForm((f) => ({ ...f, enabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable withdrawal limit</span>
                </label>
              </div>
              {limitForm.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Period</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={limitForm.period}
                      onChange={(e) => setLimitForm((f) => ({ ...f, period: e.target.value as 'daily' | 'weekly' | 'monthly' }))}
                    >
                      <option value="daily">Per Day</option>
                      <option value="weekly">Per Week</option>
                      <option value="monthly">Per Month</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Amount (USDT)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 1000"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={limitForm.amount}
                      onChange={(e) => setLimitForm((f) => ({ ...f, amount: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Button type="submit" size="sm" isLoading={limitLoading}>
                  Save Limit
                </Button>
              </div>
            </form>
          </div>
          </>
        )}
      </Modal>
    </MainLayout>
  )
}
