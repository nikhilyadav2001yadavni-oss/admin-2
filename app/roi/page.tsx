'use client'

import React from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { investmentAPI, investmentConfigAPI } from '@/lib/api'
import { useAdminAuth } from '@/lib/useAdminAuth'
import type { Investment as InvestmentRecord } from '@/types'
import { ExportDropdown } from '@/components/ExportDropdown'
import { SearchWithButton } from '@/components/ui/SearchWithButton'
import { Pause, Play, ChevronDown, ChevronUp, TrendingUp, DollarSign, Activity } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All status' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
]

type StatusFilter = 'all' | 'active' | 'paused'
type NullableString = string | null

export default function InvestmentPage() {
  const { isSuperAdmin } = useAdminAuth()
  const [mounted, setMounted] = React.useState(false)
  const [searchInput, setSearchInput] = React.useState('')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [fromDate, setFromDate] = React.useState('')
  const [toDate, setToDate] = React.useState('')
  const [filtersExpanded, setFiltersExpanded] = React.useState(false)
  const [investments, setInvestments] = React.useState<InvestmentRecord[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<NullableString>(null)
  const [skip, setSkip] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(10)
  const [togglingId, setTogglingId] = React.useState<NullableString>(null)
  const [stats, setStats] = React.useState({
    totalInvestmentAmount: 0,
    totalCurrentBalance: 0,
    totalRoiEarned: 0,
    activeInvestments: 0,
  })
  const [statsLoading, setStatsLoading] = React.useState(true)
  const [configForm, setConfigForm] = React.useState({
    directCommissionRate: 3,
    indirectCommissionRate: 1.5,
    monthlyRoiRate: 8,
  })
  const [configSaving, setConfigSaving] = React.useState(false)
  const [configError, setConfigError] = React.useState<NullableString>(null)
  const [configSuccess, setConfigSuccess] = React.useState<NullableString>(null)

  const fetchInvestments = React.useCallback(() => {
    setLoading(true)
    setError(null)
    const params: any = { skip, limit: pageSize }
    if (searchQuery.trim()) params.search = searchQuery.trim()
    if (statusFilter !== 'all') params.status = statusFilter
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    investmentAPI
      .getList(params)
      .then((res) => {
        const data = res.data?.data
        const totalCount = res.data?.total ?? 0
        setInvestments(Array.isArray(data) ? data : [])
        setTotal(totalCount)
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load investments')
        setInvestments([])
      })
      .finally(() => setLoading(false))
  }, [skip, searchQuery, statusFilter, fromDate, toDate, pageSize])

  React.useEffect(() => {
    fetchInvestments()
  }, [fetchInvestments])

  React.useEffect(() => {
    setSkip(0)
  }, [statusFilter, fromDate, toDate])

  const handleSearch = () => {
    setSearchQuery(searchInput.trim())
    setSkip(0)
  }

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    investmentAPI
      .getStats()
      .then((res) => {
        const data = res.data?.data
        if (data) {
          setStats({
            totalInvestmentAmount: data.totalInvestmentAmount || 0,
            totalCurrentBalance: data.totalCurrentBalance || 0,
            totalRoiEarned: data.totalRoiEarned || 0,
            activeInvestments: data.activeInvestments || 0,
          })
        }
      })
      .catch((err) => {
        console.error('Failed to load investment stats:', err)
      })
      .finally(() => setStatsLoading(false))
  }, [])

  React.useEffect(() => {
    if (!isSuperAdmin) return
    investmentConfigAPI
      .get()
      .then((res) => {
        const data = res.data?.data
        if (data) {
          setConfigForm({
            directCommissionRate: data.directCommissionRate ?? 3,
            indirectCommissionRate: data.indirectCommissionRate ?? 1.5,
            monthlyRoiRate: data.monthlyRoiRate ?? 8,
          })
        }
      })
      .catch(() => {})
  }, [isSuperAdmin])

  function handleSaveRates(e: React.FormEvent) {
    e.preventDefault()
    setConfigError(null)
    setConfigSuccess(null)
    setConfigSaving(true)
    const { directCommissionRate, indirectCommissionRate, monthlyRoiRate } = configForm
    if (
      directCommissionRate < 0 || directCommissionRate > 100 ||
      indirectCommissionRate < 0 || indirectCommissionRate > 100 ||
      monthlyRoiRate < 0 || monthlyRoiRate > 100
    ) {
      setConfigError('All rates must be between 0 and 100')
      setConfigSaving(false)
      return
    }
    investmentConfigAPI
      .update(configForm)
      .then(() => {
        setConfigSuccess('Investment rates updated successfully')
        setTimeout(() => setConfigSuccess(null), 3000)
      })
      .catch((err) => setConfigError(err.response?.data?.message || 'Failed to update'))
      .finally(() => setConfigSaving(false))
  }

  function handlePauseStart(inv: InvestmentRecord) {
    const newActive = !inv.isActive
    setTogglingId(inv._id)
    investmentAPI
      .setActive(inv._id, newActive)
      .then(() => fetchInvestments())
      .catch((err) => setError(err.response?.data?.message || 'Failed to update investment'))
      .finally(() => setTogglingId(null))
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investment</h1>
          <p className="text-gray-600 mt-1">View and manage user investments (ROI records)</p>
        </div>

        {/* Stats Cards */}
        {statsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Total Investment"
              value={formatCurrency(stats.totalInvestmentAmount)}
              icon={<DollarSign className="w-6 h-6" />}
              color="primary"
            />
            <StatCard
              title="Current Balance"
              value={formatCurrency(stats.totalCurrentBalance)}
              icon={<TrendingUp className="w-6 h-6" />}
              color="success"
            />
            <StatCard
              title="Total ROI Earned"
              value={formatCurrency(stats.totalRoiEarned)}
              icon={<TrendingUp className="w-6 h-6" />}
              color="warning"
            />
            <StatCard
              title="Active Investments"
              value={stats.activeInvestments.toString()}
              icon={<Activity className="w-6 h-6" />}
              color="info"
            />
          </div>
        )}

        {/* Investment Rates - Super Admin only (render after mount to avoid hydration mismatch) */}
        {mounted && isSuperAdmin && (
          <Card>
            <CardBody className="py-4">
              <form onSubmit={handleSaveRates} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
                <div className="sm:min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">Investment Rates</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Configure direct, indirect and ROI percentages</p>
                </div>
                <div className="flex flex-wrap items-end gap-x-6 gap-y-4 sm:gap-x-8">
                <div className="w-28 shrink-0">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Direct (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={configForm.directCommissionRate}
                    onChange={(e) =>
                      setConfigForm((f) => ({ ...f, directCommissionRate: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full"
                  />
                </div>
                <div className="w-28 shrink-0">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Indirect (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={configForm.indirectCommissionRate}
                    onChange={(e) =>
                      setConfigForm((f) => ({ ...f, indirectCommissionRate: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full"
                  />
                </div>
                <div className="w-28 shrink-0">
                  <label className="block text-xs font-medium text-gray-600 mb-1">ROI (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={configForm.monthlyRoiRate}
                    onChange={(e) =>
                      setConfigForm((f) => ({ ...f, monthlyRoiRate: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full"
                  />
                </div>
                <Button type="submit" size="sm" disabled={configSaving} className="shrink-0">
                  {configSaving ? 'Saving...' : 'Update rates'}
                </Button>
                {configError && (
                  <span className="text-sm text-red-600 flex items-center min-h-[2.25rem]">{configError}</span>
                )}
                {configSuccess && (
                  <span className="text-sm text-green-600 flex items-center min-h-[2.25rem]">{configSuccess}</span>
                )}
                </div>
              </form>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody>
            <div className="flex flex-wrap items-end gap-3 sm:gap-4">
              <SearchWithButton
                value={searchInput}
                onChange={setSearchInput}
                onSearch={handleSearch}
                placeholder="Search by user email or name..."
              />

              {/* More filters button - only visible on mobile */}
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

              {/* Other filters - hidden on mobile (inside More filters), visible on desktop */}
              <div className={`w-full ${filtersExpanded ? 'flex flex-col gap-3' : 'hidden'} sm:contents`}>
                <div className="w-full sm:w-36 shrink-0">
                  <label className="block text-xs text-gray-500 mb-0.5">Status</label>
                  <Select
                    value={statusFilter}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === 'active' || v === 'paused' || v === 'all') {
                        setStatusFilter(v)
                      }
                    }}
                    options={STATUS_OPTIONS}
                  />
                </div>
                <div className="w-full sm:w-36 shrink-0">
                  <label className="block text-xs text-gray-500 mb-0.5">From date</label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="w-full sm:w-36 shrink-0">
                  <label className="block text-xs text-gray-500 mb-0.5">To date</label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                <ExportDropdown
                  reportType="investments"
                  fetchData={async (p) => {
                    const res = await investmentAPI.getList(p as Parameters<typeof investmentAPI.getList>[0])
                    return { data: res.data?.data ?? res.data?.investments ?? [] }
                  }}
                  columns={[
                    { key: 'userId', label: 'User ID' },
                    { key: 'userReferralCode', label: 'Referral Code' },
                    { key: 'amount', label: 'Amount' },
                    { key: 'status', label: 'Status' },
                    { key: 'isActive', label: 'Active' },
                    { key: 'createdAt', label: 'Created At' },
                  ]}
                  params={{
                    search: searchQuery || undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined,
                  }}
                  label="Export"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-0">
            {error && (
              <div className="p-4 bg-danger-50 border-b border-danger-200">
                <p className="text-danger-600 text-sm">{error}</p>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table className="min-w-[900px] text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">User</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Referral Code</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Principal</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Current Balance</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Lock-in Period</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Lock-in Start</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Lock-in End</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Total ROI Earned</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Status</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500 text-xs">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : investments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500 text-xs">
                        No investments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    investments.map((inv) => (
                      <TableRow key={inv._id}>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <span className="font-medium text-gray-900 truncate max-w-[10rem] block text-xs" title={inv.user?.email || inv.userId}>
                            {inv.user?.email || inv.user?.name || inv.userId || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs truncate max-w-[6rem] inline-block align-middle" title={inv.userReferralCode || inv.user?.referralCode || ''}>
                            {inv.userReferralCode || inv.user?.referralCode || '—'}
                          </code>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap text-xs">{formatCurrency(inv.principalAmount)}</TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap text-xs">{formatCurrency(inv.currentBalance)}</TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap text-xs">{inv.lockInPeriod} days</TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap text-xs">{formatDateShort(inv.lockInStartDate)}</TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap text-xs">{formatDateShort(inv.lockInEndDate)}</TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap text-xs text-success-600">
                          {formatCurrency(inv.totalRoiEarned)}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <Badge variant={inv.isActive ? 'success' : 'default'} className="text-xs">
                            {inv.isActive ? 'Active' : 'Paused'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant={inv.isActive ? 'secondary' : 'primary'}
                            leftIcon={inv.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            onClick={() => handlePauseStart(inv)}
                            disabled={togglingId === inv._id}
                          >
                            {togglingId === inv._id ? 'Updating...' : inv.isActive ? 'Pause' : 'Start'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {!loading && total > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
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
    </MainLayout>
  )
}
