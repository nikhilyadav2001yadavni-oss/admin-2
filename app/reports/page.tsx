'use client'

import React, { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { StatCard } from '@/components/ui/StatCard'
import { formatCurrency } from '@/lib/utils'
import { BarChart3, Users, DollarSign, TrendingUp, Gamepad2 } from 'lucide-react'
import {
  userAPI,
  transactionAPI,
  depositAPI,
  withdrawalAPI,
  gameAPI,
} from '@/lib/api'
import { ExportDropdown } from '@/components/ExportDropdown'

// ─── Column definitions ───────────────────────────────────────────────────────

const USER_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created At' },
]

const TRANSACTION_COLUMNS = [
  { key: 'type', label: 'Type' },
  { key: 'amount', label: 'Amount' },
  { key: 'currency', label: 'Currency' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created At' },
]

const DEPOSIT_COLUMNS = [
  { key: 'amount', label: 'Amount' },
  { key: 'currency', label: 'Currency' },
  { key: 'status', label: 'Status' },
  { key: 'txHash', label: 'TX Hash' },
  { key: 'createdAt', label: 'Created At' },
]

const WITHDRAWAL_COLUMNS = [
  { key: 'amount', label: 'Amount' },
  { key: 'currency', label: 'Currency' },
  { key: 'status', label: 'Status' },
  { key: 'walletAddress', label: 'Wallet Address' },
  { key: 'createdAt', label: 'Created At' },
]

const GAME_COLUMNS = [
  { key: 'name', label: 'Game Name' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created At' },
]

const REVENUE_COLUMNS = [
  { key: 'type', label: 'Type' },
  { key: 'amount', label: 'Amount' },
  { key: 'currency', label: 'Currency' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created At' },
]

// ─── fetchData helpers ────────────────────────────────────────────────────────

async function fetchUsers(params?: Record<string, unknown>) {
  const res = await userAPI.getAll({ limit: 10000, ...params })
  return { data: res.data?.data ?? res.data?.users ?? [] }
}

async function fetchTransactions(params?: Record<string, unknown>) {
  const res = await transactionAPI.getAll({ limit: 10000, ...params })
  return { data: res.data?.data ?? res.data?.transactions ?? [] }
}

async function fetchDeposits(params?: Record<string, unknown>) {
  const res = await depositAPI.getAll({ limit: 10000, ...params })
  return { data: res.data?.data ?? res.data?.deposits ?? [] }
}

async function fetchWithdrawals(params?: Record<string, unknown>) {
  const res = await withdrawalAPI.getAll({ limit: 10000, ...params })
  return { data: res.data?.data ?? res.data?.withdrawals ?? [] }
}

async function fetchGames(params?: Record<string, unknown>) {
  const res = await gameAPI.getAll({ limit: 10000, ...params })
  return { data: res.data?.data ?? res.data?.games ?? [] }
}

async function fetchRevenue(params?: Record<string, unknown>) {
  const res = await transactionAPI.getAll({ limit: 10000, type: 'revenue', ...params })
  return { data: res.data?.data ?? res.data?.transactions ?? [] }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod] = useState('today')

  // Mock stats — replace with real API calls when the overview endpoint is ready
  const reportStats = {
    totalRevenue: 125000,
    totalUsers: 1234,
    totalGames: 5678,
    platformProfit: 45000,
  }

  const periodParam = { period }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-1">View platform analytics and export reports</p>
          </div>
          <Select
            options={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' },
              { value: 'year', label: 'This Year' },
            ]}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(reportStats.totalRevenue)}
            icon={<DollarSign className="w-6 h-6" />}
            color="success"
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatCard
            title="Total Users"
            value={reportStats.totalUsers.toLocaleString()}
            icon={<Users className="w-6 h-6" />}
            color="primary"
            trend={{ value: 8.3, isPositive: true }}
          />
          <StatCard
            title="Total Games"
            value={reportStats.totalGames.toLocaleString()}
            icon={<Gamepad2 className="w-6 h-6" />}
            color="primary"
            trend={{ value: 15.7, isPositive: true }}
          />
          <StatCard
            title="Platform Profit"
            value={formatCurrency(reportStats.platformProfit)}
            icon={<TrendingUp className="w-6 h-6" />}
            color="success"
            trend={{ value: 22.1, isPositive: true }}
          />
        </div>

        {/* Export Reports */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Export Reports</h2>
            <p className="text-sm text-gray-500 mt-1">
              Data is fetched live and exported client-side as Excel, CSV, or PDF.
            </p>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <span className="text-sm font-medium text-gray-700">User Report</span>
                <ExportDropdown
                  reportType="users"
                  fetchData={fetchUsers}
                  columns={USER_COLUMNS}
                  params={periodParam}
                  label="Export"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <span className="text-sm font-medium text-gray-700">Transaction Report</span>
                <ExportDropdown
                  reportType="transactions"
                  fetchData={fetchTransactions}
                  columns={TRANSACTION_COLUMNS}
                  params={periodParam}
                  label="Export"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <span className="text-sm font-medium text-gray-700">Deposit Report</span>
                <ExportDropdown
                  reportType="deposits"
                  fetchData={fetchDeposits}
                  columns={DEPOSIT_COLUMNS}
                  params={periodParam}
                  label="Export"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <span className="text-sm font-medium text-gray-700">Withdrawal Report</span>
                <ExportDropdown
                  reportType="withdrawals"
                  fetchData={fetchWithdrawals}
                  columns={WITHDRAWAL_COLUMNS}
                  params={periodParam}
                  label="Export"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <span className="text-sm font-medium text-gray-700">Game Report</span>
                <ExportDropdown
                  reportType="games"
                  fetchData={fetchGames}
                  columns={GAME_COLUMNS}
                  params={periodParam}
                  label="Export"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <span className="text-sm font-medium text-gray-700">Revenue Report</span>
                <ExportDropdown
                  reportType="revenue"
                  fetchData={fetchRevenue}
                  columns={REVENUE_COLUMNS}
                  params={periodParam}
                  label="Export"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Charts Placeholder */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Analytics Charts</h2>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Charts will be displayed here</p>
                <p className="text-sm text-gray-500 mt-2">
                  Integrate with recharts or any charting library
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </MainLayout>
  )
}
