// Multi-wallet withdrawal payment utilities (Rainbow Kit / wagmi / viem)

import type { WalletClient } from 'viem'
import { encodeFunctionData, parseEther, parseUnits } from 'viem'

const ERC20_TRANSFER_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

interface TokenInfo {
  address: `0x${string}`
  decimals: number
}

const TOKEN_CONTRACTS: Record<string, Record<string, TokenInfo>> = {
  ethereum: {
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    DAI: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
  },
  bsc: {
    USDT: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
    USDC: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
    BUSD: { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18 },
  },
  polygon: {
    USDT: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
    USDC: { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
  },
}

const NATIVE_CURRENCIES = new Set(['ETH', 'BNB', 'MATIC', 'AVAX', 'FTM'])

export interface SendWithdrawalResult {
  txHash: string
}

/**
 * Send withdrawal payment using a connected wallet (via Rainbow Kit / wagmi).
 * Supports native currencies and ERC-20/BEP-20 tokens.
 */
export async function sendWithdrawalPayment(
  walletClient: WalletClient,
  account: `0x${string}`,
  toAddress: string,
  amount: number,
  currency: string,
  network: string,
): Promise<SendWithdrawalResult> {
  const currencyUpper = currency.toUpperCase()
  const networkLower = network.toLowerCase()

  if (NATIVE_CURRENCIES.has(currencyUpper)) {
    const value = parseEther(amount.toString())
    const hash = await walletClient.sendTransaction({
      account,
      to: toAddress as `0x${string}`,
      value,
      gas: BigInt(21000),
      chain: walletClient.chain ?? undefined,
    })
    return { txHash: hash }
  }

  const networkContracts = TOKEN_CONTRACTS[networkLower]
  if (!networkContracts) {
    throw new Error(
      `Network "${network}" is not supported. Please send the funds manually and paste the transaction hash.`,
    )
  }

  const tokenInfo = networkContracts[currencyUpper]
  if (!tokenInfo) {
    throw new Error(
      `Token "${currency}" on network "${network}" is not configured. Please send the funds manually and paste the transaction hash.`,
    )
  }

  const amountWei = parseUnits(amount.toString(), tokenInfo.decimals)
  const data = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: 'transfer',
    args: [toAddress as `0x${string}`, amountWei],
  })

  const hash = await walletClient.sendTransaction({
    account,
    to: tokenInfo.address,
    data,
    gas: BigInt(100000),
    chain: walletClient.chain ?? undefined,
  })
  return { txHash: hash }
}
