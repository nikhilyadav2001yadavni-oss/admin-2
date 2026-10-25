'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { Select } from '@/components/ui/Select'
import { currencyAPI, helperAPI } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/types'
import { Plus, Search, Pencil, Trash2, ChevronDown, ChevronUp, Upload } from 'lucide-react'
import { useRef } from 'react'

const SYMBOL_OPTIONS = [
  { value: 'TRX', label: 'TRX' },
  { value: 'BNB', label: 'BNB' },
  { value: 'ETH', label: 'ETH' },
  { value: 'SOL', label: 'SOL' },
]
const CHAIN_OPTIONS = [
  { value: 'TRC20', label: 'TRC20' },
  { value: 'BEP20', label: 'BEP20' },
  { value: 'ERC20', label: 'ERC20' },
  { value: 'POLYGON', label: 'POLYGON' },
]
const FEE_TYPE_OPTIONS = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed' },
]

type FeeType = 'percentage' | 'fixed'

const emptyForm = {
  symbol: 'TRX',
  name: '',
  chain: 'TRC20',
  colorCode: '',
  image: '',
  depositAddress: '',
  minimumDepositAmount: 0,
  minimumWithdrawalAmount: 0,
  depositFee: 0,
  depositFeeType: 'percentage' as FeeType,
  withdrawalFee: 0,
  withdrawalFeeType: 'percentage' as FeeType,
  isActive: true,
  depositEnabled: true,
  withdrawalEnabled: true,
}

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeOnly, setActiveOnly] = useState<boolean | undefined>(undefined)
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingCurrency, setDeletingCurrency] = useState<Currency | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchCurrencies = useCallback(() => {
    setLoading(true)
    setError(null)
    currencyAPI
      .getAll(activeOnly)
      .then((res) => {
        const data = res.data?.data
        setCurrencies(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load currencies')
        setCurrencies([])
      })
      .finally(() => setLoading(false))
  }, [activeOnly])

  useEffect(() => {
    fetchCurrencies()
  }, [fetchCurrencies])

  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) return currencies
    const q = searchQuery.trim().toLowerCase()
    return currencies.filter(
      (c) =>
        c.symbol.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.chain.toLowerCase().includes(q)
    )
  }, [currencies, searchQuery])

  const openCreate = () => {
    setEditingCurrency(null)
    setForm(emptyForm)
    setFormError(null)
    setUploadError(null)
    setIsFormModalOpen(true)
  }

  const openEdit = (currency: Currency) => {
    setEditingCurrency(currency)
    setForm({
      symbol: currency.symbol,
      name: currency.name,
      chain: currency.chain,
      colorCode: currency.colorCode ?? '',
      image: currency.image ?? '',
      depositAddress: currency.depositAddress,
      minimumDepositAmount: currency.minimumDepositAmount ?? 0,
      minimumWithdrawalAmount: currency.minimumWithdrawalAmount ?? 0,
      depositFee: currency.depositFee ?? 0,
      depositFeeType: (currency.depositFeeType as 'percentage' | 'fixed') ?? 'percentage',
      withdrawalFee: currency.withdrawalFee ?? 0,
      withdrawalFeeType: (currency.withdrawalFeeType as 'percentage' | 'fixed') ?? 'percentage',
      isActive: currency.isActive,
      depositEnabled: currency.depositEnabled ?? true,
      withdrawalEnabled: currency.withdrawalEnabled ?? true,
    })
    setFormError(null)
    setUploadError(null)
    setIsFormModalOpen(true)
  }

  const closeFormModal = () => {
    setIsFormModalOpen(false)
    setEditingCurrency(null)
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
      .uploadImage(file, 'currency')
      .then((res) => {
        const data = res.data?.data
        const url = data?.secure_url ?? data?.url ?? ''
        if (url) setForm((f) => ({ ...f, image: url }))
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
    if (!form.name.trim()) {
      setFormError('Name is required')
      return
    }
    if (!form.depositAddress.trim()) {
      setFormError('Deposit address is required')
      return
    }
    setFormError(null)
    setSaveLoading(true)
    if (editingCurrency) {
      const payload = {
        name: form.name.trim(),
        chain: form.chain,
        colorCode: form.colorCode.trim() || null,
        image: form.image.trim() || null,
        depositAddress: form.depositAddress.trim(),
        minimumDepositAmount: Number(form.minimumDepositAmount) || 0,
        minimumWithdrawalAmount: Number(form.minimumWithdrawalAmount) || 0,
        depositFee: Number(form.depositFee) || 0,
        depositFeeType: form.depositFeeType,
        withdrawalFee: Number(form.withdrawalFee) || 0,
        withdrawalFeeType: form.withdrawalFeeType,
        isActive: form.isActive,
        depositEnabled: form.depositEnabled,
        withdrawalEnabled: form.withdrawalEnabled,
      }
      currencyAPI
        .update(editingCurrency._id, payload)
        .then(() => {
          fetchCurrencies()
          closeFormModal()
        })
        .catch((err) => {
          setFormError(err.response?.data?.message || 'Failed to update currency')
        })
        .finally(() => setSaveLoading(false))
    } else {
      const payload = {
        symbol: form.symbol,
        name: form.name.trim(),
        chain: form.chain,
        depositAddress: form.depositAddress.trim(),
        colorCode: form.colorCode.trim() || undefined,
        image: form.image.trim() || undefined,
        minimumDepositAmount: Number(form.minimumDepositAmount) || 0,
        minimumWithdrawalAmount: Number(form.minimumWithdrawalAmount) || 0,
        depositFee: Number(form.depositFee) || 0,
        depositFeeType: form.depositFeeType,
        withdrawalFee: Number(form.withdrawalFee) || 0,
        withdrawalFeeType: form.withdrawalFeeType,
        isActive: form.isActive,
        depositEnabled: form.depositEnabled,
        withdrawalEnabled: form.withdrawalEnabled,
      }
      currencyAPI
        .create(payload)
        .then(() => {
          fetchCurrencies()
          closeFormModal()
        })
        .catch((err) => {
          setFormError(err.response?.data?.message || 'Failed to add currency')
        })
        .finally(() => setSaveLoading(false))
    }
  }

  const openDelete = (currency: Currency) => {
    setDeletingCurrency(currency)
    setIsDeleteModalOpen(true)
  }

  const handleDelete = () => {
    if (!deletingCurrency) return
    setDeleteLoading(true)
    currencyAPI
      .delete(deletingCurrency._id)
      .then(() => {
        fetchCurrencies()
        setIsDeleteModalOpen(false)
        setDeletingCurrency(null)
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to delete currency')
      })
      .finally(() => setDeleteLoading(false))
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Currency Management</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Manage supported currencies, deposit addresses, and fees</p>
          </div>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate} className="shrink-0">
            Add Currency
          </Button>
        </div>


        {/* Filters */}
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-end gap-3 sm:gap-4">
              <div className="flex-1 min-w-0 w-full sm:min-w-[200px] sm:w-auto">
                <label className="block text-xs text-gray-500 mb-0.5">Search</label>
                <Input
                  type="search"
                  placeholder="Search by symbol, name, or chain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>
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
              <Table className="w-full min-w-[900px] text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-16">Symbol</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-24">Name</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-20">Chain</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-14">Color</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-36">Deposit Address</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-24">Min Deposit</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-24">Min Withdrawal</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-20">Dep Fee</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-20">Wd Fee</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-20">Status</TableHead>
                    <TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-gray-500 py-6 text-xs sm:text-sm">
                        Loading...
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && filteredCurrencies.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-gray-500 py-6 text-xs sm:text-sm">
                        No currencies found
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    filteredCurrencies.map((c) => (
                      <TableRow key={c._id}>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap font-medium">{c.symbol}</TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">{c.name}</TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">{c.chain}</TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          {c.colorCode ? (
                            <span
                              className="inline-block w-6 h-6 rounded border border-gray-200"
                              style={{ backgroundColor: c.colorCode }}
                              title={c.colorCode}
                            />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <code className="text-xs truncate max-w-[10rem] block" title={c.depositAddress}>
                            {c.depositAddress || '—'}
                          </code>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">{c.minimumDepositAmount ?? 0}</TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">{c.minimumWithdrawalAmount ?? 0}</TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          {c.depositFeeType === 'percentage'
                            ? `${c.depositFee ?? 0}%`
                            : formatCurrency(c.depositFee ?? 0)}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          {c.withdrawalFeeType === 'percentage'
                            ? `${c.withdrawalFee ?? 0}%`
                            : formatCurrency(c.withdrawalFee ?? 0)}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <Badge variant={c.isActive ? 'success' : 'default'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<Pencil className="w-3 h-3" />}
                              className="text-xs px-2 py-1 shrink-0"
                              onClick={() => openEdit(c)}
                              title="Edit"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger-600 hover:text-danger-700 hover:bg-danger-50 text-xs px-2 py-1 shrink-0"
                              leftIcon={<Trash2 className="w-3 h-3" />}
                              onClick={() => openDelete(c)}
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
          title={editingCurrency ? 'Edit Currency' : 'Add Currency'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Symbol *</label>
                <Select
                  options={SYMBOL_OPTIONS}
                  value={form.symbol}
                  onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                  disabled={!!editingCurrency}
                />
                {editingCurrency && <p className="text-xs text-gray-500 mt-0.5">Symbol cannot be changed</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Tron"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chain *</label>
                <Select
                  options={CHAIN_OPTIONS}
                  value={form.chain}
                  onChange={(e) => setForm((f) => ({ ...f, chain: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color code (hex)</label>
                <Input
                  value={form.colorCode}
                  onChange={(e) => setForm((f) => ({ ...f, colorCode: e.target.value }))}
                  placeholder="#FF0018"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit address *</label>
                <Input
                  value={form.depositAddress}
                  onChange={(e) => setForm((f) => ({ ...f, depositAddress: e.target.value }))}
                  placeholder="Wallet address for receiving deposits"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={form.image}
                    onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                    placeholder="https://... or upload"
                    className="flex-1 min-w-0"
                  />
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
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
                {uploadError && <p className="text-xs text-danger-600 mt-1">{uploadError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min deposit amount</label>
                <Input
                  type="number"
                  min={0}
                  value={form.minimumDepositAmount}
                  onChange={(e) => setForm((f) => ({ ...f, minimumDepositAmount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min withdrawal amount</label>
                <Input
                  type="number"
                  min={0}
                  value={form.minimumWithdrawalAmount}
                  onChange={(e) => setForm((f) => ({ ...f, minimumWithdrawalAmount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit fee</label>
                <Input
                  type="number"
                  min={0}
                  value={form.depositFee}
                  onChange={(e) => setForm((f) => ({ ...f, depositFee: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit fee type</label>
                <Select
                  options={FEE_TYPE_OPTIONS}
                  value={form.depositFeeType}
                  onChange={(e) => setForm((f) => ({ ...f, depositFeeType: e.target.value as 'percentage' | 'fixed' }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal fee</label>
                <Input
                  type="number"
                  min={0}
                  value={form.withdrawalFee}
                  onChange={(e) => setForm((f) => ({ ...f, withdrawalFee: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal fee type</label>
                <Select
                  options={FEE_TYPE_OPTIONS}
                  value={form.withdrawalFeeType}
                  onChange={(e) => setForm((f) => ({ ...f, withdrawalFeeType: e.target.value as 'percentage' | 'fixed' }))}
                />
              </div>
              <div className="sm:col-span-2 flex flex-col gap-3 border-t border-gray-200 mt-2 pt-4">
                <div className="flex items-center gap-2">
                  <Switch checked={form.isActive} onChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))} />
                  <span className="text-sm text-gray-700">Active (currency available for deposits/withdrawals)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.depositEnabled} onChange={(checked) => setForm((f) => ({ ...f, depositEnabled: checked }))} />
                  <span className="text-sm text-gray-700">Enable Deposits (allow users to deposit this currency)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.withdrawalEnabled} onChange={(checked) => setForm((f) => ({ ...f, withdrawalEnabled: checked }))} />
                  <span className="text-sm text-gray-700">Enable Withdrawals (allow users to withdraw this currency)</span>
                </div>
              </div>
            </div>
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={closeFormModal} disabled={saveLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={saveLoading}>
              {editingCurrency ? 'Save changes' : 'Add currency'}
            </Button>
          </ModalFooter>
        </Modal>

        {/* Delete confirmation */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => { setIsDeleteModalOpen(false); setDeletingCurrency(null) }}
          title="Delete Currency"
          size="sm"
        >
          {deletingCurrency && (
            <>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete <strong>{deletingCurrency.name}</strong> ({deletingCurrency.symbol})? This cannot be undone.
              </p>
              <ModalFooter>
                <Button
                  variant="secondary"
                  onClick={() => { setIsDeleteModalOpen(false); setDeletingCurrency(null) }}
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
