import { createConfig, http } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'
import { coinbaseWallet, injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    farcasterMiniApp(), // For Farcaster mini app
    injected(), // For browser extension wallets (MetaMask, etc.)
    coinbaseWallet({ appName: 'Link' }), // For Coinbase Wallet
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
})