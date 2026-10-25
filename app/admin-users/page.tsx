'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import { Plus, Edit, Trash2, UserCog, RefreshCw } from 'lucide-react'
import { adminUserAPI } from '@/lib/api'
import { useAdminAuth } from '@/lib/useAdminAuth'

const ALL_PERMISSIONS = [
  { key: 'users', label: 'User Management' },
  { key: 'deposits', label: 'Deposits' },
  { key: 'withdrawals', label: 'Withdrawals (Verify)' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'wallets', label: 'Wallet Management' },
  { key: 'gaming', label: 'Gaming Management' },
  { key: 'banners', label: 'Banners' },
  { key: 'investments', label: 'Investments / ROI' },
  { key: 'mlm', label: 'User & Teams (MLM)' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'currencies', label: 'Currency Management' },
  { key: 'admin_users', label: 'Admin Users' },
  { key: 'settings', label: 'Settings' },
  { key: 'support_tickets', label: 'Support Tickets' },
]

interface AdminUserItem {
  _id: string
  name: string
  email: string
  role: string
  permissions: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const emptyForm = { name: '', email: '', password: '', permissions: [] as string[], isActive: true }

export default function AdminUsersPage() {
  const adminAuth = useAdminAuth()
  const [admins, setAdmins] = useState<AdminUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUserItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchAdmins = useCallback(() => {
    setLoading(true)
    setError(null)
    adminUserAPI
      .getAll()
      .then((res) => {
        const data = res.data?.data
        setAdmins(Array.isArray(data) ? data : [])
      })
      .catch((err: any) => setError(err.response?.data?.message || 'Failed to load admin users'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAdmins() }, [fetchAdmins])

  const openCreate = () => {
    setSelectedAdmin(null)
    setForm(emptyForm)
    setSaveError(null)
    setIsModalOpen(true)
  }

  const openEdit = (admin: AdminUserItem) => {
    setSelectedAdmin(admin)
    setForm({ name: admin.name, email: admin.email, password: '', permissions: admin.permissions, isActive: admin.isActive })
    setSaveError(null)
    setIsModalOpen(true)
  }

  const togglePermission = (key: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }))
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaveLoading(true)
    setSaveError(null)

    const promise = selectedAdmin
      ? adminUserAPI.update(selectedAdmin._id, { name: form.name, permissions: form.permissions, isActive: form.isActive })
      : adminUserAPI.create({ name: form.name, email: form.email, password: form.password, permissions: form.permissions })

    promise
      .then(() => { setIsModalOpen(false); fetchAdmins() })
      .catch((err: any) => setSaveError(err.response?.data?.message || 'Failed to save admin'))
      .finally(() => setSaveLoading(false))
  }

  const handleDelete = (id: string) => {
    setDeleteId(id)
    setDeleteLoading(true)
    adminUserAPI
      .delete(id)
      .then(() => { setDeleteId(null); fetchAdmins() })
      .catch((err: any) => { setError(err.response?.data?.message || 'Failed to delete admin') })
      .finally(() => setDeleteLoading(false))
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
            <p className="text-gray-600 mt-1">Manage subadmins and their menu permissions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={fetchAdmins}>
              Refresh
            </Button>
            {adminAuth.isSuperAdmin && (
              <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
                Add Subadmin
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-600">{error}</div>
        )}

        <Card>
          <CardBody className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-2 px-3 text-xs">Name</TableHead>
                  <TableHead className="py-2 px-3 text-xs">Email</TableHead>
                  <TableHead className="py-2 px-3 text-xs">Role</TableHead>
                  <TableHead className="py-2 px-3 text-xs">Permissions</TableHead>
                  <TableHead className="py-2 px-3 text-xs">Status</TableHead>
                  <TableHead className="py-2 px-3 text-xs">Created</TableHead>
                  <TableHead className="py-2 px-3 text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500 text-sm">
                      Loading...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && admins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500 text-sm">
                      No admin users found
                    </TableCell>
                  </TableRow>
                )}
                {!loading && admins.map((admin) => (
                  <TableRow key={admin._id}>
                    <TableCell className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                          <UserCog className="w-4 h-4 text-primary-600" />
                        </div>
                        <p className="font-medium text-gray-900 text-sm">{admin.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-sm text-gray-600">{admin.email}</TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge
                        variant={
                          admin.role === 'superadmin' || admin.role === 'admin'
                            ? 'danger'
                            : 'info'
                        }
                      >
                        {admin.role === 'superadmin' || admin.role === 'admin' ? 'Superadmin' : 'Subadmin'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      {admin.role === 'superadmin' || admin.role === 'admin' ? (
                        <Badge variant="primary">All Access</Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {admin.permissions.slice(0, 3).map((perm) => (
                            <Badge key={perm} variant="default" className="text-xs">{perm}</Badge>
                          ))}
                          {admin.permissions.length > 3 && (
                            <Badge variant="default" className="text-xs">+{admin.permissions.length - 3} more</Badge>
                          )}
                          {admin.permissions.length === 0 && (
                            <span className="text-xs text-gray-400">No permissions</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge variant={admin.isActive ? 'success' : 'default'}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(admin.createdAt)}
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      {adminAuth.isSuperAdmin && (admin.role === 'subadmin') && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(admin)}
                            leftIcon={<Edit className="w-3 h-3" />}
                            className="text-xs px-2 py-1"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(admin._id)}
                            leftIcon={<Trash2 className="w-3 h-3" />}
                            isLoading={deleteLoading && deleteId === admin._id}
                            className="text-xs px-2 py-1"
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                      {(admin.role === 'superadmin' || admin.role === 'admin') && (
                        <span className="text-xs text-gray-400">Protected</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>

      {/* Create / Edit Subadmin Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedAdmin ? 'Edit Subadmin' : 'Create Subadmin'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Name"
            placeholder="Enter name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          {!selectedAdmin && (
            <>
              <Input
                label="Email"
                type="email"
                placeholder="subadmin@winvest.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
              <Input
                label="Password"
                type="password"
                placeholder="Set a secure password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </>
          )}
          {selectedAdmin && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Menu Permissions</p>
            <p className="text-xs text-gray-500 mb-3">
              Select which sections this subadmin can access. Note: only superadmin can approve/reject withdrawals — subadmin with <strong>Withdrawals</strong> permission can only verify them.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
              {ALL_PERMISSIONS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(key)}
                    onChange={() => togglePermission(key)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {saveError && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-600">{saveError}</p>
            </div>
          )}

          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saveLoading}>
              {selectedAdmin ? 'Save Changes' : 'Create Subadmin'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </MainLayout>
  )
}
