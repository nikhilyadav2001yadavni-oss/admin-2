/**
 * Download a blob as a file in the browser.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const EXPORT_FORMATS = [
  { value: 'xlsx', label: 'Excel (.xlsx)', ext: 'xlsx' },
  { value: 'csv', label: 'CSV (.csv)', ext: 'csv' },
  { value: 'pdf', label: 'PDF (.pdf)', ext: 'pdf' },
] as const

export type ExportFormatValue = (typeof EXPORT_FORMATS)[number]['value']

export interface ExportColumn {
  key: string
  label: string
}

// ─── CSV ────────────────────────────────────────────────────────────────────

function toCsv(rows: Record<string, unknown>[], columns: ExportColumn[]): Blob {
  const header = columns.map((c) => `"${c.label}"`).join(',')
  const body = rows.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key] ?? ''
        return `"${String(val).replace(/"/g, '""')}"`
      })
      .join(',')
  )
  const content = [header, ...body].join('\r\n')
  return new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
}

// ─── XLSX ────────────────────────────────────────────────────────────────────

async function toXlsx(rows: Record<string, unknown>[], columns: ExportColumn[]): Promise<Blob> {
  try {
    const XLSX = (await import('xlsx')) as any
    const ws = XLSX.utils.json_to_sheet(
      rows.map((row) =>
        Object.fromEntries(columns.map((c) => [c.label, row[c.key] ?? '']))
      )
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report')
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  } catch (err) {
    console.error('Export error details:', err)
    throw err
  }
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

async function toPdf(
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  title: string
): Promise<Blob> {
  try {
    const jspdfMod = await import('jspdf')
    // jsPDF may be the default export or a named export depending on the version
    const jsPDF = (jspdfMod as any).default ?? (jspdfMod as any).jsPDF
    if (typeof jsPDF !== 'function') {
      throw new Error('jsPDF constructor not found — check the jspdf package installation')
    }

    const autoTableMod = await import('jspdf-autotable')
    // jspdf-autotable v5 may expose the function as .default or as the module itself
    const autoTable = typeof (autoTableMod as any).default === 'function'
      ?        (autoTableMod as any).default
      : autoTableMod
    if (typeof autoTable !== 'function') {
      throw new Error('autoTable is not a function — check the jspdf-autotable package installation')
    }

    const doc = new jsPDF({ orientation: 'landscape' }) as any
    doc.setFontSize(14)
    doc.text(title, 14, 16)
    autoTable(doc, {
      startY: 22,
      head: [columns.map((c) => c.label)],
      body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ''))),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    })

    const output = doc.output('blob')
    // Newer jsPDF versions may return Uint8Array instead of Blob
    if (output instanceof Blob) return output
    return new Blob([output], { type: 'application/pdf' })
  } catch (err) {
    console.error('Export error details:', err)
    throw err
  }
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export async function exportData(
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  format: ExportFormatValue,
  baseName: string
): Promise<void> {
  const ext = EXPORT_FORMATS.find((f) => f.value === format)?.ext ?? format
  const filename = `${baseName}.${ext}`

  let blob: Blob
  if (format === 'xlsx') {
    blob = await toXlsx(rows, columns)
  } else if (format === 'pdf') {
    blob = await toPdf(rows, columns, baseName)
  } else {
    blob = toCsv(rows, columns)
  }

  downloadBlob(blob, filename)
}
