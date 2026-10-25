'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import NextImage from 'next/image'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { bannerAPI, helperAPI } from '@/lib/api'
import { SearchWithButton } from '@/components/ui/SearchWithButton'
import type { Banner } from '@/types'
import { Image as ImageIcon, Plus, Pencil, Trash2, ChevronDown, ChevronUp, ExternalLink, Upload } from 'lucide-react'

const emptyForm = {
  title: '',
  description: '',
  imageUrl: '',
  link: '',
  isActive: true,
  order: 0,
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeOnly, setActiveOnly] = useState<boolean | undefined>(undefined)
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [deletingBanner, setDeletingBanner] = useState<Banner | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchBanners = useCallback(() => {
    setLoading(true)
    setError(null)
    bannerAPI
      .getAll(activeOnly)
      .then((res) => {
        const data = res.data?.data
        setBanners(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load banners')
        setBanners([])
      })
      .finally(() => setLoading(false))
  }, [activeOnly])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  const filteredBanners = useMemo(() => {
    if (!searchQuery.trim()) return banners
    const q = searchQuery.trim().toLowerCase()
    return banners.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q))
    )
  }, [banners, searchQuery])

  const handleSearch = () => setSearchQuery(searchInput.trim())

  const openCreate = () => {
    setEditingBanner(null)
    setForm(emptyForm)
    setFormError(null)
    setIsFormModalOpen(true)
  }

  const openEdit = (banner: Banner) => {
    setEditingBanner(banner)
    setForm({
      title: banner.title,
      description: banner.description,
      imageUrl: banner.imageUrl ?? '',
      link: banner.link ?? '',
      isActive: banner.isActive,
      order: banner.order ?? 0,
    })
    setFormError(null)
    setIsFormModalOpen(true)
  }

  const closeFormModal = () => {
    setIsFormModalOpen(false)
    setEditingBanner(null)
    setForm(emptyForm)
    setFormError(null)
    setUploadError(null)
  }

  const handleImageUploadClick = () => {
    setUploadError(null)
    fileInputRef.current?.click()
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploadLoading(true)
    helperAPI
      .uploadImage(file, 'banners')
      .then((res) => {
        const data = res.data?.data
        const url = data?.secure_url ?? data?.url ?? ''
        if (url) setForm((f) => ({ ...f, imageUrl: url }))
      })
      .catch((err) => {
        setUploadError(err.response?.data?.message || 'Upload failed')
      })
      .finally(() => {
        setUploadLoading(false)
        e.target.value = ''
      })
  }

  const handleSave = () => {
    if (!form.title.trim() || !form.description.trim()) {
      setFormError('Title and description are required')
      return
    }
    setFormError(null)
    setSaveLoading(true)
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim() || undefined,
      link: form.link.trim() || undefined,
      isActive: form.isActive,
      order: Number(form.order) || 0,
    }
    if (editingBanner) {
      bannerAPI
        .update(editingBanner._id, payload)
        .then(() => {
          fetchBanners()
          closeFormModal()
        })
        .catch((err) => {
          setFormError(err.response?.data?.message || 'Failed to update banner')
        })
        .finally(() => setSaveLoading(false))
    } else {
      bannerAPI
        .create(payload)
        .then(() => {
          fetchBanners()
          closeFormModal()
        })
        .catch((err) => {
          setFormError(err.response?.data?.message || 'Failed to create banner')
        })
        .finally(() => setSaveLoading(false))
    }
  }

  const openDelete = (banner: Banner) => {
    setDeletingBanner(banner)
    setIsDeleteModalOpen(true)
  }

  const handleDelete = () => {
    if (!deletingBanner) return
    setDeleteLoading(true)
    bannerAPI
      .delete(deletingBanner._id)
      .then(() => {
        fetchBanners()
        setIsDeleteModalOpen(false)
        setDeletingBanner(null)
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to delete banner')
      })
      .finally(() => setDeleteLoading(false))
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Banner Management</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Create and manage homepage banners</p>
          </div>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate} className="shrink-0">
            Add Banner
          </Button>
        </div>

                {/* Filters - single row on desktop; on mobile search + "More filters" then expandable row */}
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-end gap-3 sm:gap-4">
              <SearchWithButton
                value={searchInput}
                onChange={setSearchInput}
                onSearch={handleSearch}
                placeholder="Search by title or description..."
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeOnly === true}
                    onChange={(e) => setActiveOnly(e.target.checked ? true : undefined)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Active only</span>
                </label>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Table */}
        <Card>
          <CardBody className="p-0">
            {error && (
              <div className="p-4 bg-danger-50 border-b border-danger-200">
                <p className="text-danger-600 text-sm">{error}</p>
              </div>
            )}
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[700px] text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-20 sm:w-24">Image</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-32 sm:w-auto">Title</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-40 sm:w-auto">Description</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-28 sm:w-auto">Link</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-20 sm:w-auto">Status</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-16 sm:w-auto">Order</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-24 sm:w-auto">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-6 text-xs sm:text-sm">
                        Loading...
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && filteredBanners.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-6 text-xs sm:text-sm">
                        No banners found
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    filteredBanners.map((banner) => (
                      <TableRow key={banner._id}>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          {banner.imageUrl ? (
                            <a
                              href={banner.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-12 h-8 rounded overflow-hidden border border-gray-200 bg-gray-50 relative"
                            >
                              <NextImage
                                src={banner.imageUrl}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="48px"
                                unoptimized
                              />
                            </a>
                          ) : (
                            <div className="w-12 h-8 rounded border border-gray-200 bg-gray-100 flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-gray-400" aria-hidden />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <span className="font-medium text-gray-900 truncate max-w-[8rem] block" title={banner.title}>
                            {banner.title}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <span className="text-gray-600 truncate max-w-[12rem] block" title={banner.description}>
                            {banner.description || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          {banner.link ? (
                            <a
                              href={banner.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:underline truncate max-w-[8rem] inline-flex items-center gap-0.5"
                              title={banner.link}
                            >
                              <span className="truncate">{banner.link}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <Badge variant={banner.isActive ? 'success' : 'default'}>
                            {banner.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">{banner.order ?? 0}</TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<Pencil className="w-3 h-3" />}
                              className="text-xs px-2 py-1 shrink-0"
                              onClick={() => openEdit(banner)}
                              title="Edit"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger-600 hover:text-danger-700 hover:bg-danger-50 text-xs px-2 py-1 shrink-0"
                              leftIcon={<Trash2 className="w-3 h-3" />}
                              onClick={() => openDelete(banner)}
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
          title={editingBanner ? 'Edit Banner' : 'Add Banner'}
          size="lg"
        >
          <div className="space-y-4">
            {formError && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-sm text-danger-600">{formError}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Banner title"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Banner description"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[44px] focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={form.imageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                    placeholder="https://... or upload below"
                    className="flex-1 min-w-0"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileChange}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    leftIcon={uploadLoading ? undefined : <Upload className="w-4 h-4" />}
                    onClick={handleImageUploadClick}
                    disabled={uploadLoading}
                    isLoading={uploadLoading}
                    title="Upload image"
                  >
                    Upload
                  </Button>
                </div>
                {!form.imageUrl && (
                  <p className="text-xs text-gray-500 mt-1">Or use the Upload button to upload an image (URL will be filled automatically).</p>
                )}
                {uploadError && (
                  <p className="text-xs text-danger-600 mt-1">{uploadError}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                <Input
                  type="url"
                  value={form.link}
                  onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display order</label>
                <Input
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 0 }))}
                />
                <p className="text-xs text-gray-500 mt-0.5">Lower number = higher priority</p>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={form.isActive}
                  onChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
                />
                <span className="text-sm text-gray-700">Active (visible on site)</span>
              </div>
            </div>
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={closeFormModal} disabled={saveLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={saveLoading}>
              {editingBanner ? 'Save changes' : 'Create banner'}
            </Button>
          </ModalFooter>
        </Modal>

        {/* Delete confirmation */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => { setIsDeleteModalOpen(false); setDeletingBanner(null) }}
          title="Delete Banner"
          size="sm"
        >
          {deletingBanner && (
            <>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete &quot;{deletingBanner.title}&quot;? This cannot be undone.
              </p>
              <ModalFooter>
                <Button
                  variant="secondary"
                  onClick={() => { setIsDeleteModalOpen(false); setDeletingBanner(null) }}
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
