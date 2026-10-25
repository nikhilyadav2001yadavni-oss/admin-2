'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Download, ChevronDown } from 'lucide-react'
import { exportData, EXPORT_FORMATS, type ExportFormatValue, type ExportColumn } from '@/lib/exportUtils'

export interface ExportDropdownProps {
  /** Identifier used as the base filename (e.g. "users", "transactions"). */
  reportType: string
  /**
   * Async function that fetches the data to export.
   * Receives the current filter params and must return `{ data: Record<string, unknown>[] }`.
   */
  fetchData: (params?: Record<string, unknown>) => Promise<{ data: Record<string, unknown>[] }>
  /** Column definitions — determines which fields are included and their header labels. */
  columns: ExportColumn[]
  /** Extra query params forwarded to fetchData (e.g. current search/filter state). */
  params?: Record<string, string | number | boolean | undefined>
  label?: string
  className?: string
}

export function ExportDropdown({
  reportType,
  fetchData,
  columns,
  params = {},
  label = 'Export',
  className,
}: ExportDropdownProps) {
  const [open, setOpen] = useState(false)
  const [loadingFormat, setLoadingFormat] = useState<ExportFormatValue | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [open])

  const handleDownload = async (format: ExportFormatValue) => {
    if (typeof fetchData !== 'function') {
      console.error('ExportDropdown: fetchData prop is not a function', fetchData)
      alert('Export is not configured for this section yet.')
      return
    }
    setLoadingFormat(format)
    setOpen(false)
    try {
      const exportParams: Record<string, unknown> = {
        ...params,
        limit: 50000,
        skip: 0,
      }
      const result = await fetchData(exportParams)
      const rows = result.data ?? []
      await exportData(rows, columns, format, `${reportType}-report`)
    } catch (err) {
      console.error('Export error details:', err)
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : undefined)
      alert(msg || 'Failed to export report')
    } finally {
      setLoadingFormat(null)
    }
  }

  return (
    <div className={`relative ${className ?? ''}`} ref={ref}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        rightIcon={<ChevronDown className="w-4 h-4" />}
        onClick={() => setOpen((o) => !o)}
        disabled={loadingFormat !== null}
        isLoading={loadingFormat !== null}
      >
        {label}
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 py-1 min-w-[140px] bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          {EXPORT_FORMATS.map(({ value, label: formatLabel }) => (
            <button
              key={value}
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => handleDownload(value)}
            >
              <Download className="w-4 h-4 shrink-0" />
              {formatLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
