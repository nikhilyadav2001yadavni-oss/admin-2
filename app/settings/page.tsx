'use client'

import React from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { adminAPI, systemConfigAPI } from '@/lib/api'
import { useAppConfig } from '@/contexts/AppConfigContext'
import { User, Mail, Shield, Save, RefreshCw, Eye, EyeOff, Upload, Image as ImageIcon, Link2 } from 'lucide-react'

interface AdminProfile {
  _id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface SystemConfig {
  _id: string
  platformName: string
  logo?: string | null
  darkMode: boolean
  pushNotification: boolean
  twoFA: boolean
  biometricLogin: boolean
  maintenance: boolean
  maintenanceMessage?: string | null
  supportEmail: string
  websiteDomain?: string | null
}

export default function SettingsPage() {
  const { refreshConfig } = useAppConfig()
  const [activeTab, setActiveTab] = React.useState<'profile' | 'system'>('profile')
  
  // Profile state
  const [profile, setProfile] = React.useState<AdminProfile | null>(null)
  const [profileForm, setProfileForm] = React.useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = React.useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [profileLoading, setProfileLoading] = React.useState(true)
  const [profileSaving, setProfileSaving] = React.useState(false)
  const [profileError, setProfileError] = React.useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = React.useState<string | null>(null)

  // System config state
  const [systemConfig, setSystemConfig] = React.useState<SystemConfig | null>(null)
  const [configLoading, setConfigLoading] = React.useState(true)
  const [configSaving, setConfigSaving] = React.useState(false)
  const [configError, setConfigError] = React.useState<string | null>(null)
  const [configSuccess, setConfigSuccess] = React.useState<string | null>(null)
  const [logoUploading, setLogoUploading] = React.useState(false)
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Fetch admin profile
  React.useEffect(() => {
    adminAPI
      .getProfile()
      .then((res) => {
        const data = res.data?.data
        if (data) {
          setProfile(data)
          setProfileForm({
            name: data.name || '',
            email: data.email || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          })
        }
      })
      .catch((err) => {
        setProfileError(err.response?.data?.message || 'Failed to load profile')
      })
      .finally(() => setProfileLoading(false))
  }, [])

  // Fetch system config
  React.useEffect(() => {
    systemConfigAPI
      .get()
      .then((res) => {
        const data = res.data?.data
        if (data) {
          setSystemConfig(data)
          setLogoPreview(data.logo || null)
        }
      })
      .catch((err) => {
        setConfigError(err.response?.data?.message || 'Failed to load system config')
      })
      .finally(() => setConfigLoading(false))
  }, [])

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError(null)
    setProfileSuccess(null)

    // Validation
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setProfileError('Name and email are required')
      return
    }

