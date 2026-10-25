'use client'

import React, { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { Users, Wallet, TrendingUp, TrendingDown, Gamepad2, DollarSign } from 'lucide-react'
import { dashboardAPI, transactionAPI } from '@/lib/api'

interface DashboardStats {
  totalUsers: { count: number; percentageChange: number; trend: string }
  activeUsers: { count: number; percentageChange: number; trend: string }
  totalDeposits: { amount: number; percentageChange: number; trend: string }
  totalWithdrawals: { amount: number; percentageChange: number; trend: string }
  gamesPlayed: { count: number; percentageChange: number; trend: string }
  platformRevenue: { amount: number; percentageChange: number; trend: string }
  pendingWithdrawals: { count: number }
  pendingDeposits: { count: number }
}
interface RecentTransaction {
  user: string
  type: string
  amount: number
  status: string
  transactionId?: string
  date?: string
}

interface RecentGame {
  user: string
  game: string
  bet: number
  result: string
  gameId?: string
  date?: string
}

const TABLE_LIMIT = 5

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [recentGames, setRecentGames] = useState<RecentGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      dashboardAPI.getStats(),
      dashboardAPI.getRecentTransactions(TABLE_LIMIT),
      dashboardAPI.getRecentGames(TABLE_LIMIT),
    ])
      .then(([statsRes, txRes, gamesRes]) => {
        if (cancelled) return
        const statsData = statsRes.data?.data
        if (statsData) setStats(statsData)
        else setError('Invalid stats response')
        const txData = txRes.data?.data
        if (Array.isArray(txData)) setRecentTransactions(txData)
        const gamesData = gamesRes.data?.data
        if (Array.isArray(gamesData)) setRecentGames(gamesData)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.response?.data?.message || 'Failed to load dashboard data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Welcome back! Here&apos;s what&apos;s happening today.</p>
        </div>

        {/* Stats Grid */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          </div>
        )}
        {error && (
          <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
            <p className="text-danger-600">{error}</p>
          </div>
        )}
        {!loading && !error && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Users"
              value={stats.totalUsers.count.toLocaleString()}
              icon={<Users className="w-6 h-6" />}
              color="primary"
              trend={{
                value: Math.abs(stats.totalUsers.percentageChange),
                isPositive: stats.totalUsers.trend === 'up',
              }}
            />
            <StatCard
              title="Active Users"
              value={stats.activeUsers.count.toLocaleString()}
              icon={<Users className="w-6 h-6" />}
              color="success"
              trend={{
                value: Math.abs(stats.activeUsers.percentageChange),
                isPositive: stats.activeUsers.trend === 'up',
              }}
            />
            <StatCard
              title="Total Deposits"
              value={formatCurrency(stats.totalDeposits.amount)}
              icon={<TrendingUp className="w-6 h-6" />}
              color="success"
              trend={{
                value: Math.abs(stats.totalDeposits.percentageChange),
                isPositive: stats.totalDeposits.trend === 'up',
              }}
            />
            <StatCard
              title="Total Withdrawals"
              value={formatCurrency(stats.totalWithdrawals.amount)}
              icon={<TrendingDown className="w-6 h-6" />}
              color="warning"
              trend={{
                value: Math.abs(stats.totalWithdrawals.percentageChange),
                isPositive: stats.totalWithdrawals.trend === 'up',
              }}
            />
            <StatCard
              title="Games Played"
              value={stats.gamesPlayed.count.toLocaleString()}
              icon={<Gamepad2 className="w-6 h-6" />}
              color="primary"
              trend={{
                value: Math.abs(stats.gamesPlayed.percentageChange),
                isPositive: stats.gamesPlayed.trend === 'up',
              }}
            />
            <StatCard
              title="Platform Revenue"
              value={formatCurrency(stats.platformRevenue.amount)}
              icon={<DollarSign className="w-6 h-6" />}
              color="success"
              trend={{
                value: Math.abs(stats.platformRevenue.percentageChange),
                isPositive: stats.platformRevenue.trend === 'up',
              }}
            />
            <StatCard
              title="Pending Withdrawals"
              value={stats.pendingWithdrawals.count}
              icon={<Wallet className="w-6 h-6" />}
              color="warning"
            />
            <StatCard
              title="Pending Deposits"
              value={stats.pendingDeposits.count}
              icon={<Wallet className="w-6 h-6" />}
              color="warning"
            />
          </div>
        )}

        {/* Recent Transactions & Games */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            </CardHeader>
            <CardBody className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500 py-6">
                        No recent transactions
                      </TableCell>
                    </TableRow>
                  )}
                  {recentTransactions.map((transaction, index) => (
                    <TableRow key={transaction.transactionId || `tx-${index}`}>
                      <TableCell>{transaction.user}</TableCell>
                      <TableCell>
                        <Badge variant="default">{transaction.type}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            transaction.status === 'completed'
                              ? 'success'
                              : transaction.status === 'pending'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {transaction.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>

          {/* Recent Games */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Recent Games</h2>
            </CardHeader>
            <CardBody className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Bet</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentGames.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500 py-6">
                        No recent games
                      </TableCell>
                    </TableRow>
                  )}
                  {recentGames.map((game, index) => (
                    <TableRow key={game.gameId || `game-${index}`}>
                      <TableCell>{game.user}</TableCell>
                      <TableCell>
                        <Badge variant="info">{game.game}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(game.bet)}</TableCell>
                      <TableCell>
                        <Badge variant={game.result === 'win' ? 'success' : 'danger'}>
                          {game.result}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
