import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppConfigProvider } from '@/contexts/AppConfigContext'
import { RainbowKitProviders } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Winvest Admin Panel',
  description: 'Admin panel for Winvest platform management',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RainbowKitProviders>
          <AppConfigProvider>
            {children}
          </AppConfigProvider>
        </RainbowKitProviders>
      </body>
    </html>
  )
}
