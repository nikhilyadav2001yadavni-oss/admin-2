'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Eye, ChevronDown, ChevronUp } from 'lucide-react'
import { transactionAPI } from '@/lib/api'
import { ExportDropdown } from '@/components/ExportDropdown'
import { SearchWithButton } from '@/components/ui/SearchWithButton'

interface TransactionListItem {
  _id: string
  transactionId: string
  userId: string
  userName: string
  userEmail: string
  userReferralCode?: string
  type: string
  amount: number
  currency: string
  status: string
  fee: number
  netAmount: number
  createdAt: string
}


const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'deposit', label: 'Deposits' },
  { value: 'withdrawal', label: 'Withdrawals' },
  { value: 'game', label: 'Games' },
  { value: 'referral', label: 'Referrals' },
  { value: 'roi', label: 'ROI' },
  { value: 'admin_credit', label: 'Admin Credit' },
  { value: 'admin_debit', label: 'Admin Debit' },
]

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'failed', label: 'Failed' },
  { value: 'win', label: 'Win' },
  { value: 'lose', label: 'Lose' },
]

export default function TransactionsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [transactions, setTransactions] = useState<TransactionListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [skip, setSkip] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionListItem | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const fetchTransactions = useCallback(() => {
    setLoading(true)
    setError(null)
    const params: { skip: number; limit: number; fromDate?: string; toDate?: string; status?: string; type?: string; search?: string } = {
      skip,
      limit: pageSize,
    }
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    if (statusFilter !== 'all') params.status = statusFilter
    if (typeFilter !== 'all') params.type = typeFilter
    if (searchQuery.trim()) params.search = searchQuery.trim()
    transactionAPI
      .getAll(params)
      .then((res) => {
        const data = res.data?.data
        const totalCount = res.data?.total ?? 0
        setTransactions(Array.isArray(data) ? data : [])
        setTotal(totalCount)
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load transactions')
        setTransactions([])
      })
      .finally(() => setLoading(false))
  }, [skip, fromDate, toDate, statusFilter, typeFilter, searchQuery, pageSize])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    setSkip(0)
  }, [fromDate, toDate, statusFilter, typeFilter])

  const handleViewDetails = (transaction: TransactionListItem) => {
    setSelectedTransaction(transaction)
    setIsDetailsModalOpen(true)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Transactions</h1>
          <p className="text-gray-600 mt-1">View and manage all platform transactions</p>
        </div>


        {/* Filters - single row on desktop; on mobile search + "More filters" then expandable row */}
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-end gap-3 sm:gap-4">
              <SearchWithButton
                value={searchInput}
                onChange={setSearchInput}
                onSearch={() => { setSearchQuery(searchInput); setSkip(0) }}
                placeholder="Search by transaction ID, user or referral..."
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
              <div className={'w-full ' + (filtersExpanded ? 'flex flex-col gap-3' : 'hidden') + ' sm:contents'}>
                <div className="w-full sm:w-36 shrink-0">
                  <label className="block text-xs text-gray-500 mb-0.5">From date</label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="w-full sm:w-36 shrink-0">
                  <label className="block text-xs text-gray-500 mb-0.5">To date</label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                <div className="w-full sm:w-40 shrink-0">
                  <label className="block text-xs text-gray-500 mb-0.5">Type</label>
                  <Select
                    options={typeOptions}
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
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
                  reportType="transactions"
                  fetchData={async (p) => {
                    const res = await transactionAPI.getAll(p)
                    return { data: res.data?.data ?? res.data?.transactions ?? [] }
                  }}
                  columns={[
                    { key: 'transactionId', label: 'Transaction ID' },
                    { key: 'userReferralCode', label: 'Referral Code' },
                    { key: 'type', label: 'Type' },
                    { key: 'amount', label: 'Amount' },
                    { key: 'currency', label: 'Currency' },
                    { key: 'status', label: 'Status' },
                    { key: 'createdAt', label: 'Created At' },
                  ]}
                  params={{
                    search: searchQuery || undefined,
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    type: typeFilter !== 'all' ? typeFilter : undefined,
                  }}
                  label="Export"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Transactions Table - horizontally scrollable on mobile */}
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
                  <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Transaction ID</TableHead>
                  <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">User</TableHead>
                  <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Referral Code</TableHead>
                  <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Type</TableHead>
                  <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Amount</TableHead>
                  <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Status</TableHead>
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
                {!loading && transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-6 text-xs sm:text-sm">
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  transactions.map((transaction) => (
                    <TableRow key={transaction._id}>
                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        <code
                          className="px-1.5 py-0.5 bg-gray-100 rounded text-xs"
                          title={transaction.transactionId}
                        >
                          <span className="truncate max-w-[6rem] inline-block align-bottom" title={transaction.transactionId}>
                            {transaction.transactionId}
                          </span>
                        </code>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-[8rem]" title={transaction.userName}>
                            {transaction.userName}
                          </p>
                          <p className="text-gray-500 truncate max-w-[8rem] text-xs" title={transaction.userId}>
                            {transaction.userId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs truncate max-w-[6rem] inline-block align-middle" title={transaction.userReferralCode || ''}>
                          {transaction.userReferralCode || '—'}
                        </code>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        <Badge variant="default">{transaction.type}</Badge>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        <span className="font-medium">{formatCurrency(transaction.amount)}</span>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        <Badge
                          variant={
                            transaction.status === 'completed' || transaction.status === 'win'
                              ? 'success'
                              : transaction.status === 'pending'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        {formatDate(transaction.createdAt)}
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Eye className="w-3 h-3" />}
                          className="text-xs px-2 py-1 shrink-0"
                          onClick={() => handleViewDetails(transaction)}
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

        {/* Transaction Details Modal - no Close button like deposits */}
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title="Transaction Details"
          size="lg"
        >
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Transaction ID</p>
                  <p className="font-medium text-gray-900 break-all text-xs">{selectedTransaction.transactionId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">User</p>
                  <p className="font-medium text-gray-900">{selectedTransaction.userName}</p>
                  <p className="text-xs text-gray-500">{selectedTransaction.userEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">User ID</p>
                  <p className="font-medium text-gray-900 break-all">{selectedTransaction.userId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <Badge variant="default">{selectedTransaction.type}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge
                    variant={
                      selectedTransaction.status === 'completed' || selectedTransaction.status === 'win'
                        ? 'success'
                        : selectedTransaction.status === 'pending'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {selectedTransaction.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-medium text-gray-900">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Currency</p>
                  <p className="font-medium text-gray-900">{selectedTransaction.currency || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fee</p>
                  <p className="font-medium text-gray-900">{formatCurrency(selectedTransaction.fee ?? 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Net Amount</p>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(selectedTransaction.netAmount ?? selectedTransaction.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedTransaction.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </MainLayout>
  )
}
