'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Menu } from 'lucide-react'
import { authAPI } from '@/lib/api'

interface HeaderProps {
  onMenuClick: () => void
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const router = useRouter()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    setShowProfileMenu(false)
    authAPI.logout()
    router.push('/login')
  }

  // Close profile dropdown when clicking outside (mouse or touch)
  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showProfileMenu])

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-14 sm:h-16 bg-white border-b border-gray-200 z-30">
      <div className="flex items-center justify-between h-full px-3 sm:px-4 lg:px-6">
        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 shrink-0" />
          </button>
        </div>

        {/* Right side - touch-friendly */}
        <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 shrink-0">
          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 lg:gap-3 p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:py-2 sm:px-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              aria-expanded={showProfileMenu}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-medium">AD</span>
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium text-gray-900">Admin User</p>
                <p className="text-xs text-gray-500">Super Admin</p>
              </div>
            </button>

            {/* Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 sm:w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-fade-in z-50">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 sm:py-2.5 text-sm text-danger-600 hover:bg-danger-50 active:bg-danger-50 min-h-[44px] sm:min-h-0 touch-manipulation"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
