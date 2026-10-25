'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { StatCard } from '@/components/ui/StatCard'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Minus, Wallet, ChevronDown, ChevronUp } from 'lucide-react'
import { walletStatsAPI, walletAPI } from '@/lib/api'
import { ExportDropdown } from '@/components/ExportDropdown'
import { SearchWithButton } from '@/components/ui/SearchWithButton'

interface WalletStats {
  totalBalance: number
  totalRoiWalletBalance: number
  totalGameWalletBalance: number
}

interface WalletListItem {
  _id: string
  userId: string
  userName: string
  userEmail: string
  userReferralCode?: string
  mainWallet: number
  gamingWallet: number
  roiWallet: number
  totalBalance: number
  updatedAt: string
}


const walletTypeOptions = [
  { value: 'gamingWallet', label: 'Game Wallet' },
  { value: 'roiWallet', label: 'ROI Wallet' },
]

export default function WalletsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [wallets, setWallets] = useState<WalletListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [skip, setSkip] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedWallet, setSelectedWallet] = useState<WalletListItem | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDeductModalOpen, setIsDeductModalOpen] = useState(false)
  const [walletType, setWalletType] = useState<'gamingWallet' | 'roiWallet'>('gamingWallet')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  useEffect(() => {
    walletStatsAPI
      .getWalletStats()
      .then((res) => {
        const data = res.data?.data
        setWalletStats(data ?? null)
      })
      .catch((err) => {
        setStatsError(err.response?.data?.message || 'Failed to load wallet stats')
        setWalletStats(null)
      })
      .finally(() => setStatsLoading(false))
  }, [])

  const fetchWallets = useCallback(() => {
    setLoading(true)
    setError(null)
    const params: { skip: number; limit: number; search?: string; fromDate?: string; toDate?: string } = {
      skip,
      limit: pageSize,
    }
    if (searchQuery.trim()) params.search = searchQuery.trim()
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    walletAPI
      .getAll(params)
      .then((res) => {
        const data = res.data?.data
        const totalCount = res.data?.total ?? 0
        setWallets(Array.isArray(data) ? data : [])
        setTotal(totalCount)
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load wallets')
        setWallets([])
      })
      .finally(() => setLoading(false))
  }, [skip, searchQuery, fromDate, toDate, pageSize])

  useEffect(() => {
    fetchWallets()
  }, [fetchWallets])

  useEffect(() => {
    setSkip(0)
  }, [fromDate, toDate])

  const handleSearch = () => {
    setSearchQuery(searchInput.trim())
    setSkip(0)
  }

  const handleAddFunds = (wallet: WalletListItem) => {
    setSelectedWallet(wallet)
    setWalletType('gamingWallet')
    setAmount('')
    setDescription('')
    setSubmitError(null)
    setIsAddModalOpen(true)
  }

  const handleDeductFunds = (wallet: WalletListItem) => {
    setSelectedWallet(wallet)
    setWalletType('gamingWallet')
    setAmount('')
    setDescription('')
    setSubmitError(null)
    setIsDeductModalOpen(true)
  }

  const getCurrentWalletBalance = () => {
    if (!selectedWallet) return 0
    return walletType === 'gamingWallet' ? selectedWallet.gamingWallet : selectedWallet.roiWallet
  }

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWallet) return
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      setSubmitError('Enter a valid positive amount')
      return
    }
    setSubmitError(null)
    setSubmitLoading(true)
    walletAPI
      .adjustFunds(selectedWallet.userId, walletType, 'add', amt, description.trim() || 'Added by admin')
      .then(() => {
        setIsAddModalOpen(false)
        fetchWallets()
        walletStatsAPI.getWalletStats().then((res) => {
          const data = res.data?.data
          if (data) setWalletStats(data)
        })
      })
      .catch((err) => {
        setSubmitError(err.response?.data?.message || 'Failed to add funds')
      })
      .finally(() => setSubmitLoading(false))
  }

  const handleSubmitDeduct = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWallet) return
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      setSubmitError('Enter a valid positive amount')
      return
    }
    const current = getCurrentWalletBalance()
    if (amt > current) {
      setSubmitError(`Insufficient balance. Current ${walletType === 'gamingWallet' ? 'Game' : 'ROI'} wallet: ${formatCurrency(current)}`)
      return
    }
    setSubmitError(null)
    setSubmitLoading(true)
    walletAPI
      .adjustFunds(selectedWallet.userId, walletType, 'deduct', amt, description.trim() || 'Deducted by admin')
      .then(() => {
        setIsDeductModalOpen(false)
        fetchWallets()
        walletStatsAPI.getWalletStats().then((res) => {
          const data = res.data?.data
          if (data) setWalletStats(data)
        })
      })
      .catch((err) => {
        setSubmitError(err.response?.data?.message || 'Failed to deduct funds')
      })
      .finally(() => setSubmitLoading(false))
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet Management</h1>
          <p className="text-gray-600 mt-1">Manage user wallets and balances</p>
        </div>

        {/* Stats: Total Balance, Total ROI Wallet, Total Game Wallet */}
        {statsLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        )}
        {statsError && (
          <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
            <p className="text-danger-600">{statsError}</p>
          </div>
        )}
        {!statsLoading && !statsError && walletStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Balance"
              value={formatCurrency(walletStats.totalBalance)}
              icon={<Wallet className="w-6 h-6" />}
              color="primary"
            />
            <StatCard
              title="Total ROI Wallet Balance"
              value={formatCurrency(walletStats.totalRoiWalletBalance)}
              icon={<Wallet className="w-6 h-6" />}
              color="success"
            />
            <StatCard
              title="Total Game Wallet Balance"
              value={formatCurrency(walletStats.totalGameWalletBalance)}
              icon={<Wallet className="w-6 h-6" />}
              color="warning"
            />
          </div>
        )}


        {/* Filters - single row on desktop; on mobile search + "More filters" then expandable row */}
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-end gap-3 sm:gap-4">
              <SearchWithButton
                value={searchInput}
                onChange={setSearchInput}
                onSearch={handleSearch}
                placeholder="Search by user ID or email..."
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
                <div className="w-full sm:w-36 shrink-0">
                  <label className="block text-xs text-gray-500 mb-0.5">From date</label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="w-full sm:w-36 shrink-0">
                  <label className="block text-xs text-gray-500 mb-0.5">To date</label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                <ExportDropdown
                  reportType="wallets"
                  fetchData={async (p) => {
                    const res = await walletAPI.getAll(p)
                    return { data: res.data?.data ?? res.data?.wallets ?? [] }
                  }}
                  columns={[
                    { key: 'userName', label: 'User' },
                    { key: 'userEmail', label: 'Email' },
                    { key: 'userReferralCode', label: 'Referral Code' },
                    { key: 'gamingWallet', label: 'Gaming Wallet' },
                    { key: 'roiWallet', label: 'ROI Wallet' },
                    { key: 'createdAt', label: 'Created At' },
                  ]}
                  params={{
                    search: searchQuery || undefined,
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined,
                  }}
                  label="Export"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Wallets Table - same design as deposits/withdrawals */}
        <Card>
          <CardBody className="p-0">
            {error && (
              <div className="p-4 bg-danger-50 border-b border-danger-200">
                <p className="text-danger-600 text-sm">{error}</p>
              </div>
            )}
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[700px] text-xs sm:text-sm">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[18%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs">User</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs">Referral Code</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs">Game Wallet</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs">ROI Wallet</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs">Total</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs">Last Updated</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500 py-6 text-xs sm:text-sm">
                        Loading...
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && wallets.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500 py-6 text-xs sm:text-sm">
                        No wallets found
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    wallets.map((wallet) => (
                      <TableRow key={wallet._id}>
                        <TableCell className="py-2 px-2 sm:px-3">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate" title={wallet.userName}>
                              {wallet.userName}
                            </p>
                            <p className="text-gray-500 truncate" title={wallet.userId}>
                              {wallet.userId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs truncate max-w-[6rem] inline-block align-middle" title={wallet.userReferralCode || ''}>
                            {wallet.userReferralCode || '—'}
                          </code>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <span className="font-medium text-warning-600">
                            {formatCurrency(wallet.gamingWallet)}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <span className="font-medium text-success-600">
                            {formatCurrency(wallet.roiWallet)}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap font-medium">
                          {formatCurrency(wallet.totalBalance)}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          {wallet.updatedAt ? formatDate(wallet.updatedAt) : '—'}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <Button
                              size="sm"
                              variant="success"
                              leftIcon={<Plus className="w-3 h-3" />}
                              className="text-xs px-2 py-1 min-w-0"
                              onClick={() => handleAddFunds(wallet)}
                            >
                              Add
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              leftIcon={<Minus className="w-3 h-3" />}
                              className="text-xs px-2 py-1 min-w-0"
                              onClick={() => handleDeductFunds(wallet)}
                            >
                              Deduct
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
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
                    variant="secondary"
                    onClick={() => setSkip((s) => Math.max(0, s - pageSize))}
                    disabled={skip === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
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

      {/* Add Funds Modal - with wallet type dropdown */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Funds"
        size="md"
      >
        {selectedWallet && (
          <form onSubmit={handleSubmitAdd} className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">User ID</p>
              <p className="font-medium text-gray-900">{selectedWallet.userId}</p>
              <p className="text-sm text-gray-600 mt-2">Current balance (selected wallet)</p>
              <p className="font-medium text-gray-900">
                {walletType === 'gamingWallet'
                  ? formatCurrency(selectedWallet.gamingWallet)
                  : formatCurrency(selectedWallet.roiWallet)}
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Wallet</label>
              <Select
                options={walletTypeOptions}
                value={walletType}
                onChange={(e) => setWalletType(e.target.value as 'gamingWallet' | 'roiWallet')}
              />
            </div>
            <Input
              label="Amount ($) *"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter amount to add"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Textarea
              label="Description *"
              placeholder="Enter reason for adding funds..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            {submitError && (
              <div className="p-3 bg-danger-50 rounded-lg">
                <p className="text-sm text-danger-600">{submitError}</p>
              </div>
            )}
            <ModalFooter>
              <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="success" disabled={submitLoading}>
                {submitLoading ? 'Adding...' : 'Add Funds'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* Deduct Funds Modal - with wallet type dropdown */}
      <Modal
        isOpen={isDeductModalOpen}
        onClose={() => setIsDeductModalOpen(false)}
        title="Deduct Funds"
        size="md"
      >
        {selectedWallet && (
          <form onSubmit={handleSubmitDeduct} className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">User ID</p>
              <p className="font-medium text-gray-900">{selectedWallet.userId}</p>
              <p className="text-sm text-gray-600 mt-2">Current balance (selected wallet)</p>
              <p className="font-medium text-gray-900">
                {walletType === 'gamingWallet'
                  ? formatCurrency(selectedWallet.gamingWallet)
                  : formatCurrency(selectedWallet.roiWallet)}
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Wallet</label>
              <Select
                options={walletTypeOptions}
                value={walletType}
                onChange={(e) => setWalletType(e.target.value as 'gamingWallet' | 'roiWallet')}
              />
            </div>
            <Input
              label="Amount ($) *"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter amount to deduct"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Textarea
              label="Description *"
              placeholder="Enter reason for deducting funds..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            {submitError && (
              <div className="p-3 bg-danger-50 rounded-lg">
                <p className="text-sm text-danger-600">{submitError}</p>
              </div>
            )}
            <ModalFooter>
              <Button type="button" variant="ghost" onClick={() => setIsDeductModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={submitLoading}>
                {submitLoading ? 'Deducting...' : 'Deduct Funds'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>
    </MainLayout>
  )
}
