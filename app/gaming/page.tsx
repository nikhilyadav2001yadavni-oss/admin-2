'use client'

import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Switch } from '@/components/ui/Switch'
import { StatCard } from '@/components/ui/StatCard'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { Gamepad2, TrendingUp, TrendingDown, Settings, DollarSign, Plus, Trash2 } from 'lucide-react'
import { gameAPI, gameConfigAPI } from '@/lib/api'
import type { GameConfig } from '@/types'

interface GameStats {
  totalGames: number
  totalBets: number
  totalWins: number
  totalLosses: number
  platformProfit: number
}

export default function GamingPage() {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<GameConfig | null>(null)
  const [gameStats, setGameStats] = useState<GameStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [gameConfigs, setGameConfigs] = useState<GameConfig[]>([])
  const [configsLoading, setConfigsLoading] = useState(true)
  const [configsError, setConfigsError] = useState<string | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    gameAPI
      .getStats()
      .then((res) => {
        const data = res.data?.data
        setGameStats(data ?? null)
      })
      .catch((err) => {
        setStatsError(err.response?.data?.message || 'Failed to load game stats')
        setGameStats(null)
      })
      .finally(() => setStatsLoading(false))
  }, [])

  const fetchGameConfigs = () => {
    setConfigsLoading(true)
    setConfigsError(null)
    gameConfigAPI
      .getAll()
      .then((res) => {
        const list = (res.data?.data?.configs ?? [])
        setGameConfigs(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        setConfigsError(err.response?.data?.message || 'Failed to load game configurations')
        setGameConfigs([])
      })
      .finally(() => setConfigsLoading(false))
  }

  useEffect(() => {
    fetchGameConfigs()
  }, [])

  const handleOpenSettings = (game: GameConfig) => {
    setSelectedGame({ ...game })
    setSaveError(null)
    setIsSettingsModalOpen(true)
  }

  const handleSaveSettings = () => {
    if (!selectedGame) return
    setSaveError(null)
    setSaveLoading(true)
    const payload = {
      gameName: selectedGame.gameName,
      maxUserProfit: selectedGame.maxUserProfit,
      maxUserLoss: selectedGame.maxUserLoss,
      winProbability: selectedGame.winProbability,
      winMultiplier: selectedGame.winMultiplier,
      platformBalanceBuffer: selectedGame.platformBalanceBuffer,
      maxSmallWinAmount: selectedGame.maxSmallWinAmount,
      minBetAmount: selectedGame.minBetAmount,
      maxBetAmount: selectedGame.maxBetAmount,
      isActive: selectedGame.isActive,
      metadata: selectedGame.metadata,
    }
    gameConfigAPI
      .update(selectedGame._id, payload)
      .then(() => {
        fetchGameConfigs()
        setIsSettingsModalOpen(false)
      })
      .catch((err) => {
        setSaveError(err.response?.data?.message || 'Failed to update game configuration')
      })
      .finally(() => setSaveLoading(false))
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gaming Management</h1>
          <p className="text-gray-600 mt-1">Manage games, bets, and gaming configurations</p>
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
                {!statsLoading && !statsError && gameStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard
              title="Total Games"
              value={gameStats.totalGames.toLocaleString()}
              icon={<Gamepad2 className="w-6 h-6" />}
              color="primary"
            />
            <StatCard
              title="Total Bets"
              value={formatCurrency(gameStats.totalBets)}
              icon={<DollarSign className="w-6 h-6" />}
              color="primary"
            />
            <StatCard
              title="Total Wins"
              value={formatCurrency(gameStats.totalWins)}
              icon={<TrendingUp className="w-6 h-6" />}
              color="success"
            />
            <StatCard
              title="Total Losses"
              value={formatCurrency(gameStats.totalLosses)}
              icon={<TrendingDown className="w-6 h-6" />}
              color="danger"
            />
            <StatCard
              title="Platform Profit"
              value={formatCurrency(gameStats.platformProfit)}
              icon={<DollarSign className="w-6 h-6" />}
              color="success"
            />
          </div>
        )}

        {/* Game Configurations */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Game Configurations</h2>
          </CardHeader>
          <CardBody className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game Name</TableHead>
                  <TableHead>Win Probability</TableHead>
                  <TableHead>Win Multiplier</TableHead>
                  <TableHead>Bet Range</TableHead>
                  <TableHead>Max User Profit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configsLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-6">
                      Loading...
                    </TableCell>
                  </TableRow>
                )}
                {!configsLoading && configsError && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-danger-600 py-6">
                      {configsError}
                    </TableCell>
                  </TableRow>
                )}
                {!configsLoading && !configsError && gameConfigs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-6">
                      No game configurations found
                    </TableCell>
                  </TableRow>
                )}
                {!configsLoading && !configsError && gameConfigs.map((game) => (
                  <TableRow key={game._id}>
                    <TableCell>
                      <p className="font-medium text-gray-900">{game.gameName}</p>
                    </TableCell>
                    <TableCell>{formatPercentage(game.winProbability)}</TableCell>
                    <TableCell>{game.winMultiplier}x</TableCell>
                    <TableCell>
                      {formatCurrency(game.minBetAmount)} - {formatCurrency(game.maxBetAmount)}
                    </TableCell>
                    <TableCell>{formatCurrency(game.maxUserProfit)}</TableCell>
                    <TableCell>
                      <Badge variant={game.isActive ? 'success' : 'default'}>
                        {game.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenSettings(game)}
                          leftIcon={<Settings className="w-4 h-4" />}
                        >
                          Settings
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>

      {/* Game Settings Modal */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Game Settings"
        size="lg"
      >
        {selectedGame && (
          <div className="space-y-6">
            {/* Game Status */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedGame.gameName}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Enable/Disable {selectedGame.gameName}
                  </p>
                </div>
                <Switch
                  checked={selectedGame.isActive}
                  onChange={(checked) => {
                    setSelectedGame({ ...selectedGame, isActive: checked })
                  }}
                />
              </div>
            </div>

            {/* Betting Configuration */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Betting Configuration</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Minimum Bet Amount ($)"
                  type="number"
                  value={selectedGame.minBetAmount}
                  onChange={(e) =>
                    setSelectedGame({
                      ...selectedGame,
                      minBetAmount: parseFloat(e.target.value),
                    })
                  }
                />
                <Input
                  label="Maximum Bet Amount ($)"
                  type="number"
                  value={selectedGame.maxBetAmount}
                  onChange={(e) =>
                    setSelectedGame({
                      ...selectedGame,
                      maxBetAmount: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            {/* Win Configuration */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Win Configuration</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Win Probability (0.0 - 1.0)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={selectedGame.winProbability}
                  onChange={(e) =>
                    setSelectedGame({
                      ...selectedGame,
                      winProbability: parseFloat(e.target.value),
                    })
                  }
                />
                <Input
                  label="Win Multiplier"
                  type="number"
                  step="0.1"
                  min="1"
                  value={selectedGame.winMultiplier}
                  onChange={(e) =>
                    setSelectedGame({
                      ...selectedGame,
                      winMultiplier: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            {/* Platform Protection */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Platform Protection</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Max User Profit ($)"
                  type="number"
                  value={selectedGame.maxUserProfit}
                  onChange={(e) =>
                    setSelectedGame({
                      ...selectedGame,
                      maxUserProfit: parseFloat(e.target.value),
                    })
                  }
                  helperText="Maximum profit a user can make"
                />
                <Input
                  label="Platform Balance Buffer"
                  type="number"
                  step="0.1"
                  min="1"
                  value={selectedGame.platformBalanceBuffer}
                  onChange={(e) =>
                    setSelectedGame({
                      ...selectedGame,
                      platformBalanceBuffer: parseFloat(e.target.value),
                    })
                  }
                  helperText="Safety buffer for platform (e.g., 1.1 = 10%)"
                />
              </div>
            </div>

            {/* Metadata: Description & Notes */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Metadata</h4>
              <div className="space-y-4">
                <Textarea
                  label="Description"
                  placeholder="Game description shown to users..."
                  value={selectedGame.metadata?.description ?? ''}
                  onChange={(e) =>
                    setSelectedGame({
                      ...selectedGame,
                      metadata: {
                        ...selectedGame.metadata,
                        description: e.target.value,
                        rules: selectedGame.metadata?.rules ?? [],
                        notes: selectedGame.metadata?.notes ?? '',
                      },
                    })
                  }
                  rows={3}
                />
                <Textarea
                  label="Notes"
                  placeholder="Internal notes (optional)..."
                  value={selectedGame.metadata?.notes ?? ''}
                  onChange={(e) =>
                    setSelectedGame({
                      ...selectedGame,
                      metadata: {
                        ...selectedGame.metadata,
                        description: selectedGame.metadata?.description ?? '',
                        rules: selectedGame.metadata?.rules ?? [],
                        notes: e.target.value,
                      },
                    })
                  }
                  rows={2}
                />
              </div>
            </div>

            {/* Rules: add, remove, update */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Game Rules</h4>
              <p className="text-sm text-gray-500 mb-3">Add, edit, or remove rules. Each line is one rule.</p>
              <div className="space-y-2">
                {(selectedGame.metadata?.rules ?? []).map((rule, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      placeholder={`Rule ${index + 1}`}
                      value={rule}
                      onChange={(e) => {
                        const rules = [...(selectedGame.metadata?.rules ?? [])]
                        rules[index] = e.target.value
                        setSelectedGame({
                          ...selectedGame,
                          metadata: {
                            ...selectedGame.metadata,
                            description: selectedGame.metadata?.description ?? '',
                            rules,
                            notes: selectedGame.metadata?.notes ?? '',
                          },
                        })
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-danger-600 hover:bg-danger-50 shrink-0"
                      onClick={() => {
                        const rules = (selectedGame.metadata?.rules ?? []).filter((_, i) => i !== index)
                        setSelectedGame({
                          ...selectedGame,
                          metadata: {
                            ...selectedGame.metadata,
                            description: selectedGame.metadata?.description ?? '',
                            rules,
                            notes: selectedGame.metadata?.notes ?? '',
                          },
                        })
                      }}
                      leftIcon={<Trash2 className="w-4 h-4" />}
                      title="Remove rule"
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setSelectedGame({
                      ...selectedGame,
                      metadata: {
                        ...selectedGame.metadata,
                        description: selectedGame.metadata?.description ?? '',
                        rules: [...(selectedGame.metadata?.rules ?? []), ''],
                        notes: selectedGame.metadata?.notes ?? '',
                      },
                    })
                  }
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add rule
                </Button>
              </div>
            </div>

            {saveError && (
              <div className="p-3 bg-danger-50 rounded-lg">
                <p className="text-sm text-danger-600">{saveError}</p>
              </div>
            )}
            <ModalFooter>
              <Button variant="ghost" onClick={() => setIsSettingsModalOpen(false)} disabled={saveLoading}>
                Cancel
              </Button>
              <Button onClick={handleSaveSettings} disabled={saveLoading}>
                {saveLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </MainLayout>
  )
}
