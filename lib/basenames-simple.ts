import { createPublicClient, http, type Address } from 'viem'
import { base } from 'viem/chains'

// Public client for Base mainnet (where Basenames are deployed)
export const baseClient = createPublicClient({
  chain: base,
  transport: http()
})

// Basename suffix
const BASENAME_SUFFIX = '.base.eth'

/**
 * Simple basename resolution using OnchainKit's approach
 * For a real implementation, you'd use OnchainKit's built-in functions
 */
export async function resolveBasename(basename: string): Promise<Address | null> {
  try {
    // This is a simplified implementation
    // In a real app, you'd use OnchainKit's getName function
    // For now, just simulate successful resolution for demo
    const fullBasename = basename.endsWith(BASENAME_SUFFIX) ? basename : `${basename}${BASENAME_SUFFIX}`
    
    // Simulate some real basenames for demo
    const mockBasenames: Record<string, Address> = {
      'vitalik.base.eth': '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      'jessepollak.base.eth': '0x849151d7D0bF1F34b70d5caD4B6Ba0a65C1B6092',
      'base.base.eth': '0x4f7a67464b5976d7547c860109e4432d50afb38e',
    }
    
    return mockBasenames[fullBasename.toLowerCase()] || null
  } catch (error) {
    console.error('Error resolving basename:', error)
    return null
  }
}

/**
 * Reverse resolve an address to get its basename
 */
export async function reverseResolveBasename(address: Address): Promise<string | null> {
  try {
    // This is a simplified implementation
    // In a real app, you'd use OnchainKit's getAddress function
    
    // Simulate some reverse resolutions for demo
    const mockReverseBasenames: Record<string, string> = {
      '0xd8da6bf26964af9d7eed9e03e53415d37aa96045': 'vitalik.base.eth',
      '0x849151d7d0bf1f34b70d5cad4b6ba0a65c1b6092': 'jessepollak.base.eth',
      '0x4f7a67464b5976d7547c860109e4432d50afb38e': 'base.base.eth',
    }
    
    return mockReverseBasenames[address.toLowerCase()] || null
  } catch (error) {
    console.error('Error reverse resolving basename:', error)
    return null
  }
}

/**
 * Check if a basename is available
 */
export async function isBasenameAvailable(basename: string): Promise<boolean> {
  try {
    const address = await resolveBasename(basename)
    return address === null
  } catch (error) {
    console.error('Error checking basename availability:', error)
    return false
  }
}

/**
 * Get basename metadata (mock implementation)
 */
export async function getBasenameMetadata(basename: string): Promise<{
  avatar?: string
  description?: string
  email?: string
  url?: string
} | null> {
  try {
    // Mock metadata for demo purposes
    const mockMetadata: Record<string, any> = {
      'vitalik.base.eth': {
        avatar: 'https://ipfs.io/ipfs/QmSP4nq9fnN9dAiCj42ug9Wa79rqmQerZXZch82VqpiH7U',
        description: 'Ethereum co-founder',
        url: 'https://vitalik.ca'
      },
      'jessepollak.base.eth': {
        avatar: 'https://pbs.twimg.com/profile_images/1593304942210478080/TUYae5z7_400x400.jpg',
        description: 'Head of Protocol at Base',
        url: 'https://base.org'
      },
      'base.base.eth': {
        avatar: 'https://base.org/icons/icon-512x512.png',
        description: 'Official Base Protocol',
        url: 'https://base.org'
      }
    }
    
    const fullBasename = basename.endsWith(BASENAME_SUFFIX) ? basename : `${basename}${BASENAME_SUFFIX}`
    return mockMetadata[fullBasename.toLowerCase()] || {}
  } catch (error) {
    console.error('Error getting basename metadata:', error)
    return null
  }
}