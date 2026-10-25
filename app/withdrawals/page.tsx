'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CheckCircle, XCircle, ArrowUpFromLine, Eye, ChevronDown, ChevronUp, ShieldCheck, Users, AlertTriangle, Wallet, Loader2, TrendingUp, TrendingDown, Gift, Gamepad2, Banknote } from 'lucide-react'
import { withdrawalStatsAPI, withdrawalAPI, userAPI } from '@/lib/api'
import { ExportDropdown } from '@/components/ExportDropdown'
import { SearchWithButton } from '@/components/ui/SearchWithButton'
import { useAdminAuth } from '@/lib/useAdminAuth'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useAccount, useWalletClient, useDisconnect } from 'wagmi'
import { sendWithdrawalPayment } from '@/lib/wallet'
import QRCode from 'qrcode'

interface WithdrawalStats {
  totalWithdrawals: number
  pendingWithdrawals: number
  approvedToday: number
  rejectedToday: number
}

interface WithdrawalListItem {
  _id: string
  transactionId: string
  userId: string
  userName: string
  userEmail: string
  userReferralCode?: string
  amount: number
  currency: string
  network: string
  status: string
  fee: number
  netAmount: number
  toAddress?: string
  transactionHash?: string
  createdAt: string
  verifiedByName?: string | null
}

interface VerificationTx {
  transactionId: string
  category: string
  status: string
  amount: number
  netAmount: number
  currency: string
  createdAt: string
}

interface VerificationSummary {
  deposits: number
  withdrawals: number
  roi: number
  referral: number
  gamingWins: number
  gamingLosses: number
  totalBalance: number
  mainWallet: number
  gamingWallet: number
  roiWallet: number
  transactions?: VerificationTx[]
}


const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'rejected', label: 'Rejected' },
]