    if (profileForm.newPassword) {
      if (profileForm.newPassword.length < 6) {
        setProfileError('New password must be at least 6 characters')
        return
      }
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        setProfileError('New passwords do not match')
        return
      }
      if (!profileForm.currentPassword) {
        setProfileError('Current password is required to set a new password')
        return
      }
    }

    setProfileSaving(true)
    const updateData: any = {
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
    }

    if (profileForm.newPassword) {
      updateData.currentPassword = profileForm.currentPassword
      updateData.newPassword = profileForm.newPassword
    }

    adminAPI
      .updateProfile(updateData)
      .then((res) => {
        setProfileSuccess('Profile updated successfully!')
        setProfile(res.data?.data || profile)
        setProfileForm({
          ...profileForm,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
      })
      .catch((err) => {
        setProfileError(err.response?.data?.message || 'Failed to update profile')
      })
      .finally(() => setProfileSaving(false))
  }

  const handleSystemConfigUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!systemConfig) return

    setConfigError(null)
    setConfigSuccess(null)
    setConfigSaving(true)

    systemConfigAPI
      .update(systemConfig)
      .then((res) => {
        setConfigSuccess('System configuration updated successfully!')
        setSystemConfig(res.data?.data || systemConfig)
      })
      .catch((err) => {
        setConfigError(err.response?.data?.message || 'Failed to update system configuration')
      })
      .finally(() => setConfigSaving(false))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setConfigError('Please upload an image file')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setConfigError('Image size should be less than 5MB')
      return
    }

    setConfigError(null)
    setLogoUploading(true)

    try {
      const res = await systemConfigAPI.uploadLogo(file)
      const logoUrl = res.data?.data?.logo
      
      if (logoUrl && systemConfig) {
        setSystemConfig({ ...systemConfig, logo: logoUrl })
        setLogoPreview(logoUrl)
        setConfigSuccess('Logo uploaded successfully!')
        refreshConfig() // Refresh the global config so sidebar updates
      }
    } catch (err: any) {
      setConfigError(err.response?.data?.message || 'Failed to upload logo')
    } finally {
      setLogoUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleLogoRemove = () => {
    if (systemConfig) {
      setSystemConfig({ ...systemConfig, logo: null })
      setLogoPreview(null)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your profile and system configuration</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`${
                activeTab === 'profile'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Admin Profile
              </div>
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`${
                activeTab === 'system'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                System Configuration
              </div>
            </button>
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {/* Profile Info Card */}
            <Card>
              <CardBody className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
                    <p className="text-sm text-gray-600 mt-1">Update your personal details</p>
                  </div>
                  {profile && (
                    <Badge variant="primary">
                      {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                    </Badge>
                  )}
                </div>

                {profileError && (
                  <div className="mb-4 p-4 bg-danger-50 border border-danger-200 rounded-lg">
                    <p className="text-danger-600 text-sm">{profileError}</p>
                  </div>
                )}

                {profileSuccess && (
                  <div className="mb-4 p-4 bg-success-50 border border-success-200 rounded-lg">
                    <p className="text-success-600 text-sm">{profileSuccess}</p>
                  </div>
                )}

                {profileLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Full Name"
                        leftIcon={<User className="w-4 h-4" />}
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        required
                      />
                      <Input
                        label="Email Address"
                        type="email"
                        leftIcon={<Mail className="w-4 h-4" />}
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        required
                      />
                    </div>

                    {profile && (
                      <div className="pt-4 pb-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          Account created on {new Date(profile.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Change Password Card */}
            <Card>
              <CardBody className="p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                  <p className="text-sm text-gray-600 mt-1">Update your password to keep your account secure</p>
                </div>

                {!profileLoading && (
                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        label="Current Password"
                        type={showPasswords.current ? 'text' : 'password'}
                        value={profileForm.currentPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <Input
                          label="New Password"
                          type={showPasswords.new ? 'text' : 'password'}
                          value={profileForm.newPassword}
                          onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="relative">
                        <Input
                          label="Confirm New Password"
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={profileForm.confirmPassword}
                          onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500">
                      Password must be at least 6 characters long
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                size="lg"
                leftIcon={profileSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                disabled={profileSaving || profileLoading}
              >
                {profileSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        )}

        {/* System Configuration Tab */}
        {activeTab === 'system' && (
          <form onSubmit={handleSystemConfigUpdate} className="space-y-6">
            <Card>
              <CardBody className="p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">System Configuration</h2>
                  <p className="text-sm text-gray-600 mt-1">Configure platform features and settings</p>
                </div>

                {configError && (
                  <div className="mb-4 p-4 bg-danger-50 border border-danger-200 rounded-lg">
                    <p className="text-danger-600 text-sm">{configError}</p>
                  </div>
                )}

                {configSuccess && (
                  <div className="mb-4 p-4 bg-success-50 border border-success-200 rounded-lg">
                    <p className="text-success-600 text-sm">{configSuccess}</p>
                  </div>
                )}

                {configLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                  </div>
                ) : systemConfig ? (
                  <div className="space-y-4">
                    {/* Platform Name */}
                    <div className="pb-4">
                      <Input
                        label="Platform Name"
                        value={systemConfig.platformName}
                        onChange={(e) =>
                          setSystemConfig({ ...systemConfig, platformName: e.target.value })
                        }
                        placeholder="Winvest"
                        required
                      />
                    </div>

                    {/* Logo Upload */}
                    <div className="pb-4 border-b border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Platform Logo
                      </label>
                      <div className="flex items-start gap-4">
                        {/* Logo Preview */}
                        <div className="flex-shrink-0">
                          {logoPreview ? (
                            <div className="relative w-32 h-32 border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={logoPreview}
                                alt="Logo"
                                className="w-full h-full object-contain p-2"
                              />
                              <button
                                type="button"
                                onClick={handleLogoRemove}
                                className="absolute top-1 right-1 bg-danger-500 text-white p-1 rounded-full hover:bg-danger-600 transition-colors"
                                disabled={logoUploading || configSaving}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                              <ImageIcon className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Upload Button */}
                        <div className="flex-1">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            disabled={logoUploading || configSaving}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={logoUploading || configSaving}
                            leftIcon={logoUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          >
                            {logoUploading ? 'Uploading...' : 'Upload Logo'}
                          </Button>
                          <p className="text-xs text-gray-500 mt-2">
                            Recommended: Square image, max 5MB. Supports PNG, JPG, GIF.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Maintenance Mode */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">Maintenance Mode</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Put the app in maintenance mode (users will see maintenance message)
                        </p>
                      </div>
                      <Switch
                        checked={systemConfig.maintenance}
                        onChange={(checked) =>
                          setSystemConfig({ ...systemConfig, maintenance: checked })
                        }
                      />
                    </div>

                    {/* Maintenance Message */}
                    {systemConfig.maintenance && (
                      <div className="pl-4">
                        <Textarea
                          label="Maintenance Message"
                          value={systemConfig.maintenanceMessage || ''}
                          onChange={(e) =>
                            setSystemConfig({ ...systemConfig, maintenanceMessage: e.target.value })
                          }
                          placeholder="Our app is temporarily unavailable due to scheduled maintenance. We'll be back soon!"
                          rows={3}
                        />
                      </div>
                    )}

                    {/* Push Notifications */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">Push Notifications</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Enable push notifications for user app
                        </p>
                      </div>
                      <Switch
                        checked={systemConfig.pushNotification}
                        onChange={(checked) =>
                          setSystemConfig({ ...systemConfig, pushNotification: checked })
                        }
                      />
                    </div>

                    {/* Two Factor Authentication */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Require 2FA for user login
                        </p>
                      </div>
                      <Switch
                        checked={systemConfig.twoFA}
                        onChange={(checked) =>
                          setSystemConfig({ ...systemConfig, twoFA: checked })
                        }
                      />
                    </div>

                    {/* Biometric Login */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">Biometric Login</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Allow users to login with fingerprint/face recognition
                        </p>
                      </div>
                      <Switch
                        checked={systemConfig.biometricLogin}
                        onChange={(checked) =>
                          setSystemConfig({ ...systemConfig, biometricLogin: checked })
                        }
                      />
                    </div>

                    {/* Dark Mode */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">Dark Mode</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Enable dark mode option for user app
                        </p>
                      </div>
                      <Switch
                        checked={systemConfig.darkMode}
                        onChange={(checked) =>
                          setSystemConfig({ ...systemConfig, darkMode: checked })
                        }
                      />
                    </div>

                    {/* Support Email */}
                    <div className="pt-4">
                      <Input
                        label="Support Email"
                        type="email"
                        value={systemConfig.supportEmail}
                        onChange={(e) =>
                          setSystemConfig({ ...systemConfig, supportEmail: e.target.value })
                        }
                        placeholder="support@winvest.com"
                        leftIcon={<Mail className="w-4 h-4" />}
                        required
                      />
                    </div>

                    {/* Website Domain */}
                    <div className="pt-4">
                      <Input
                        label="Website Domain"
                        type="url"
                        value={systemConfig.websiteDomain || ''}
                        onChange={(e) =>
                          setSystemConfig({ ...systemConfig, websiteDomain: e.target.value || null })
                        }
                        placeholder="https://example.com"
                        leftIcon={<Link2 className="w-4 h-4" />}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No configuration found</p>
                )}
              </CardBody>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                size="lg"
                leftIcon={configSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                disabled={configSaving || configLoading || !systemConfig}
              >
                {configSaving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </MainLayout>
  )
}
