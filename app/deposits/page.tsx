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
import { formatCurrency, formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { ArrowDownToLine, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import { depositStatsAPI, depositAPI } from '@/lib/api'
import { ExportDropdown } from '@/components/ExportDropdown'
import { SearchWithButton } from '@/components/ui/SearchWithButton'

interface DepositStatsByCurrency {
  symbol: string
  name: string
  colorCode: string | null
  totalDeposits: number
  pendingDeposits: number
  approvedToday: number
  rejectedToday: number
}

interface DepositListItem {
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
  transactionHash?: string
  createdAt: string
}


export default function DepositsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState<string>('all')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [depositStats, setDepositStats] = useState<DepositStatsByCurrency[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [deposits, setDeposits] = useState<DepositListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [skip, setSkip] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedDeposit, setSelectedDeposit] = useState<DepositListItem | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  useEffect(() => {
    depositStatsAPI
      .getDepositStats()
      .then((res) => {
        const data = res.data?.data
        setDepositStats(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        setStatsError(err.response?.data?.message || 'Failed to load deposit stats')
        setDepositStats([])
      })
      .finally(() => setStatsLoading(false))
  }, [])

  const fetchDeposits = useCallback(() => {
    setLoading(true)
    setError(null)
    const params: { skip: number; limit: number; currency?: string; fromDate?: string; toDate?: string; status?: string; search?: string } = {
      skip,
      limit: pageSize,
    }
    if (currencyFilter !== 'all') params.currency = currencyFilter
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    if (statusFilter !== 'all') params.status = statusFilter
    if (searchQuery.trim()) params.search = searchQuery.trim()
    depositAPI
      .getAll(params)
      .then((res) => {
        const data = res.data?.data
        const totalCount = res.data?.total ?? 0
        setDeposits(Array.isArray(data) ? data : [])
        setTotal(totalCount)
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load deposits')
        setDeposits([])
      })
      .finally(() => setLoading(false))
  }, [skip, currencyFilter, fromDate, toDate, statusFilter, searchQuery, pageSize])

  useEffect(() => {
    fetchDeposits()
  }, [fetchDeposits])

  useEffect(() => {
    setSkip(0)
  }, [currencyFilter, fromDate, toDate, statusFilter])

  const handleSearch = () => {
    setSearchQuery(searchInput.trim())
    setSkip(0)
  }

  const currencyOptions = useMemo(
    () => [
      { value: 'all', label: 'All Currencies' },
      ...depositStats.map((s) => ({ value: s.symbol, label: s.symbol })),
    ],
    [depositStats]
  )

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'duplicate_hash', label: 'Duplicate Hash' },
  ]

  const handleViewDetails = (deposit: DepositListItem) => {
    setSelectedDeposit(deposit)
    setIsDetailsModalOpen(true)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Deposit Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage user deposit requests</p>
        </div>

        {/* Deposit stats by currency (from DB currency list) */}
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
        {!statsLoading && !statsError && depositStats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {depositStats.map((stat) => (
              <StatCard
                key={stat.symbol}
                title={`TOTAL ${stat.symbol} DEPOSIT`}
                value={formatCurrency(stat.totalDeposits)}
                icon={<ArrowDownToLine className="w-6 h-6" />}
                color="success"
              />
            ))}
          </div>
        )}
        {!statsLoading && !statsError && depositStats.length === 0 && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-600">No currencies configured. Add currencies in settings to see deposit stats.</p>
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
                <div className="w-full sm:w-40 shrink-0">
                  <label className="block text-xs text-gray-500 mb-0.5">Currency</label>
                  <Select
                    options={currencyOptions}
                    value={currencyFilter}
                    onChange={(e) => setCurrencyFilter(e.target.value)}
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
                <div className="w-full sm:w-40 shrink-0">
                  <label className="block text-xs text-gray-500 mb-0.5">Status</label>
                  <Select
                    options={statusOptions}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  />
                </div>
                <ExportDropdown
                  reportType="deposits"
                  fetchData={async (p) => {
                    const res = await depositAPI.getAll(p)
                    return { data: res.data?.data ?? res.data?.deposits ?? [] }
                  }}
                  columns={[
                    { key: 'transactionId', label: 'Transaction ID' },
                    { key: 'userName', label: 'User' },
                    { key: 'userReferralCode', label: 'Referral Code' },
                    { key: 'amount', label: 'Amount' },
                    { key: 'currency', label: 'Currency' },
                    { key: 'status', label: 'Status' },
                    { key: 'createdAt', label: 'Created At' },
                  ]}
                  params={{
                    search: searchQuery || undefined,
                    currency: currencyFilter !== 'all' ? currencyFilter : undefined,
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

        {/* Deposits Table - horizontally scrollable on mobile */}
        <Card>
          <CardBody className="p-0">
            {error && (
              <div className="p-4 bg-danger-50 border-b border-danger-200">
                <p className="text-danger-600 text-sm">{error}</p>
              </div>
            )}
            <Table className="w-full min-w-[700px] text-xs sm:text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-32 sm:w-auto">User</TableHead>
                      <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-24 sm:w-auto">Referral Code</TableHead>
                      <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-24 sm:w-auto">Amount</TableHead>
                      <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-20 sm:w-auto">Currency</TableHead>
                      <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-28 sm:w-auto">Transaction ID</TableHead>
                      <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-24 sm:w-auto">Status</TableHead>
                      <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-28 sm:w-auto">Date</TableHead>
                      <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-20 sm:w-auto">Actions</TableHead>
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
                    {!loading && deposits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-500 py-6 text-xs sm:text-sm">
                          No deposits found
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading &&
                      deposits.map((deposit) => (
                        <TableRow key={deposit._id}>
                          <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate max-w-[8rem]" title={deposit.userName}>
                                {deposit.userName}
                              </p>
                              <p className="text-gray-500 truncate max-w-[8rem] text-xs" title={deposit.userId}>
                                {deposit.userId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs truncate max-w-[6rem] inline-block align-middle" title={deposit.userReferralCode || ''}>
                            {deposit.userReferralCode || '—'}
                          </code>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <span className="font-medium text-success-600">
                            {formatCurrency(deposit.amount)}
                            </span>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                            <Badge variant="default">{deposit.currency || '—'}</Badge>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                            <code
                              className="px-1.5 py-0.5 bg-gray-100 rounded text-xs"
                              title={deposit.transactionId}
                            >
                              <span className="truncate max-w-[6rem] inline-block align-bottom" title={deposit.transactionId}>
                                {deposit.transactionId}
                              </span>
                            </code>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                            <Badge
                              variant={
                                deposit.status === 'completed'
                                  ? 'success'
                                  : deposit.status === 'pending'
                                  ? 'warning'
                                  : deposit.status === 'duplicate_hash'
                                  ? 'default'
                                  : 'danger'
                              }
                            >
                              {deposit.status === 'duplicate_hash' ? 'Duplicate Hash' : deposit.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                            {formatDate(deposit.createdAt)}
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<Eye className="w-3 h-3" />}
                              className="text-xs px-2 py-1 shrink-0"
                              onClick={() => handleViewDetails(deposit)}
                              title="View details"
                            >
                              View
                            </Button>
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

        {/* Deposit details modal */}
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title="Deposit Details"
          size="lg"
        >
          {selectedDeposit && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">User</p>
                  <p className="font-medium text-gray-900">{selectedDeposit.userName}</p>
                  <p className="text-xs text-gray-500">{selectedDeposit.userEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">User ID</p>
                  <p className="font-medium text-gray-900 break-all">{selectedDeposit.userId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Transaction ID</p>
                  <p className="font-medium text-gray-900 break-all">{selectedDeposit.transactionId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge
                    variant={
                      selectedDeposit.status === 'completed'
                        ? 'success'
                        : selectedDeposit.status === 'pending'
                        ? 'warning'
                        : selectedDeposit.status === 'duplicate_hash'
                        ? 'default'
                        : 'danger'
                    }
                  >
                    {selectedDeposit.status === 'duplicate_hash' ? 'Duplicate Hash' : selectedDeposit.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-medium text-success-600">
                    {formatCurrency(selectedDeposit.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Currency</p>
                  <p className="font-medium text-gray-900">{selectedDeposit.currency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Network</p>
                  <p className="font-medium text-gray-900">{selectedDeposit.network || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fee</p>
                  <p className="font-medium text-gray-900">{formatCurrency(selectedDeposit.fee ?? 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Net Amount</p>
                  <p className="font-medium text-gray-900">{formatCurrency(selectedDeposit.netAmount ?? selectedDeposit.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedDeposit.createdAt)}</p>
                </div>
                {(selectedDeposit.transactionHash != null && selectedDeposit.transactionHash !== '') && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-600">
                      {selectedDeposit.status === 'duplicate_hash' ? 'Duplicate Transaction Hash (attempted)' : 'Transaction Hash'}
                    </p>
                    <p className="font-medium text-gray-900 break-all text-xs">
                      {selectedDeposit.transactionHash}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </MainLayout>
  )
}
