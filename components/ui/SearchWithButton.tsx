'use client'

import React from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Search } from 'lucide-react'

interface SearchWithButtonProps {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  placeholder?: string
  label?: string
}

export function SearchWithButton({ value, onChange, onSearch, placeholder = 'Search...', label = 'Search' }: SearchWithButtonProps) {
  return (
    <div className="flex gap-2 flex-1 min-w-0 w-full sm:min-w-[200px] sm:w-auto">
      <div className="flex-1 min-w-0">
        <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
        <Input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onSearch())}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>
      <div className="flex flex-col justify-end">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onSearch}
          className="h-[42px] sm:h-[34px] px-4 shrink-0"
        >
          Search
        </Button>
      </div>
    </div>
  )
}
