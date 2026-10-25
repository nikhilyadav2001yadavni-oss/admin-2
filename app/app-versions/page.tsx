'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { appVersionAPI, type AppVersion } from '@/lib/api'
import { Plus, Trash2, CheckCircle2, ExternalLink, Upload, Pencil } from 'lucide-react'

const emptyForm = {
  platform: 'android' as 'android' | 'ios',
  versionName: '',
  versionCode: '',
  releaseNotes: '',
  forceUpdate: false,
  minSupportedVersionCode: '',
  isActive: true,
  apkUrl: '',
}

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

function formatDate(d?: string) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString()
  } catch {
    return d
  }
}

export default function AppVersionsPage() {
  const [versions, setVersions] = useState<AppVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editing, setEditing] = useState<AppVersion | null>(null)
  const [deleting, setDeleting] = useState<AppVersion | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [apkFile, setApkFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchVersions = useCallback(() => {
    setLoading(true)
    setError(null)
    appVersionAPI
      .list()
      .then((res) => {
        const data = res.data?.data
        setVersions(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load app versions')
        setVersions([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setApkFile(null)
    setFormError(null)
    setUploadProgress(null)
    setIsFormModalOpen(true)
  }

  const openEdit = (v: AppVersion) => {
    setEditing(v)
    setForm({
      platform: v.platform,
      versionName: v.versionName,
      versionCode: String(v.versionCode),
      releaseNotes: v.releaseNotes ?? '',
      forceUpdate: v.forceUpdate,
      minSupportedVersionCode:
        v.minSupportedVersionCode == null ? '' : String(v.minSupportedVersionCode),
      isActive: v.isActive,
      apkUrl: v.apkUrl,
    })
    setApkFile(null)
    setFormError(null)
    setUploadProgress(null)
    setIsFormModalOpen(true)
  }

  const closeFormModal = () => {
    setIsFormModalOpen(false)
    setEditing(null)
    setApkFile(null)
    setForm(emptyForm)
    setFormError(null)
    setUploadProgress(null)
  }

  const handleApkPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setApkFile(file)
    e.target.value = ''
  }

  const handleSave = async () => {
    setFormError(null)

    if (!form.versionName.trim()) {
      setFormError('Version name is required (e.g. 1.2.0)')
      return
    }
    const versionCode = parseInt(form.versionCode, 10)
    if (!Number.isFinite(versionCode) || versionCode < 1) {
      setFormError('Version code must be a positive integer')
      return
    }

    if (editing) {
      // Edit metadata only
      setSaveLoading(true)
      try {
        await appVersionAPI.update(editing._id, {
          versionName: form.versionName.trim(),
          releaseNotes: form.releaseNotes.trim() || null,
          forceUpdate: form.forceUpdate,
          minSupportedVersionCode:
            form.minSupportedVersionCode === ''
              ? null
              : parseInt(form.minSupportedVersionCode, 10) || null,
          isActive: form.isActive,
          apkUrl: form.apkUrl.trim() || undefined,
        })
        fetchVersions()
        closeFormModal()
      } catch (err: any) {
        setFormError(err.response?.data?.message || 'Failed to update version')
      } finally {
        setSaveLoading(false)
      }
      return
    }

    // Create — must have either an APK file or apkUrl
    if (!apkFile && !form.apkUrl.trim()) {
      setFormError('Please upload an APK file or paste an APK URL')
      return
    }

    setSaveLoading(true)
    setUploadProgress(apkFile ? 0 : null)
    try {
      await appVersionAPI.create(
        {
          platform: form.platform,
          versionName: form.versionName.trim(),
          versionCode,
          apkUrl: apkFile ? undefined : form.apkUrl.trim(),
          releaseNotes: form.releaseNotes.trim() || undefined,
          forceUpdate: form.forceUpdate,
          minSupportedVersionCode:
            form.minSupportedVersionCode === ''
              ? null
              : parseInt(form.minSupportedVersionCode, 10) || null,
          isActive: form.isActive,
        },
        apkFile,
        (e) => {
          if (e.total) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        }
      )
      fetchVersions()
      closeFormModal()
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create version')
    } finally {
      setSaveLoading(false)
      setUploadProgress(null)
    }
  }

  const handleSetActive = async (v: AppVersion) => {
    if (v.isActive) return
    setActivatingId(v._id)
    try {
      await appVersionAPI.setActive(v._id)
      fetchVersions()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to activate version')
    } finally {
      setActivatingId(null)
    }
  }

  const openDelete = (v: AppVersion) => {
    setDeleting(v)
    setIsDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await appVersionAPI.delete(deleting._id)
      fetchVersions()
      setIsDeleteModalOpen(false)
      setDeleting(null)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete version')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">App Versions</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Upload new APK builds and manage which version is live for in-app updates.
            </p>
          </div>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openCreate}
            className="shrink-0"
          >
            Upload New Version
          </Button>
        </div>

        <Card>
          <CardBody className="p-0">
            {error && (
              <div className="p-4 bg-danger-50 border-b border-danger-200">
                <p className="text-danger-600 text-sm">{error}</p>
              </div>
            )}
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[900px] text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Platform</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Version</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Code</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">APK</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Size</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Force</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Status</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Uploaded by</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Uploaded at</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-gray-500 py-6 text-xs sm:text-sm">
                        Loading...
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && versions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-gray-500 py-6 text-xs sm:text-sm">
                        No app versions uploaded yet
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    versions.map((v) => (
                      <TableRow key={v._id}>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap capitalize">
                          {v.platform}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap font-medium text-gray-900">
                          {v.versionName}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">{v.versionCode}</TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <a
                            href={v.apkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:underline inline-flex items-center gap-0.5"
                          >
                            <span className="truncate max-w-[12rem]" title={v.apkUrl}>
                              Download
                            </span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          {formatBytes(v.apkSizeBytes)}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          {v.forceUpdate ? (
                            <Badge variant="warning">Forced</Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          {v.isActive ? (
                            <Badge variant="success">Live</Badge>
                          ) : (
                            <Badge variant="default">Archived</Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <span className="text-gray-700" title={v.uploadedBy?.email || ''}>
                            {v.uploadedBy?.name || v.uploadedBy?.email || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap text-gray-600">
                          {formatDate(v.createdAt)}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {!v.isActive && (
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<CheckCircle2 className="w-3 h-3" />}
                                className="text-xs px-2 py-1 shrink-0 text-success-600"
                                onClick={() => handleSetActive(v)}
                                isLoading={activatingId === v._id}
                                title="Set as live version"
                              >
                                Activate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<Pencil className="w-3 h-3" />}
                              className="text-xs px-2 py-1 shrink-0"
                              onClick={() => openEdit(v)}
                              title="Edit metadata"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<Trash2 className="w-3 h-3" />}
                              className="text-danger-600 hover:text-danger-700 hover:bg-danger-50 text-xs px-2 py-1 shrink-0"
                              onClick={() => openDelete(v)}
                              title="Delete"
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardBody>
        </Card>

        {/* Create / Edit Modal */}
        <Modal
          isOpen={isFormModalOpen}
          onClose={closeFormModal}
          title={editing ? 'Edit Version' : 'Upload New Version'}
          size="lg"
        >
          <div className="space-y-4">
            {formError && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-sm text-danger-600">{formError}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select
                  value={form.platform}
                  disabled={!!editing}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, platform: e.target.value as 'android' | 'ios' }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50"
                >
                  <option value="android">Android</option>
                  <option value="ios">iOS (placeholder)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Version name *</label>
                <Input
                  value={form.versionName}
                  onChange={(e) => setForm((f) => ({ ...f, versionName: e.target.value }))}
                  placeholder="e.g. 1.2.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Version code *</label>
                <Input
                  type="number"
                  min={1}
                  value={form.versionCode}
                  disabled={!!editing}
                  onChange={(e) => setForm((f) => ({ ...f, versionCode: e.target.value }))}
                  placeholder="Integer used for comparison (e.g. 12)"
                />
                <p className="text-xs text-gray-500 mt-0.5">Must be higher than the previous version&apos;s code.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min supported code
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.minSupportedVersionCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minSupportedVersionCode: e.target.value }))
                  }
                  placeholder="Anything below = forced update"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Release notes</label>
                <textarea
                  value={form.releaseNotes}
                  onChange={(e) => setForm((f) => ({ ...f, releaseNotes: e.target.value }))}
                  placeholder="What's new in this build"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[44px] focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {!editing && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">APK file</label>
                  <div className="flex gap-2 items-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".apk,application/vnd.android.package-archive"
                      className="hidden"
                      onChange={handleApkPick}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<Upload className="w-4 h-4" />}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose APK
                    </Button>
                    <span className="text-sm text-gray-600 truncate">
                      {apkFile ? `${apkFile.name} (${formatBytes(apkFile.size)})` : 'No file selected'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Or paste an external APK URL below if hosted elsewhere.
                  </p>
                  {uploadProgress !== null && (
                    <div className="mt-2">
                      <div className="w-full h-2 bg-gray-200 rounded">
                        <div
                          className="h-2 bg-primary-500 rounded transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Uploading… {uploadProgress}%</p>
                    </div>
                  )}
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">APK URL</label>
                <Input
                  type="url"
                  value={form.apkUrl}
                  onChange={(e) => setForm((f) => ({ ...f, apkUrl: e.target.value }))}
                  placeholder="https://... (auto-filled after upload)"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={form.forceUpdate}
                  onChange={(checked) => setForm((f) => ({ ...f, forceUpdate: checked }))}
                />
                <span className="text-sm text-gray-700">Force update for older versions</span>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={form.isActive}
                  onChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
                />
                <span className="text-sm text-gray-700">
                  Set as live (will deactivate previous live version)
                </span>
              </div>
            </div>
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={closeFormModal} disabled={saveLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={saveLoading}>
              {editing ? 'Save changes' : 'Upload version'}
            </Button>
          </ModalFooter>
        </Modal>

        {/* Delete confirmation */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setDeleting(null)
          }}
          title="Delete App Version"
          size="sm"
        >
          {deleting && (
            <>
              <p className="text-sm text-gray-600">
                Delete version <strong>{deleting.versionName}</strong> (code {deleting.versionCode})?
                The APK file will also be removed from storage. This cannot be undone.
              </p>
              <ModalFooter>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    setDeleting(null)
                  }}
                  disabled={deleteLoading}
                >
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDelete} isLoading={deleteLoading}>
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </Modal>
      </div>
    </MainLayout>
  )
}
