'use client'

import React from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Users, Network, TrendingUp, Eye, ChevronDown, ChevronUp, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { userTeamsAPI } from '@/lib/api'
import { ExportDropdown } from '@/components/ExportDropdown'
import { SearchWithButton } from '@/components/ui/SearchWithButton'

interface UserTeam {
  _id: string
  userId: string
  referralCode: string
  level: number
  totalReferrals: number
  directReferrals: number
  teamSize: number
  isActive: boolean
  createdAt: string
  user?: {
    email?: string
    name?: string
  }
}

interface TreeNode {
  id: string
  name: string
  email: string
  level: number
  directReferrals: number
  earnings: number
  children?: TreeNode[]
  isExpanded?: boolean
  isLoading?: boolean
}


export default function UserTeamsPage() {
  const [searchInput, setSearchInput] = React.useState('')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [fromDate, setFromDate] = React.useState('')
  const [toDate, setToDate] = React.useState('')
  const [filtersExpanded, setFiltersExpanded] = React.useState(false)
  const [teams, setTeams] = React.useState<UserTeam[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [skip, setSkip] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(10)
  const [isTeamModalOpen, setIsTeamModalOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<UserTeam | null>(null)
  const [teamTree, setTeamTree] = React.useState<TreeNode | null>(null)
  const [stats, setStats] = React.useState({
    totalUsers: 0,
    activeTeams: 0,
    totalReferrals: 0,
  })
  const [statsLoading, setStatsLoading] = React.useState(true)
  const [treeLoading, setTreeLoading] = React.useState(false)
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set())

  // Fetch stats
  React.useEffect(() => {
    userTeamsAPI
      .getStats()
      .then((res) => {
        const data = res.data?.data
        if (data) {
          setStats({
            totalUsers: data.totalUsers || 0,
            activeTeams: data.activeTeams || 0,
            totalReferrals: data.totalReferrals || 0,
          })
        }
      })
      .catch((err) => {
        console.error('Failed to load user teams stats:', err)
      })
      .finally(() => setStatsLoading(false))
  }, [])

  // Fetch user teams list
  const fetchTeams = React.useCallback(() => {
    setLoading(true)
    setError(null)
    const params: any = { skip, limit: pageSize }
    if (searchQuery.trim()) params.search = searchQuery.trim()
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    userTeamsAPI
      .getList(params)
      .then((res) => {
        const data = res.data?.data
        const totalCount = res.data?.total ?? 0
        setTeams(Array.isArray(data) ? data : [])
        setTotal(totalCount)
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load user teams')
        setTeams([])
      })
      .finally(() => setLoading(false))
  }, [skip, searchQuery, fromDate, toDate, pageSize])

  React.useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  React.useEffect(() => {
    setSkip(0)
  }, [fromDate, toDate])

  const handleSearch = () => {
    setSearchQuery(searchInput.trim())
    setSkip(0)
  }

  const handleViewTeam = (user: UserTeam) => {
    if (!user.userId) {
      setError('User ID is missing')
      return
    }

    setSelectedUser(user)
    setTreeLoading(true)
    setIsTeamModalOpen(true)
    setExpandedNodes(new Set())
    setTeamTree(null)
    setError(null)

    userTeamsAPI
      .getTeamTree(user.userId)
      .then((res) => {
        const data = res.data?.data
        if (data) {
          // Show first level children by default (root is always expanded)
          // But their children are hidden until clicked
          setTeamTree({
            ...data,
            children: data.children ? data.children.map((child: any) => ({
              ...child,
              children: undefined, // Hide grandchildren initially
              isExpanded: false,
            })) : [],
          })
        }
      })
      .catch((err) => {
        console.error('Failed to load team tree:', err)
        const errorMsg = err.response?.data?.message || err.message || 'Failed to load team tree'
        setError(errorMsg)
      })
      .finally(() => setTreeLoading(false))
  }

  const toggleNode = async (nodeId: string, node: TreeNode) => {
    const isExpanded = expandedNodes.has(nodeId)
    
    if (isExpanded) {
      // Collapse - remove from expanded set
      const newExpanded = new Set(expandedNodes)
      newExpanded.delete(nodeId)
      setExpandedNodes(newExpanded)
    } else {
      // Expand - fetch children if not already loaded
      const newExpanded = new Set(expandedNodes)
      newExpanded.add(nodeId)
      setExpandedNodes(newExpanded)

      // If children not loaded yet, fetch them
      if (node.directReferrals > 0 && (!node.children || node.children.length === 0)) {
        // Set loading state
        setTeamTree((prevTree) => updateNodeInTree(prevTree, nodeId, { isLoading: true }))

        try {
          const res = await userTeamsAPI.getTeamTree(nodeId)
          const data = res.data?.data
          if (data && data.children) {
            // Update the node with its children
            setTeamTree((prevTree) => 
              updateNodeInTree(prevTree, nodeId, {
                children: data.children.map((child: any) => ({
                  ...child,
                  children: undefined,
                  isExpanded: false,
                })),
                isLoading: false,
              })
            )
          } else {
            setTeamTree((prevTree) => updateNodeInTree(prevTree, nodeId, { isLoading: false }))
          }
        } catch (err) {
          console.error('Failed to load children:', err)
          setTeamTree((prevTree) => updateNodeInTree(prevTree, nodeId, { isLoading: false }))
        }
      }
    }
  }

  const updateNodeInTree = (
    tree: TreeNode | null,
    targetId: string,
    updates: Partial<TreeNode>
  ): TreeNode | null => {
    if (!tree) return null
    
    if (tree.id === targetId) {
      return { ...tree, ...updates }
    }
    
    if (tree.children) {
      return {
        ...tree,
        children: tree.children.map((child) => updateNodeInTree(child, targetId, updates) as TreeNode),
      }
    }
    
    return tree
  }

  const getLevelColor = (level: number) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-teal-500',
      'bg-pink-500',
      'bg-orange-500',
    ]
    return colors[(level - 1) % colors.length] || 'bg-gray-500'
  }

  const renderTreeNode = (node: TreeNode, isRoot = false) => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.directReferrals > 0
    // For root: toggle based on expandedNodes set, for others: only when expanded
    const showChildren = isRoot 
      ? (!expandedNodes.has(node.id) && node.children && node.children.length > 0) // Root starts expanded, toggle to hide
      : (isExpanded && node.children && node.children.length > 0)

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* User Card */}
        <div className={`relative ${isRoot ? 'mb-3 sm:mb-8' : 'mb-2 sm:mb-6'}`}>
          <div 
            className={`bg-white rounded shadow-sm sm:shadow-md border border-gray-200 p-1.5 sm:p-4 min-w-[80px] sm:min-w-[140px] max-w-[85px] sm:max-w-[160px] ${
              hasChildren ? 'cursor-pointer hover:shadow-lg transition-shadow' : 'opacity-90'
            }`}
            onClick={() => hasChildren && toggleNode(node.id, node)}
          >
            {/* Avatar */}
            <div className={`${getLevelColor(node.level)} w-8 h-8 sm:w-16 sm:h-16 rounded sm:rounded-lg mx-auto mb-1 sm:mb-3 flex items-center justify-center text-white font-bold text-sm sm:text-xl`}>
              {node.name.charAt(0).toUpperCase()}
            </div>
            
            {/* Level Badge */}
            <div className="absolute top-0.5 right-0.5 sm:top-2 sm:right-2">
              <span className="bg-white text-[8px] sm:text-xs px-0.5 sm:px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                {node.level}
              </span>
            </div>

            {/* Name */}
            <div className="text-center mb-0.5 sm:mb-2">
              <p className="font-semibold text-gray-900 text-[9px] sm:text-sm truncate" title={node.name}>
                {node.name}
              </p>
              <p className="text-[7px] sm:text-xs text-gray-500 truncate" title={node.email}>
                {node.email}
              </p>
            </div>

            {/* Stats */}
            <div className="space-y-0 sm:space-y-1">
              <div className="flex items-center justify-between text-[8px] sm:text-xs">
                <span className="text-gray-500">Referrals:</span>
                <span className="font-medium text-gray-900">{node.directReferrals}</span>
              </div>
              <div className="flex items-center justify-between text-[8px] sm:text-xs">
                <span className="text-gray-500">Earnings:</span>
                <span className="font-medium text-success-600">{formatCurrency(node.earnings)}</span>
              </div>
            </div>

            {/* Expand/Collapse Indicator */}
            {hasChildren && (
              <div className="mt-0.5 sm:mt-2 pt-0.5 sm:pt-2 border-t border-gray-200 flex items-center justify-center">
                {node.isLoading ? (
                  <div className="animate-spin rounded-full h-2 w-2 sm:h-4 sm:w-4 border-b-2 border-primary-600" />
                ) : (
                  <button className="text-[8px] sm:text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center gap-0.5 sm:gap-1 py-0.5">
                    {(isRoot && !expandedNodes.has(node.id)) || (!isRoot && isExpanded) ? (
                      <ChevronUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    ) : (
                      <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    )}
                  </button>
                )}
              </div>
            )}
            {!hasChildren && !isRoot && (
              <div className="mt-0.5 sm:mt-2 pt-0.5 sm:pt-2 border-t border-gray-200 flex items-center justify-center">
                <span className="text-[7px] sm:text-xs text-gray-400 leading-tight">No referrals</span>
              </div>
            )}
          </div>

          {/* Connection Line Down */}
          {showChildren && (
            <div className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-gray-300 h-2 sm:h-6 bottom-0 translate-y-full" />
          )}
        </div>

        {/* Children */}
        {showChildren && (
          <div className="relative">
            {/* Horizontal Connection Line */}
            {node.children!.length > 1 && (
              <div className="absolute top-0 left-0 right-0 flex justify-center">
                <div 
                  className="h-0.5 bg-gray-300" 
                  style={{ 
                    width: `calc(100% - ${100 / node.children!.length}%)`,
                    marginLeft: `${50 / node.children!.length}%`,
                    marginRight: `${50 / node.children!.length}%`,
                  }} 
                />
              </div>
            )}

            {/* Children Nodes */}
            <div className="flex justify-center gap-2 sm:gap-6 md:gap-8 mt-2 sm:mt-6 relative flex-nowrap">
              {node.children!.map((child) => (
                <div key={child.id} className="relative flex-shrink-0">
                  {/* Vertical Connection Line to Parent */}
                  <div className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-gray-300 h-2 sm:h-6 -top-2 sm:-top-6" />
                  {renderTreeNode(child)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User and Teams</h1>
          <p className="text-gray-600 mt-1">View user referral networks and team structures</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon={<Users className="w-6 h-6" />}
            color="primary"
          />
          <StatCard
            title="Active Teams"
            value={stats.activeTeams.toLocaleString()}
            icon={<Network className="w-6 h-6" />}
            color="success"
          />
          <StatCard
            title="Total Referrals"
            value={stats.totalReferrals.toLocaleString()}
            icon={<TrendingUp className="w-6 h-6" />}
            color="warning"
          />
        </div>


        {/* Filters */}
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-end gap-3 sm:gap-4">
              <SearchWithButton
                value={searchInput}
                onChange={setSearchInput}
                onSearch={handleSearch}
                placeholder="Search by user name, email or referral code..."
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
                  <label className="block text-xs text-gray-500 mb-0.5">From date</label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="w-full sm:w-36 shrink-0">
                  <label className="block text-xs text-gray-500 mb-0.5">To date</label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                <ExportDropdown
                  reportType="user-teams"
                  fetchData={async (p) => {
                    const res = await userTeamsAPI.getList(p as Parameters<typeof userTeamsAPI.getList>[0])
                    return { data: res.data?.data ?? res.data?.userTeams ?? [] }
                  }}
                  columns={[
                    { key: 'userName', label: 'User' },
                    { key: 'referralCode', label: 'Referral Code' },
                    { key: 'level', label: 'Level' },
                    { key: 'directReferrals', label: 'Direct Referrals' },
                    { key: 'totalReferrals', label: 'Total Referrals' },
                    { key: 'status', label: 'Status' },
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

        {/* User Teams Table */}
        <Card>
          <CardBody className="p-0">
            {error && (
              <div className="p-4 bg-danger-50 border-b border-danger-200">
                <p className="text-danger-600 text-sm">{error}</p>
              </div>
            )}
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">User</TableHead>
                    <TableHead className="whitespace-nowrap">Referral Code</TableHead>
                    <TableHead className="whitespace-nowrap">Level</TableHead>
                    <TableHead className="whitespace-nowrap">Direct Referrals</TableHead>
                    <TableHead className="whitespace-nowrap">Total Referrals</TableHead>
                    <TableHead className="whitespace-nowrap">Team Size</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Joined Date</TableHead>
                    <TableHead className="whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : teams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    teams.map((team) => (
                      <TableRow key={team._id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{team.user?.name || 'Unknown'}</span>
                            <span className="text-xs text-gray-500">{team.user?.email || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <code className="px-2 py-1 bg-gray-100 text-xs rounded font-mono">
                            {team.referralCode}
                          </code>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="default">Level {team.level}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-center">
                          <span className="font-medium">{team.directReferrals}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-center">
                          <span className="font-medium text-primary-600">{team.totalReferrals}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-center">
                          <span className="font-medium text-success-600">{team.teamSize}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={team.isActive ? 'success' : 'default'}>
                            {team.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-gray-600">
                          {formatDate(team.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Eye className="w-4 h-4" />}
                            onClick={() => handleViewTeam(team)}
                          >
                            View Team
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {!loading && total > 0 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-200">
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

      {/* Team Network Tree Modal */}
      <Modal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        title={
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Network Tree</h2>
              {selectedUser && (
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 truncate max-w-[200px] sm:max-w-none">
                  {selectedUser.user?.name || selectedUser.user?.email || 'User'}&apos;s referral network
                </p>
              )}
            </div>
          </div>
        }
        size="full"
      >
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] p-3 sm:p-6 md:p-8 bg-gray-50">
          {error && (
            <div className="mb-4 p-3 sm:p-4 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-danger-600 text-xs sm:text-sm">{error}</p>
            </div>
          )}
          {treeLoading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-primary-600" />
            </div>
          ) : teamTree ? (
            <div className="inline-block min-w-full">
              {renderTreeNode(teamTree, true)}
            </div>
          ) : error ? null : (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <p className="text-gray-500 text-sm sm:text-base">No team structure available</p>
            </div>
          )}
        </div>

        {/* Level Colors Legend */}
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-white border-t border-gray-200">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Level Colors</h3>
          <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-blue-500" />
              <span className="text-[10px] sm:text-xs text-gray-600">Level 1</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-purple-500" />
              <span className="text-[10px] sm:text-xs text-gray-600">Level 2</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-teal-500" />
              <span className="text-[10px] sm:text-xs text-gray-600">Level 3</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-pink-500" />
              <span className="text-[10px] sm:text-xs text-gray-600">Level 4</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-orange-500" />
              <span className="text-[10px] sm:text-xs text-gray-600">Level 5</span>
            </div>
          </div>
        </div>
      </Modal>
    </MainLayout>
  )
}
