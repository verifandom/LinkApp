import { createPublicClient, createWalletClient, custom, http, type Address, type Hash } from 'viem'
import { baseSepolia } from 'viem/chains'
import LinkABI from '../Link.json'

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
})

export const getWalletClient = () => {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return createWalletClient({
      chain: baseSepolia,
      transport: custom((window as any).ethereum)
    })
  }
  return null
}

export const linkContract = {
  address: process.env.NEXT_PUBLIC_LINK_CONTRACT_ADDRESS as Address,
  abi: LinkABI.abi,
} as const

export type LinkContract = typeof linkContract

export const linkContractRead = {
  ...linkContract,
  publicClient,
}

export const readContract = async <T = any>(
  functionName: string,
  args?: readonly unknown[]
): Promise<T> => {
  return publicClient.readContract({
    ...linkContract,
    functionName,
    args,
  }) as T
}

export const writeContract = async (
  functionName: string,
  args?: readonly unknown[]
): Promise<Hash> => {
  const walletClient = getWalletClient()
  if (!walletClient) {
    throw new Error('Wallet not connected')
  }

  const { request } = await publicClient.simulateContract({
    ...linkContract,
    functionName,
    args,
    account: (await walletClient.getAddresses())[0],
  })

  return walletClient.writeContract(request)
}

export const linkUtils = {
  async getClaimPeriods(channelId: string) {
    return readContract<bigint[]>('getClaimPeriods', [channelId])
  },

  async getClaimPeriod(claimPeriodId: bigint) {
    return readContract<{
      channelId: string
      start: bigint
      end: bigint
      open: boolean
    }>('claimPeriods', [claimPeriodId])
  },

  async getSubscriberCount(claimPeriodId: bigint) {
    return readContract<bigint>('getSubscriberCount', [claimPeriodId])
  },

  async getSubscribers(claimPeriodId: bigint) {
    return readContract<Address[]>('getSubscribers', [claimPeriodId])
  },

  async getCreator(channelId: string) {
    return readContract<{
      owner: Address
      channelId: string
      token: Address
      registered: boolean
    }>('creators', [channelId])
  },

  async hasRegistered(claimPeriodId: bigint, address: Address) {
    return readContract<boolean>('hasRegistered', [claimPeriodId, address])
  },

  async getNextClaimPeriodId() {
    return readContract<bigint>('nextClaimPeriodId')
  },

  async registerCreator(
    channelId: string,
    token: Address,
    proof: any
  ) {
    return writeContract('registerCreator', [channelId, token, proof])
  },

  async openClaimPeriod(
    channelId: string,
    start: bigint,
    end: bigint
  ) {
    return writeContract('openClaimPeriod', [channelId, start, end])
  },

  async registerAsSubscriber(
    claimPeriodId: bigint,
    proof: any
  ) {
    return writeContract('registerAsSubscriber', [claimPeriodId, proof])
  },

  async closeClaimPeriod(claimPeriodId: bigint) {
    return writeContract('closeClaimPeriod', [claimPeriodId])
  },

  async airdrop(claimPeriodId: bigint, amount: bigint) {
    return writeContract('airdrop', [claimPeriodId, amount])
  },
}