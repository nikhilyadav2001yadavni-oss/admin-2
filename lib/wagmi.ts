// Wagmi + Rainbow Kit configuration for multi-wallet support

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, polygon, bsc } from 'wagmi/chains'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

export const config = getDefaultConfig({
  appName: 'Winvest Admin',
  projectId: projectId || 'YOUR_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains: [mainnet, bsc, polygon],
  ssr: true,
})
