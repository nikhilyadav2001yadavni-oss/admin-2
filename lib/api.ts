import axios from 'axios'
import { resolveApiV1BaseUrl } from './apiBaseUrl'

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

/** Get admin token: localStorage first, then cookie (browser only). Keeps backend from getting requests without token when session exists in cookie. */
function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  const fromStorage = localStorage.getItem('admin_token')
  if (fromStorage) return fromStorage
  const match = document.cookie.match(/admin_token=([^;]+)/)
  if (match?.[1]) {
    const token = match[1].trim()
    localStorage.setItem('admin_token', token)
    return token
  }
  return null
}

// Request interceptor: correct API base (see lib/apiBaseUrl.ts), auth, cache buster
api.interceptors.request.use(
  (config) => {
    config.baseURL = resolveApiV1BaseUrl()
    const token = getAdminToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Cache buster: append timestamp so every request bypasses browser/CDN cache
    config.params = { ...config.params, _t: Date.now() }
    // FormData: do not send Content-Type so axios sets multipart/form-data with boundary (required for file upload)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      document.cookie = 'admin_token=; path=/; max-age=0'
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth APIs (backend: POST /api/v1/admin/signin)
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/admin/signin', { email, password }),
  logout: () => {
    localStorage.removeItem('admin_token')
    document.cookie = 'admin_token=; path=/; max-age=0'
  },
  me: () => api.get('/admin/system-config'), // optional: validate token by calling a protected route
}

// Dashboard APIs (backend routes: /admin/dashboard-stats, /admin/recent-transactions, /admin/recent-games)
export const dashboardAPI = {
  getStats: () => api.get('/admin/dashboard-stats'),
  getRecentTransactions: (limit?: number) =>
    api.get('/admin/recent-transactions', { params: limit != null ? { limit } : undefined }),
  getRecentGames: (limit?: number) =>
    api.get('/admin/recent-games', { params: limit != null ? { limit } : undefined }),
  getChartData: (period: string) => api.get(`/admin/dashboard/chart-data?period=${period}`),
}

// User APIs
export const userAPI = {
  getAll: (params?: any) => api.get('/admin/users', { params }),
  getById: (id: string) => api.get(`/admin/users/${id}`),
  getVerificationSummary: (userId: string) =>
    api.get(`/admin/users/${userId}/verification-summary`),
  create: (data: any) => api.post('/admin/users', data),
  update: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  delete: (id: string) => api.delete(`/admin/users/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/admin/users/${id}/status`, { status }),
  setWithdrawalLimit: (id: string, data: { enabled: boolean; period: 'daily' | 'weekly' | 'monthly'; amount: number }) =>
    api.patch(`/admin/users/${id}/withdrawal-limit`, data),
  setBulkWithdrawalLimit: (data: { enabled: boolean; period: 'daily' | 'weekly' | 'monthly'; amount: number }) =>
    api.patch('/admin/withdrawal-limit/bulk', data),
}

// Currency APIs (admin)
export const currencyAPI = {
  getAll: (activeOnly?: boolean) =>
    api.get('/admin/currencies', { params: activeOnly != null ? { activeOnly } : undefined }),
  create: (data: {
    symbol: string
    name: string
    chain: string
    depositAddress: string
    colorCode?: string
    image?: string
    minimumDepositAmount?: number
    minimumWithdrawalAmount?: number
    depositFee?: number
    depositFeeType?: string
    withdrawalFee?: number
    withdrawalFeeType?: string
    isActive?: boolean
  }) => api.post('/admin/currency', data),
  update: (id: string, data: Partial<{
    name: string
    chain: string
    colorCode: string | null
    image: string | null
    depositAddress: string
    minimumDepositAmount: number
    minimumWithdrawalAmount: number
    depositFee: number
    depositFeeType: string
    withdrawalFee: number
    withdrawalFeeType: string
    isActive: boolean
  }>) => api.put(`/admin/currencies/${id}`, data),
  delete: (id: string) => api.delete(`/admin/currencies/${id}`),
}

// Deposit APIs (admin)
export const depositStatsAPI = {
  getDepositStats: () => api.get('/admin/deposit-stats'),
}

// Transaction APIs
export const transactionAPI = {
  getAll: (params?: any) => api.get('/admin/transactions', { params }),
  getById: (id: string) => api.get(`/admin/transactions/${id}`),
  approve: (id: string) => api.patch(`/admin/transactions/${id}/approve`),
  reject: (id: string, reason: string) =>
    api.patch(`/admin/transactions/${id}/reject`, { reason }),
}

// Game APIs
export const gameAPI = {
  getAll: (params?: any) => api.get('/admin/games', { params }),
  getById: (id: string) => api.get(`/admin/games/${id}`),
  getStats: () => api.get('/admin/games/stats'),
}

// Game Config APIs
export const gameConfigAPI = {
  getAll: () => api.get('/admin/game-configs'),
  getById: (id: string) => api.get(`/admin/game-configs/${id}`),
  update: (id: string, data: any) => api.put(`/admin/game-configs/${id}`, data),
  toggleActive: (id: string) => api.patch(`/admin/game-configs/${id}/toggle-active`),
}

// Wallet APIs
export const walletStatsAPI = {
  getWalletStats: () => api.get('/admin/wallet-stats'),
}

export const walletAPI = {
  getAll: (params?: any) => api.get('/admin/wallets', { params }),
  getById: (id: string) => api.get(`/admin/wallets/${id}`),
  adjustFunds: (
    userId: string,
    walletType: 'gamingWallet' | 'roiWallet',
    type: 'add' | 'deduct',
    amount: number,
    description: string
  ) =>
    api.post('/admin/wallets/adjust-funds', {
      userId,
      walletType,
      type,
      amount,
      description,
    }),
}

// Deposit APIs
export const depositAPI = {
  getAll: (params?: any) => api.get('/admin/deposits', { params }),
  getById: (id: string) => api.get(`/admin/deposits/${id}`),
  approve: (id: string) => api.patch(`/admin/deposits/${id}/approve`),
  reject: (id: string, reason: string) =>
    api.patch(`/admin/deposits/${id}/reject`, { reason }),
}

// Withdrawal APIs
export const withdrawalStatsAPI = {
  getWithdrawalStats: () => api.get('/admin/withdrawal-stats'),
}

export const withdrawalAPI = {
  getAll: (params?: any) => api.get('/admin/withdrawals', { params }),
  getById: (id: string) => api.get(`/admin/withdrawals/${id}`),
  verify: (transactionId: string) =>
    api.post('/admin/withdrawal/verify', { transactionId }),
  process: (transactionId: string, action: 'APPROVE' | 'REJECT', transactionHash?: string, reason?: string) =>
    api.post('/admin/withdrawal/process', { transactionId, action, transactionHash, reason }),
}

// ROI APIs (legacy configs)
export const roiAPI = {
  getAll: () => api.get('/admin/roi-configs'),
  getById: (id: string) => api.get(`/admin/roi-configs/${id}`),
  create: (data: any) => api.post('/admin/roi-configs', data),
  update: (id: string, data: any) => api.put(`/admin/roi-configs/${id}`, data),
  delete: (id: string) => api.delete(`/admin/roi-configs/${id}`),
  toggleActive: (id: string) => api.patch(`/admin/roi-configs/${id}/toggle-active`),
}

// Investment Config APIs (Super Admin only – direct/indirect/ROI rates)
export const investmentConfigAPI = {
  get: () => api.get('/admin/investment-config'),
  update: (data: {
    directCommissionRate?: number
    indirectCommissionRate?: number
    monthlyRoiRate?: number
  }) => api.put('/admin/investment-config', data),
}

// Investment APIs (ROI investment records – stats, list and pause/start)
export const investmentAPI = {
  getStats: () => api.get('/admin/investments/stats'),
  getList: (params?: {
    skip?: number
    limit?: number
    search?: string
    status?: 'all' | 'active' | 'paused'
    fromDate?: string
    toDate?: string
  }) => api.get('/admin/investments', { params }),
  setActive: (id: string, isActive: boolean) =>
    api.patch(`/admin/investments/${id}/active`, { isActive }),
}

// User and Teams APIs (MLM/Referral network)
export const userTeamsAPI = {
  getStats: () => api.get('/admin/user-teams/stats'),
  getList: (params?: {
    skip?: number
    limit?: number
    search?: string
    fromDate?: string
    toDate?: string
  }) => api.get('/admin/user-teams', { params }),
  getTeamTree: (userId: string) => api.get(`/admin/user-teams/${userId}/tree`),
}

// Admin Profile APIs
export const adminAPI = {
  getProfile: () => api.get('/admin/profile'),
  updateProfile: (data: {
    name: string
    email: string
    currentPassword?: string
    newPassword?: string
  }) => api.put('/admin/profile', data),
}

// System Configuration APIs
export const systemConfigAPI = {
  get: () => api.get('/admin/system-config'),
  update: (data: {
    platformName?: string
    logo?: string | null
    darkMode?: boolean
    pushNotification?: boolean
    twoFA?: boolean
    biometricLogin?: boolean
    maintenance?: boolean
    maintenanceMessage?: string | null
    supportEmail?: string
    websiteDomain?: string | null
  }) => api.put('/admin/system-config', data),
  uploadLogo: (file: File) => {
    const formData = new FormData()
    formData.append('logo', file)
    return api.post('/admin/system-config/upload-logo', formData)
  },
}

// MLM APIs
export const mlmAPI = {
  getAll: () => api.get('/admin/mlm-configs'),
  getById: (id: string) => api.get(`/admin/mlm-configs/${id}`),
  create: (data: any) => api.post('/admin/mlm-configs', data),
  update: (id: string, data: any) => api.put(`/admin/mlm-configs/${id}`, data),
  delete: (id: string) => api.delete(`/admin/mlm-configs/${id}`),
  toggleActive: (id: string) => api.patch(`/admin/mlm-configs/${id}/toggle-active`),
  getReferralTree: (userId: string) => api.get(`/admin/mlm/referral-tree/${userId}`),
}

// Notification APIs
export const notificationAPI = {
  getAll: () => api.get('/admin/notifications'),
  getById: (id: string) => api.get(`/admin/notifications/${id}`),
  create: (data: any) => api.post('/admin/notifications', data),
  update: (id: string, data: any) => api.put(`/admin/notifications/${id}`, data),
  delete: (id: string) => api.delete(`/admin/notifications/${id}`),
  send: (id: string) => api.post(`/admin/notifications/${id}/send`),
  /** Send notification to selected users. Body: { userIds, title, message, sendInApp?, sendEmail?, sendPush? } */
  sendToUsers: (data: {
    userIds: string[]
    title: string
    message: string
    sendInApp?: boolean
    sendEmail?: boolean
    sendPush?: boolean
  }) => api.post('/admin/notifications/send', data),
}

// Settings APIs
export const settingsAPI = {
  getSystem: () => api.get('/admin/settings/system'),
  updateSystem: (data: any) => api.put('/admin/settings/system', data),
}

// Admin User APIs
export const adminUserAPI = {
  getAll: () => api.get('/admin/admin-users'),
  getById: (id: string) => api.get(`/admin/admin-users/${id}`),
  create: (data: any) => api.post('/admin/admin-users', data),
  update: (id: string, data: any) => api.put(`/admin/admin-users/${id}`, data),
  delete: (id: string) => api.delete(`/admin/admin-users/${id}`),
  toggleActive: (id: string) => api.patch(`/admin/admin-users/${id}/toggle-active`),
}

// Helper APIs (backend: /api/v1/helper) - image upload
export const helperAPI = {
  uploadImage: (file: File, folder?: string) => {
    const formData = new FormData()
    formData.append('image', file)
    if (folder) formData.append('folder', folder)
    return api.post<{ success: boolean; message: string; data: { url: string; secure_url: string; public_id: string } }>(
      '/helper/upload-image',
      formData
    )
  },
}

// Support tickets — admin list/detail; send reply uses user route with admin JWT (senderType SUPPORT)
export const supportTicketAPI = {
  list: (params?: { page?: number; limit?: number; status?: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' }) =>
    api.get('/admin/support-tickets', { params }),
  getDetail: (ticketId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/admin/support-tickets/${ticketId}`, { params }),
  sendMessage: (ticketId: string, message: string, attachmentUrls?: string[]) =>
    api.post(`/support-tickets/${ticketId}/messages`, {
      message,
      attachmentUrls: attachmentUrls ?? [],
    }),
  closeTicket: (ticketId: string, comment?: string) =>
    api.patch(`/admin/support-tickets/${ticketId}/close`, { comment: comment ?? '' }),
}

// App Version APIs (backend: /api/v1/app-version)
export interface AppVersion {
  _id: string
  platform: 'android' | 'ios'
  versionName: string
  versionCode: number
  apkUrl: string
  apkFilename?: string | null
  apkSizeBytes?: number | null
  checksumSha256?: string | null
  releaseNotes?: string | null
  forceUpdate: boolean
  minSupportedVersionCode?: number | null
  isActive: boolean
  uploadedBy?: { adminId?: string | null; name?: string | null; email?: string | null } | null
  createdAt: string
  updatedAt: string
}

export const appVersionAPI = {
  list: (platform?: string) =>
    api.get<{ success: boolean; message: string; data: AppVersion[] }>(
      '/app-version',
      { params: platform ? { platform } : undefined }
    ),
  getById: (id: string) =>
    api.get<{ success: boolean; message: string; data: AppVersion }>(`/app-version/${id}`),
  create: (
    payload: {
      platform?: 'android' | 'ios'
      versionName: string
      versionCode: number
      apkUrl?: string
      releaseNotes?: string
      forceUpdate?: boolean
      minSupportedVersionCode?: number | null
      isActive?: boolean
      checksumSha256?: string
    },
    file?: File | null,
    onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void
  ) => {
    if (file) {
      const formData = new FormData()
      formData.append('apk', file)
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null) formData.append(k, String(v))
      })
      return api.post<{ success: boolean; message: string; data: AppVersion }>(
        '/app-version',
        formData,
        { onUploadProgress }
      )
    }
    return api.post<{ success: boolean; message: string; data: AppVersion }>(
      '/app-version',
      payload
    )
  },
  update: (
    id: string,
    payload: Partial<{
      versionName: string
      releaseNotes: string | null
      forceUpdate: boolean
      minSupportedVersionCode: number | null
      isActive: boolean
      checksumSha256: string | null
      apkUrl: string
    }>
  ) =>
    api.put<{ success: boolean; message: string; data: AppVersion }>(
      `/app-version/${id}`,
      payload
    ),
  setActive: (id: string) =>
    api.patch<{ success: boolean; message: string; data: AppVersion }>(
      `/app-version/${id}/activate`
    ),
  delete: (id: string) =>
    api.delete<{ success: boolean; message: string; data: null }>(`/app-version/${id}`),
}

// Banner APIs (backend: /api/v1/banner)
export const bannerAPI = {
  getAll: (activeOnly?: boolean) =>
    api.get('/banner/all', { params: activeOnly != null ? { activeOnly } : undefined }),
  getById: (id: string) => api.get(`/banner/${id}`),
  create: (data: { title: string; description: string; imageUrl?: string; link?: string; isActive?: boolean; order?: number }) =>
    api.post('/banner', data),
  update: (id: string, data: { title?: string; description?: string; imageUrl?: string; link?: string; isActive?: boolean; order?: number }) =>
    api.put(`/banner/${id}`, data),
  delete: (id: string) => api.delete(`/banner/${id}`),
}

export default api
