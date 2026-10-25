'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAppConfig } from '@/contexts/AppConfigContext'
import { useAdminAuth } from '@/lib/useAdminAuth'
import {
  LayoutDashboard,
  Users,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Receipt,
  Gamepad2,
  TrendingUp,
  Network,
  Settings,
  UserCog,
  X,
  Image as ImageIcon,
  Coins,
  Bell,
  MessageSquare,
  Smartphone,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
  /** Permission key required to see this item. Undefined = always visible (e.g. Dashboard). */
  permission?: string
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    // No permission required — visible to all authenticated users
  },
  {
    name: 'User Management',
    href: '/users',
    icon: <Users className="w-5 h-5" />,
    permission: 'users',
  },
  {
    name: 'Currency Management',
    href: '/currencies',
    icon: <Coins className="w-5 h-5" />,
    permission: 'currencies',
  },
  {
    name: 'Deposits',
    href: '/deposits',
    icon: <ArrowDownToLine className="w-5 h-5" />,
    permission: 'deposits',
  },
  {
    name: 'Withdrawals',
    href: '/withdrawals',
    icon: <ArrowUpFromLine className="w-5 h-5" />,
    permission: 'withdrawals',
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: <Receipt className="w-5 h-5" />,
    permission: 'transactions',
  },
  {
    name: 'Wallet Management',
    href: '/wallets',
    icon: <Wallet className="w-5 h-5" />,
    permission: 'wallets',
  },
  {
    name: 'Gaming Management',
    href: '/gaming',
    icon: <Gamepad2 className="w-5 h-5" />,
    permission: 'gaming',
  },
  {
    name: 'Banners',
    href: '/banners',
    icon: <ImageIcon className="w-5 h-5" />,
    permission: 'banners',
  },
  {
    name: 'App Versions',
    href: '/app-versions',
    icon: <Smartphone className="w-5 h-5" />,
    // No permission required — visible to admins (backend already enforces requireAdmin)
  },
  {
    name: 'Investment',
    href: '/roi',
    icon: <TrendingUp className="w-5 h-5" />,
    permission: 'investments',
  },
  {
    name: 'User and Teams',
    href: '/mlm',
    icon: <Network className="w-5 h-5" />,
    permission: 'mlm',
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: <Bell className="w-5 h-5" />,
    permission: 'notifications',
  },
  {
    name: 'Support tickets',
    href: '/support-tickets',
    icon: <MessageSquare className="w-5 h-5" />,
    permission: 'support_tickets',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: <Settings className="w-5 h-5" />,
    permission: 'settings',
  },
  {
    name: 'Admin Users',
    href: '/admin-users',
    icon: <UserCog className="w-5 h-5" />,
    permission: 'admin_users',
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname()
  const { config } = useAppConfig()
  const { isSuperAdmin, hasPermission } = useAdminAuth()

  // localStorage is unavailable on the server, so we must wait until after mount
  // to filter by permissions. Before mount we show all items to match the server HTML
  // and avoid a React hydration mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const platformName = config?.platformName || 'Winvest'
  const platformLogo = config?.logo

  // Superadmins see everything; subadmins only see items matching their permissions
  const visibleNavItems = !mounted
    ? navItems
    : navItems.filter((item) => !item.permission || isSuperAdmin || hasPermission(item.permission))

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-64 max-w-[85vw] bg-white border-r border-gray-200 flex flex-col z-50 transition-transform duration-300 ease-out',
          'lg:translate-x-0 lg:max-w-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo + Close (mobile) */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {platformLogo ? (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-white border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={platformLogo} alt={platformName} className="w-full h-full object-contain p-1" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-xl">{platformName.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{platformName}</h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-2.5 -mr-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation - touch-friendly links */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 overscroll-contain">
          <ul className="space-y-0.5 px-2 sm:px-3">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => onClose()}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 min-h-[44px] touch-manipulation',
                      'hover:bg-gray-100 active:bg-gray-200',
                      isActive
                        ? 'bg-primary-50 text-primary-600 font-medium'
                        : 'text-gray-700'
                    )}
                  >
                    {item.icon}
                    <span className="text-sm">{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 shrink-0">
          <p className="text-xs text-gray-500 text-center">
            © 2026 {platformName}. All rights reserved.
          </p>
        </div>
      </aside>
    </>
  )
}
