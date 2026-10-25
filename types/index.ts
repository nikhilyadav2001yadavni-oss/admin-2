// Common types for the admin panel

export interface User {
  _id: string
  name: string
  email: string
  phone: string
  status: 'active' | 'inactive' | 'suspended'
  walletBalance: number
  referralCode: string
  referredBy?: string
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  _id: string
  userId: string
  type: 'deposit' | 'withdrawal' | 'game' | 'referral' | 'roi'
  amount: number
  status: 'pending' | 'completed' | 'rejected' | 'failed'
  description: string
  createdAt: string
  updatedAt: string
}

export interface Game {
  _id: string
  userId: string
  gameType: 'COLOR_CHANGER' | 'DICE_ROLL'
  betAmount: number
  winAmount: number
  result: 'win' | 'loss'
  createdAt: string
}

export interface GameConfig {
  _id: string
  gameType: 'COLOR_CHANGER' | 'DICE_ROLL' | 'DRAGON_TIGER' | 'SUPER_OVER' | 'MARBLE_RACE'
  gameName: string
  maxUserProfit: number
  maxUserLoss: number
  winProbability: number
  winMultiplier: number
  platformBalanceBuffer: number
  maxSmallWinAmount: number
  minBetAmount: number
  maxBetAmount: number
  isActive: boolean
  metadata?: {
    description?: string
    rules?: string[]
    notes?: string
  }
  createdAt: string
  updatedAt: string
}

export interface Wallet {
  _id: string
  userId: string
  balance: number
  lockedBalance: number
  totalDeposits: number
  totalWithdrawals: number
  createdAt: string
  updatedAt: string
}

export interface AdminUser {
  _id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'moderator'
  permissions: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalDeposits: number
  totalWithdrawals: number
  totalGamesPlayed: number
  platformRevenue: number
  pendingWithdrawals: number
  pendingDeposits: number
}

export interface ROIConfig {
  _id: string
  name: string
  minInvestment: number
  maxInvestment: number
  dailyReturnPercentage: number
  durationDays: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** ROI investment record (RoiInvestment collection). */
export interface Investment {
  _id: string
  userId: string
  userReferralCode?: string
  depositTransactionId: string
  principalAmount: number
  currentBalance: number
  lockInPeriod: number
  lockInStartDate: string
  lockInEndDate: string
  isLocked: boolean
  lastRoiCalculationDate: string
  totalRoiEarned: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  user?: { email?: string; name?: string; referralCode?: string }
}

export interface MLMConfig {
  _id: string
  level: number
  commissionPercentage: number
  minReferrals: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Notification {
  _id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  targetUsers: 'all' | 'specific'
  userIds?: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SystemSettings {
  maintenanceMode: boolean
  registrationEnabled: boolean
  depositEnabled: boolean
  withdrawalEnabled: boolean
  gamingEnabled: boolean
  minWithdrawalAmount: number
  maxWithdrawalAmount: number
  withdrawalProcessingTime: string
  supportEmail: string
  supportPhone: string
}

export interface Banner {
  _id: string
  title: string
  description: string
  imageUrl?: string | null
  link?: string | null
  isActive: boolean
  order: number
  createdAt: string
  updatedAt: string
}

export interface Currency {
  _id: string
  symbol: string
  name: string
  chain: string
  colorCode?: string | null
  image?: string | null
  depositAddress: string
  minimumDepositAmount: number
  minimumWithdrawalAmount: number
  depositFee: number
  depositFeeType: string
  withdrawalFee: number
  withdrawalFeeType: string
  isActive: boolean
  depositEnabled: boolean
  withdrawalEnabled: boolean
  createdAt: string
  updatedAt: string
}
