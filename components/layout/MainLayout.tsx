'use client'

import React, { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAppConfig } from '@/contexts/AppConfigContext'

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { config } = useAppConfig()

  // Update document title based on platform name
  useEffect(() => {
    if (config?.platformName) {
      document.title = `${config.platformName} - Admin Panel`
    }
  }, [config?.platformName])

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isSidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [isSidebarOpen])

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <main className="lg:ml-64 mt-16 p-3 sm:p-4 lg:p-6 pb-8 sm:pb-10">
        <div className="max-w-7xl mx-auto w-full min-w-0">{children}</div>
      </main>
    </div>
  )
}
