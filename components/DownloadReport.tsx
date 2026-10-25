'use client'

import React, { useState } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Download } from 'lucide-react'
import {
  exportData,
  EXPORT_FORMATS,
  type ExportFormatValue,
  type ExportColumn,
} from '@/lib/exportUtils'
import { cn } from '@/lib/utils'

export interface DownloadReportProps {
  reportType: string
  title: string
  fetchData: (params?: Record<string, unknown>) => Promise<{ data: Record<string, unknown>[] }>
  columns: ExportColumn[]
  params?: Record<string, string | number | boolean | undefined>
  className?: string
}

export function DownloadReport({
  reportType,
  title,
  fetchData,
  columns,
  params = {},
  className,
}: DownloadReportProps) {
  const [loadingFormat, setLoadingFormat] = useState<ExportFormatValue | null>(null)

  const handleDownload = async (format: ExportFormatValue) => {
    setLoadingFormat(format)
    try {
      const result = await fetchData(params as Record<string, unknown>)
      const rows = result.data ?? []
      await exportData(rows, columns, format, `${reportType}-report`)
    } catch (err) {
      console.error('Export failed:', err)
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || 'Failed to download report')
    } finally {
      setLoadingFormat(null)
    }
  }

  return (
    <Card className={cn('', className)}>
      <CardBody>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{title}</span>
          <div className="flex flex-wrap items-center gap-2">
            {EXPORT_FORMATS.map(({ value, label }) => (
              <Button
                key={value}
                variant="secondary"
                size="sm"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={() => handleDownload(value)}
                disabled={loadingFormat !== null}
                isLoading={loadingFormat === value}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
