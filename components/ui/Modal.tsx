'use client'

import React, { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { Button } from './Button'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  showCloseButton?: boolean
  className?: string
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  className,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.body.style.overflow = 'unset'
        document.removeEventListener('keydown', handleEscape)
      }
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-full',
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
      <div className="flex min-h-[100dvh] items-center justify-center py-4 sm:py-8">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity touch-none"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal - full width on small screens with margin */}
        <div
          className={cn(
            'relative bg-white rounded-lg shadow-xl w-full animate-fade-in',
            'max-h-[85vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden',
            'mx-auto',
            sizeClasses[size],
            className
          )}
        >
          {/* Header - touch-friendly close */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10 shrink-0">
              {title && <div className="min-w-0 flex-1">{typeof title === 'string' ? <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{title}</h3> : title}</div>}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="px-4 sm:px-6 py-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

export interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3',
        'px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0',
        className
      )}
    >
      {children}
    </div>
  )
}