export default function WithdrawalsPage() {
  const adminAuth = useAdminAuth()
  const { openConnectModal } = useConnectModal()
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { disconnect } = useDisconnect()
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [withdrawalStats, setWithdrawalStats] = useState<WithdrawalStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [withdrawals, setWithdrawals] = useState<WithdrawalListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [skip, setSkip] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalListItem | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false)
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [processingWithdrawal, setProcessingWithdrawal] = useState<WithdrawalListItem | null>(null)
  const [txHash, setTxHash] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [processLoading, setProcessLoading] = useState(false)
  const [processError, setProcessError] = useState<string | null>(null)
  const [mmLoading, setMmLoading] = useState(false)
  const [mmError, setMmError] = useState<string | null>(null)
  const [txHashFromWallet, setTxHashFromWallet] = useState(false) // true when hash was auto-filled by wallet
  const [verificationSummary, setVerificationSummary] = useState<VerificationSummary | null>(null)
  const [verificationSummaryLoading, setVerificationSummaryLoading] = useState(false)
  const [verificationSummaryError, setVerificationSummaryError] = useState<string | null>(null)
  const [txFilter, setTxFilter] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  // Global withdrawal limit state
  const [bulkEnabled, setBulkEnabled] = useState(true)
  const [bulkPeriod, setBulkPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [bulkAmount, setBulkAmount] = useState('')
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null)

  const handleBulkLimitApply = (e: React.FormEvent) => {
    e.preventDefault()
    setBulkError(null)
    if (!bulkAmount || isNaN(Number(bulkAmount)) || Number(bulkAmount) < 0) {
      setBulkError('Please enter a valid amount (>= 0)')
      return
    }
    setIsBulkConfirmOpen(true)
  }

  const handleBulkLimitConfirm = () => {
    setBulkLoading(true)
    setBulkError(null)
    setBulkSuccess(null)
    userAPI.setBulkWithdrawalLimit({ enabled: bulkEnabled, period: bulkPeriod, amount: Number(bulkAmount) })
      .then((res) => {
        setBulkSuccess(res.data?.message || 'Withdrawal limit applied to all users')
        setIsBulkConfirmOpen(false)
      })
      .catch((err: any) => {
        setBulkError(err.response?.data?.message || 'Failed to apply bulk withdrawal limit')
        setIsBulkConfirmOpen(false)
      })
      .finally(() => setBulkLoading(false))
  }

  useEffect(() => {
    withdrawalStatsAPI
      .getWithdrawalStats()
      .then((res) => {
        const data = res.data?.data
        setWithdrawalStats(data ?? null)
      })
      .catch((err) => {
        setStatsError(err.response?.data?.message || 'Failed to load withdrawal stats')
        setWithdrawalStats(null)
      })
      .finally(() => setStatsLoading(false))
  }, [])

  const fetchWithdrawals = useCallback(() => {
    setLoading(true)
    setError(null)
    const params: { skip: number; limit: number; fromDate?: string; toDate?: string; status?: string; search?: string } = {
      skip,
      limit: pageSize,
    }
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    if (statusFilter !== 'all') params.status = statusFilter
    if (searchQuery.trim()) params.search = searchQuery.trim()
    withdrawalAPI
      .getAll(params)
      .then((res) => {
        const data = res.data?.data
        const totalCount = res.data?.total ?? 0
        setWithdrawals(Array.isArray(data) ? data : [])
        setTotal(totalCount)
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load withdrawals')
        setWithdrawals([])
      })
      .finally(() => setLoading(false))
  }, [skip, fromDate, toDate, statusFilter, searchQuery, pageSize])

  useEffect(() => {
    fetchWithdrawals()
  }, [fetchWithdrawals])

  useEffect(() => {
    setSkip(0)
  }, [fromDate, toDate, statusFilter])

  const handleSearch = () => {
    setSearchQuery(searchInput.trim())
    setSkip(0)
  }

  useEffect(() => {
    const addr = processingWithdrawal?.toAddress
    if (!addr || !isVerifyModalOpen) {
      setQrDataUrl(null)
      return
    }
    QRCode.toDataURL(addr, { width: 140, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [processingWithdrawal?.toAddress, isVerifyModalOpen])

  const handleViewDetails = (withdrawal: WithdrawalListItem) => {
    setSelectedWithdrawal(withdrawal)
    setIsDetailsModalOpen(true)
  }

  const handleOpenVerify = (w: WithdrawalListItem) => {
    setProcessingWithdrawal(w)
    setProcessError(null)
    setVerificationSummary(null)
    setVerificationSummaryError(null)
    setTxFilter(null)
    setQrDataUrl(null)
    setIsVerifyModalOpen(true)
    setVerificationSummaryLoading(true)
    userAPI.getVerificationSummary(w.userId)
      .then((res) => setVerificationSummary(res.data?.data ?? null))
      .catch((err: any) => setVerificationSummaryError(err.response?.data?.message || 'Failed to load transaction history'))
      .finally(() => setVerificationSummaryLoading(false))
  }

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!processingWithdrawal) return
    setProcessLoading(true); setProcessError(null)
    withdrawalAPI.verify(processingWithdrawal.transactionId)
      .then(() => { setIsVerifyModalOpen(false); fetchWithdrawals(); })
      .catch((err: any) => setProcessError(err.response?.data?.message || 'Failed to verify withdrawal'))
      .finally(() => setProcessLoading(false))
  }

  const handleOpenApprove = (w: WithdrawalListItem) => {
    setProcessingWithdrawal(w)
    setTxHash("")
    setProcessError(null)
    setMmError(null)
    setTxHashFromWallet(false)
    setIsApproveModalOpen(true)
  }

  const handleWalletConnect = () => {
    setMmError(null)
    openConnectModal?.()
  }

  const handleWalletPay = async () => {
    if (!processingWithdrawal || !address || !walletClient) return
    setMmError(null)
    setMmLoading(true)
    setTxHashFromWallet(false)
    try {
      const { txHash: hash } = await sendWithdrawalPayment(
        walletClient,
        address,
        processingWithdrawal.toAddress ?? '',
        processingWithdrawal.netAmount ?? processingWithdrawal.amount,
        processingWithdrawal.currency,
        processingWithdrawal.network,
      )
      setTxHash(hash)
      setTxHashFromWallet(true)
    } catch (err: any) {
      if (err?.code !== 4001 && err?.code !== 'ACTION_REJECTED') {
        setMmError(err?.message ?? 'Transaction failed')
      }
    } finally {
      setMmLoading(false)
    }
  }

  const handleOpenReject = (w: WithdrawalListItem) => { setProcessingWithdrawal(w); setRejectReason(""); setProcessError(null); setIsRejectModalOpen(true); }

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!processingWithdrawal || !txHash.trim()) return;
    setProcessLoading(true); setProcessError(null);
    withdrawalAPI.process(processingWithdrawal.transactionId, "APPROVE", txHash.trim())
      .then(() => { setIsApproveModalOpen(false); fetchWithdrawals(); })
      .catch((err) => setProcessError(err.response?.data?.message || "Failed to approve withdrawal"))
      .finally(() => setProcessLoading(false));
  }

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!processingWithdrawal || !rejectReason.trim()) return;
    setProcessLoading(true); setProcessError(null);
    withdrawalAPI.process(processingWithdrawal.transactionId, "REJECT", undefined, rejectReason.trim())
      .then(() => { setIsRejectModalOpen(false); fetchWithdrawals(); })
      .catch((err) => setProcessError(err.response?.data?.message || "Failed to reject withdrawal"))
      .finally(() => setProcessLoading(false));
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Withdrawal Management</h1>
          <p className="text-gray-600 mt-1">Manage user withdrawal requests</p>
        </div>

        {/* Stats Grid */}
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
        {!statsLoading && !statsError && withdrawalStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Withdrawals"
              value={formatCurrency(withdrawalStats.totalWithdrawals)}
              icon={<ArrowUpFromLine className="w-6 h-6" />}
              color="warning"
            />
            <StatCard
              title="Pending Withdrawals"
              value={formatCurrency(withdrawalStats.pendingWithdrawals)}
              icon={<ArrowUpFromLine className="w-6 h-6" />}
              color="danger"
            />
            <StatCard
              title="Approved Today"
              value={formatCurrency(withdrawalStats.approvedToday)}
              icon={<CheckCircle className="w-6 h-6" />}
              color="success"
            />
            <StatCard
              title="Rejected Today"
              value={formatCurrency(withdrawalStats.rejectedToday)}
              icon={<XCircle className="w-6 h-6" />}
              color="danger"
            />
          </div>
        )}


        {/* Global Withdrawal Limit */}
        <div className="rounded-xl border border-warning-200 bg-gradient-to-r from-warning-50 to-orange-50 p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Left: icon + title */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2.5 bg-warning-100 rounded-xl shrink-0">
                <Users className="w-5 h-5 text-warning-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">Global Withdrawal Limit</h3>
                <p className="text-xs text-gray-500 mt-0.5">Apply a single withdrawal limit policy to <span className="font-medium text-gray-700">all users</span> instantly. This overrides individual user limits.</p>
                {bulkSuccess && (
                  <p className="mt-2 text-xs font-medium text-success-700 bg-success-100 inline-block px-2.5 py-1 rounded-full">{bulkSuccess}</p>
                )}
                {bulkError && !isBulkConfirmOpen && (
                  <p className="mt-2 text-xs font-medium text-danger-700 bg-danger-100 inline-block px-2.5 py-1 rounded-full">{bulkError}</p>
                )}
              </div>
            </div>

            {/* Right: form */}
            <form onSubmit={handleBulkLimitApply} className="flex flex-wrap items-end gap-3 shrink-0">
              {/* Enable / Disable */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-warning-400 min-w-[110px]"
                  value={bulkEnabled ? 'enabled' : 'disabled'}
                  onChange={(e) => setBulkEnabled(e.target.value === 'enabled')}
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              {/* Period */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Period</label>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-warning-400 min-w-[120px]"
                  value={bulkPeriod}
                  onChange={(e) => setBulkPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  disabled={!bulkEnabled}
                >
                  <option value="daily">Per Day</option>
                  <option value="weekly">Per Week</option>
                  <option value="monthly">Per Month</option>
                </select>
              </div>

              {/* Max Amount */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Amount (USDT)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 500"
                  required={bulkEnabled}
                  disabled={!bulkEnabled}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-warning-400 w-32 disabled:opacity-50 disabled:cursor-not-allowed"
                  value={bulkAmount}
                  onChange={(e) => { setBulkAmount(e.target.value); setBulkSuccess(null); setBulkError(null) }}
                />
              </div>

              <Button
                type="submit"
                variant="warning"
                size="sm"
                isLoading={bulkLoading}
                className="whitespace-nowrap"
              >
                Apply to All Users
              </Button>
            </form>
          </div>
        </div>

        {/* Filters - single row on desktop; on mobile search + "More filters" then expandable row */}
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-end gap-3 sm:gap-4">
              <SearchWithButton
                value={searchInput}
                onChange={setSearchInput}
                onSearch={handleSearch}
                placeholder="Search by user or transaction ID..."
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
                <div className="w-full sm:w-40 shrink-0">
                  <label className="block text-xs text-gray-500 mb-0.5">Status</label>
                  <Select
                    options={statusOptions}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  />
                </div>
                <ExportDropdown
                  reportType="withdrawals"
                  fetchData={async (p) => {
                    const res = await withdrawalAPI.getAll(p)
                    return { data: res.data?.data ?? res.data?.withdrawals ?? [] }
                  }}
                  columns={[
                    { key: 'transactionId', label: 'Transaction ID' },
                    { key: 'userName', label: 'User' },
                    { key: 'userReferralCode', label: 'Referral Code' },
                    { key: 'amount', label: 'Amount' },
                    { key: 'currency', label: 'Currency' },
                    { key: 'walletAddress', label: 'Wallet Address' },
                    { key: 'status', label: 'Status' },
                    { key: 'createdAt', label: 'Created At' },
                  ]}
                  params={{
                    search: searchQuery || undefined,
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                  }}
                  label="Export"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Withdrawals Table - horizontally scrollable on mobile */}
        <Card>
          <CardBody className="p-0">
            {error && (
              <div className="p-4 bg-danger-50 border-b border-danger-200">
                <p className="text-danger-600 text-sm">{error}</p>
              </div>
            )}
            <Table className="w-full min-w-[750px] text-xs sm:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">User</TableHead>
                  <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Referral Code</TableHead>
                  <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Amount</TableHead>
                  <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Withdrawal address</TableHead>
                  <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Status</TableHead>
                  <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Verified by</TableHead>
                  <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Date</TableHead>
                  <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-6 text-xs sm:text-sm">
                      Loading...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && withdrawals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-6 text-xs sm:text-sm">
                      No withdrawals found
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal._id}>
                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-[8rem]" title={withdrawal.userName}>
                            {withdrawal.userName}
                          </p>
                          <p className="text-gray-500 truncate max-w-[8rem] text-xs" title={withdrawal.userId}>
                            {withdrawal.userId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs truncate max-w-[6rem] inline-block align-middle" title={withdrawal.userReferralCode || ''}>
                          {withdrawal.userReferralCode || '—'}
                        </code>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        <span className="font-medium text-danger-600">
                          {formatCurrency(withdrawal.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        <p className="truncate max-w-[8rem] text-xs" title={withdrawal.toAddress || ''}>
                          {withdrawal.toAddress || '—'}
                        </p>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        <Badge
                          variant={
                            withdrawal.status === 'completed'
                              ? 'success'
                              : withdrawal.status === 'pending'
                              ? 'warning'
                              : withdrawal.status === 'verified'
                              ? 'info'
                              : 'danger'
                          }
                        >
                          {withdrawal.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        {withdrawal.verifiedByName ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-primary-100 text-primary-700" title="Verified by">
                            <ShieldCheck className="w-3 h-3" /> {withdrawal.verifiedByName}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        {formatDate(withdrawal.createdAt)}
                      </TableCell>
                                            <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Eye className="w-3 h-3" />}
                            className="text-xs px-2 py-1 shrink-0"
                            onClick={() => handleViewDetails(withdrawal)}
                            title="View details"
                          >
                            View
                          </Button>
                          {/* Verify button — visible for pending withdrawals if admin has withdrawals permission */}
                          {withdrawal.status === 'pending' && adminAuth.hasPermission('withdrawals') && (
                            <Button
                              size="sm"
                              variant="warning"
                              leftIcon={<ShieldCheck className="w-3 h-3" />}
                              className="text-xs px-2 py-1 shrink-0"
                              onClick={() => handleOpenVerify(withdrawal)}
                              title="Verify withdrawal"
                            >
                              Verify
                            </Button>
                          )}
                          {/* Approve / Reject — only for verified withdrawals, only superadmin */}
                          {withdrawal.status === 'verified' && adminAuth.isSuperAdmin && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                leftIcon={<CheckCircle className="w-3 h-3" />}
                                className="text-xs px-2 py-1 shrink-0"
                                onClick={() => handleOpenApprove(withdrawal)}
                                title="Approve"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                leftIcon={<XCircle className="w-3 h-3" />}
                                className="text-xs px-2 py-1 shrink-0"
                                onClick={() => handleOpenReject(withdrawal)}
                                title="Reject"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            {!loading && total > 0 && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-t border-gray-200">
                <div className="flex flex-wrap items-center gap-3 order-2 sm:order-1">
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
                <div className="flex gap-2 order-1 sm:order-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 sm:flex-none"
                    onClick={() => setSkip((s) => Math.max(0, s - pageSize))}
                    disabled={skip === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 sm:flex-none"
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

        {/* Withdrawal details modal */}
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title="Withdrawal Details"
          size="lg"
        >
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">User</p>
                  <p className="font-medium text-gray-900">{selectedWithdrawal.userName}</p>
                  <p className="text-xs text-gray-500">{selectedWithdrawal.userEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">User ID</p>
                  <p className="font-medium text-gray-900 break-all">{selectedWithdrawal.userId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Transaction ID</p>
                  <p className="font-medium text-gray-900 break-all">{selectedWithdrawal.transactionId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge
                    variant={
                      selectedWithdrawal.status === 'completed'
                        ? 'success'
                        : selectedWithdrawal.status === 'pending'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {selectedWithdrawal.status}
                  </Badge>
                </div>
                {selectedWithdrawal.verifiedByName && (
                  <div>
                    <p className="text-sm text-gray-600">Verified by</p>
                    <p className="font-medium text-primary-600 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> {selectedWithdrawal.verifiedByName}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-medium text-danger-600">
                    {formatCurrency(selectedWithdrawal.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Currency</p>
                  <p className="font-medium text-gray-900">{selectedWithdrawal.currency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Network</p>
                  <p className="font-medium text-gray-900">{selectedWithdrawal.network || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fee</p>
                  <p className="font-medium text-gray-900">{formatCurrency(selectedWithdrawal.fee ?? 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Net Amount</p>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(selectedWithdrawal.netAmount ?? selectedWithdrawal.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedWithdrawal.createdAt)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm text-gray-600">Withdrawal address</p>
                  <p className="font-medium text-gray-900 break-all text-xs">
                    {selectedWithdrawal.toAddress || '—'}
                  </p>
                </div>
                {selectedWithdrawal.transactionHash != null && selectedWithdrawal.transactionHash !== '' && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-600">Transaction Hash</p>
                    <p className="font-medium text-gray-900 break-all text-xs">
                      {selectedWithdrawal.transactionHash}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>


      {/* Verify Withdrawal Modal */}
      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title="Verify Withdrawal"
        size="2xl"
      >
        {processingWithdrawal && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            {/* Withdrawal details + summary cards – compact grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4">
              {/* Withdrawal info + QR */}
              <div className="flex gap-3 p-4 bg-blue-50/60 border border-blue-200 rounded-xl w-fit">
                <div className="space-y-1.5 text-sm min-w-0">
                  <p><span className="text-gray-500">User:</span> <span className="font-medium text-gray-800">{processingWithdrawal.userName}</span></p>
                  <p><span className="text-gray-500">Amount:</span> <span className="font-semibold text-danger-600">{formatCurrency(processingWithdrawal.netAmount ?? processingWithdrawal.amount)} {processingWithdrawal.currency}</span></p>
                  <p><span className="text-gray-500">Network:</span> <span className="font-medium text-gray-800">{processingWithdrawal.network || '—'}</span></p>
                  <p className="max-w-[200px]"><span className="text-gray-500">To:</span> <span className="font-mono text-xs text-gray-700 break-all">{processingWithdrawal.toAddress || '—'}</span></p>
                </div>
                {qrDataUrl && processingWithdrawal.toAddress && (
                  <div className="shrink-0 flex flex-col items-center justify-center gap-1 p-2.5 bg-white rounded-lg border border-blue-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="Scan address" className="w-20 h-20 rounded" />
                    <span className="text-[10px] text-gray-500">Scan to transfer</span>
                  </div>
                )}
              </div>

              {/* Summary cards – compact horizontal layout, fills remaining width */}
              {verificationSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 content-start">
                  {[
                    { key: 'DEPOSIT', label: 'Deposits', value: verificationSummary.deposits, icon: TrendingUp, cn: 'bg-success-50 border-success-200 text-success-700', activeCn: 'ring-2 ring-success-400' },
                    { key: 'WITHDRAWAL', label: 'Withdrawals', value: verificationSummary.withdrawals, icon: TrendingDown, cn: 'bg-danger-50 border-danger-200 text-danger-700', activeCn: 'ring-2 ring-danger-400' },
                    { key: 'ROI_CREDIT', label: 'ROI', value: verificationSummary.roi, icon: TrendingUp, cn: 'bg-blue-50 border-blue-200 text-blue-700', activeCn: 'ring-2 ring-blue-400' },
                    { key: 'REFERRAL_BONUS', label: 'Referral', value: verificationSummary.referral, icon: Gift, cn: 'bg-purple-50 border-purple-200 text-purple-700', activeCn: 'ring-2 ring-purple-400' },
                    { key: 'GAME_WIN', label: 'Gaming Wins', value: verificationSummary.gamingWins, icon: Gamepad2, cn: 'bg-emerald-50 border-emerald-200 text-emerald-700', activeCn: 'ring-2 ring-emerald-400' },
                    { key: 'GAME_LOSE', label: 'Gaming Losses', value: verificationSummary.gamingLosses, icon: Gamepad2, cn: 'bg-amber-50 border-amber-200 text-amber-700', activeCn: 'ring-2 ring-amber-400' },
                  ].map(({ key, label, value, icon: Icon, cn, activeCn }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTxFilter((prev) => (prev === key ? null : key))}
                      className={`flex items-center gap-2 p-2.5 border rounded-lg text-left cursor-pointer transition-all hover:opacity-90 ${cn.split(' ').map((c) => c.startsWith('border-') ? `border ${c}` : c).join(' ')} ${txFilter === key ? activeCn : ''}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium opacity-90">{label}</div>
                        <div className="text-sm font-semibold truncate">{formatCurrency(value)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User transaction history – fraud check */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 bg-gray-100 px-4 py-2.5 border-b border-gray-200">
                <Banknote className="w-4 h-4 text-gray-600 shrink-0" />
                <span className="text-sm font-medium text-gray-800">User Transaction History (Verify balance before confirming)</span>
              </div>
              <div className="p-4">
                {verificationSummaryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : verificationSummaryError ? (
                  <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                    <p className="text-sm text-warning-700">{verificationSummaryError}</p>
                    <p className="text-xs text-gray-500 mt-1">You can still verify, but transaction history was not loaded.</p>
                  </div>
                ) : verificationSummary ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-primary-50 border-2 border-primary-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-primary-800">Withdrawable Balance</span>
                        <span className="text-lg font-bold text-primary-700">
                          {formatCurrency(verificationSummary.roiWallet + verificationSummary.gamingWallet)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        ROI: {formatCurrency(verificationSummary.roiWallet)} · Gaming: {formatCurrency(verificationSummary.gamingWallet)}
                      </p>
                    </div>

                    {/* Transaction list */}
                    {verificationSummary.transactions && verificationSummary.transactions.length > 0 && (() => {
                      const filtered = txFilter
                        ? verificationSummary.transactions.filter((tx) => tx.category === txFilter)
                        : verificationSummary.transactions
                      return (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-600">
                            Transaction list (last 50){txFilter ? ` · Filtered by ${txFilter.replace(/_/g, ' ')}` : ''}
                          </p>
                          {txFilter && (
                            <button type="button" onClick={() => setTxFilter(null)} className="text-xs text-primary-600 hover:underline">
                              Clear filter
                            </button>
                          )}
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="py-2.5 px-3 text-xs font-semibold">ID</TableHead>
                                <TableHead className="py-2.5 px-3 text-xs font-semibold">Type</TableHead>
                                <TableHead className="py-2.5 px-3 text-xs font-semibold">Amount</TableHead>
                                <TableHead className="py-2.5 px-3 text-xs font-semibold">Status</TableHead>
                                <TableHead className="py-2.5 px-3 text-xs font-semibold">Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filtered.map((tx) => (
                                <TableRow key={tx.transactionId} className="text-sm hover:bg-gray-50">
                                  <TableCell className="py-2 px-3 font-mono text-gray-600 text-xs" title={tx.transactionId}>
                                    {tx.transactionId.slice(-10)}
                                  </TableCell>
                                  <TableCell className="py-2 px-3">
                                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                      tx.category === 'DEPOSIT' ? 'bg-success-100 text-success-700' :
                                      tx.category === 'WITHDRAWAL' ? 'bg-danger-100 text-danger-700' :
                                      tx.category === 'ROI_CREDIT' ? 'bg-blue-100 text-blue-700' :
                                      tx.category === 'REFERRAL_BONUS' ? 'bg-purple-100 text-purple-700' :
                                      tx.category === 'GAME_WIN' ? 'bg-emerald-100 text-emerald-700' :
                                      tx.category === 'GAME_LOSE' ? 'bg-amber-100 text-amber-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {tx.category.replace(/_/g, ' ')}
                                    </span>
                                  </TableCell>
                                  <TableCell className={`py-2 px-3 font-medium ${
                                    ['WITHDRAWAL', 'GAME_LOSE'].includes(tx.category) ? 'text-danger-600' : 'text-success-600'
                                  }`}>
                                    {['WITHDRAWAL', 'GAME_LOSE'].includes(tx.category) ? '-' : '+'}
                                    {formatCurrency(tx.netAmount)} {tx.currency}
                                  </TableCell>
                                  <TableCell className="py-2 px-3">
                                    <span className={`text-sm ${
                                      tx.status === 'completed' ? 'text-success-600' :
                                      tx.status === 'verified' ? 'text-blue-600' :
                                      tx.status === 'pending' ? 'text-warning-600' : 'text-gray-500'
                                    }`}>
                                      {tx.status}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-2 px-3 text-gray-500 whitespace-nowrap text-sm">
                                    {formatDate(tx.createdAt)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )})()}
                  </div>
                ) : null}
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Verifying marks this withdrawal as <strong>ready for superadmin approval</strong>. Confirm the user&apos;s balance and transaction history above for fraud detection before verifying.
            </p>
            {processError && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-sm text-danger-600">{processError}</p>
              </div>
            )}
            <ModalFooter>
              <Button type="button" variant="ghost" onClick={() => setIsVerifyModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="warning" isLoading={processLoading}>
                <ShieldCheck className="w-4 h-4 mr-1" /> Confirm Verify
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* Approve Withdrawal Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Approve Withdrawal"
        size="md"
      >
        {processingWithdrawal && (
          <form onSubmit={handleApproveSubmit} className="space-y-4">
            {/* Summary */}
            <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
              <p><span className="text-gray-500">User:</span> <span className="font-medium">{processingWithdrawal.userName}</span></p>
              <p>
                <span className="text-gray-500">Amount:</span>{' '}
                <span className="font-semibold text-danger-600">
                  {formatCurrency(processingWithdrawal.netAmount ?? processingWithdrawal.amount)} {processingWithdrawal.currency}
                </span>
              </p>
              <p><span className="text-gray-500">Network:</span> <span className="font-medium">{processingWithdrawal.network || '—'}</span></p>
              <p><span className="text-gray-500">To:</span> <span className="font-medium text-xs break-all">{processingWithdrawal.toAddress || '—'}</span></p>
            </div>

            {processError && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-sm text-danger-600">{processError}</p>
              </div>
            )}

            {/* Wallet section - Rainbow Kit: MetaMask, WalletConnect, Coinbase, etc. */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                <Wallet className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="text-sm font-medium text-gray-800">Pay via Wallet</span>
              </div>
              <div className="p-4 space-y-3">
                {!address ? (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-gray-500 flex-1">
                      Connect MetaMask, WalletConnect, Coinbase, or another supported wallet to send funds directly.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleWalletConnect}
                      leftIcon={<Wallet className="w-4 h-4" />}
                    >
                      Connect Wallet
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-success-500 shrink-0" />
                        <span className="text-xs text-gray-600 font-mono">{address.slice(0, 8)}…{address.slice(-6)}</span>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                        onClick={() => { disconnect(); setMmError(null) }}
                      >
                        Disconnect
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="w-full"
                      isLoading={mmLoading}
                      disabled={mmLoading || !processingWithdrawal.toAddress || !walletClient}
                      onClick={handleWalletPay}
                      leftIcon={mmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                    >
                      {mmLoading
                        ? 'Waiting for wallet…'
                        : `Send ${formatCurrency(processingWithdrawal.netAmount ?? processingWithdrawal.amount)} ${processingWithdrawal.currency}`}
                    </Button>
                    {!processingWithdrawal.toAddress && (
                      <p className="text-xs text-danger-500">No destination address on this withdrawal.</p>
                    )}
                  </div>
                )}
                {mmError && (
                  <div className="p-2.5 bg-danger-50 border border-danger-200 rounded-lg">
                    <p className="text-xs text-danger-700">{mmError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Transaction hash input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Hash <span className="text-danger-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Auto-filled after wallet payment, or paste manually…"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10 ${
                    txHashFromWallet ? 'border-success-400 bg-success-50' : 'border-gray-300'
                  }`}
                  value={txHash}
                  onChange={(e) => { setTxHash(e.target.value); setTxHashFromWallet(false) }}
                />
                {txHashFromWallet && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle className="w-4 h-4 text-success-500" />
                  </span>
                )}
              </div>
              {txHashFromWallet
                ? <p className="text-xs text-success-600 mt-1">✓ Transaction hash filled automatically</p>
                : <p className="text-xs text-gray-400 mt-1">Paste the on-chain tx hash after sending funds to the user</p>
              }
            </div>

            <ModalFooter>
              <Button type="button" variant="ghost" onClick={() => setIsApproveModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary" isLoading={processLoading} disabled={!txHash.trim()}>
                Confirm Approve
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* Bulk Withdrawal Limit Confirmation Modal */}
      <Modal
        isOpen={isBulkConfirmOpen}
        onClose={() => setIsBulkConfirmOpen(false)}
        title="Confirm Global Withdrawal Limit"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-warning-50 border border-warning-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
            <p className="text-sm text-warning-800">
              This will <strong>override the withdrawal limit for every user</strong> in the system. Individual limits will be replaced.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={`font-semibold ${bulkEnabled ? 'text-success-600' : 'text-danger-600'}`}>
                {bulkEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {bulkEnabled && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Period</span>
                  <span className="font-semibold text-gray-900 capitalize">{bulkPeriod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Amount</span>
                  <span className="font-semibold text-gray-900">${Number(bulkAmount).toLocaleString()} USDT</span>
                </div>
              </>
            )}
          </div>
          {bulkError && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-600">{bulkError}</p>
            </div>
          )}
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setIsBulkConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="warning"
              isLoading={bulkLoading}
              onClick={handleBulkLimitConfirm}
            >
              Yes, Apply to All
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Reject Withdrawal Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Withdrawal"
        size="md"
      >
        {processingWithdrawal && (
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
              <p><span className="text-gray-500">User:</span> <span className="font-medium">{processingWithdrawal.userName}</span></p>
              <p><span className="text-gray-500">Amount:</span> <span className="font-medium text-danger-600">{formatCurrency(processingWithdrawal.amount)} {processingWithdrawal.currency}</span></p>
            </div>
            <p className="text-xs text-gray-500">The full amount will be automatically refunded to the user wallet on rejection.</p>
            {processError && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-sm text-danger-600">{processError}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rejection Reason <span className="text-danger-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Enter reason for rejection..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <ModalFooter>
              <Button type="button" variant="ghost" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="danger" isLoading={processLoading} disabled={!rejectReason.trim()}>Confirm Reject</Button>
            </ModalFooter>
          </form>
        )}
      </Modal>
    </MainLayout>
  )
}
