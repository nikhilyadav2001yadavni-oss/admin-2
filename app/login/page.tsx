'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Mail, Lock } from 'lucide-react'
import { authAPI } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await authAPI.login(email, password)
      const data = response.data?.data
      const token = data?.token?.accessToken
      if (token) {
        localStorage.setItem('admin_token', token)
        // Set cookie so middleware can protect routes (middleware can't read localStorage)
        const maxAge = 7 * 24 * 60 * 60 // 7 days
        document.cookie = `admin_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`
        router.push('/dashboard')
      } else {
        setError('Invalid response from server')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-primary-50 to-primary-100">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">W</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Winvest Admin</h1>
            <p className="text-gray-600 mt-2">Sign in to your account</p>
          </div>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-sm text-danger-600">{error}</p>
              </div>
            )}
            <Input
              type="email"
              label="Email"
              placeholder="admin@winvest.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />
            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Sign in with your admin account
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
