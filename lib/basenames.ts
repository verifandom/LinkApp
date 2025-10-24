import { getName, getAddress } from '@coinbase/onchainkit/identity'
import { base } from 'viem/chains'
import { type Address } from 'viem'

// Basename suffix
const BASENAME_SUFFIX = '.base.eth'

/**
 * Resolve a basename to an address using OnchainKit
 */
export async function resolveBasename(basename: string): Promise<Address | null> {
  try {
    // Ensure the basename ends with .base.eth
    const fullBasename = basename.endsWith(BASENAME_SUFFIX) ? basename : `${basename}${BASENAME_SUFFIX}`
    
    // Use OnchainKit's getAddress function
    const address = await getAddress({ name: fullBasename, chain: base })
    
    return address || null
  } catch (error) {
    console.error('Error resolving basename:', error)
    return null
  }
}

/**
 * Reverse resolve an address to get its basename using OnchainKit
 */
export async function reverseResolveBasename(address: Address): Promise<string | null> {
  try {
    // Use OnchainKit's getName function
    const basename = await getName({ address, chain: base })
    
    // Only return if it's a .base.eth name
    if (basename && basename.endsWith('.base.eth')) {
      return basename
    }

    return null
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
 * Get basename metadata using OnchainKit
 * This is a simplified implementation - OnchainKit provides more comprehensive metadata
 */
export async function getBasenameMetadata(basename: string): Promise<{
  avatar?: string
  description?: string
  email?: string
  url?: string
} | null> {
  try {
    const fullBasename = basename.endsWith(BASENAME_SUFFIX) ? basename : `${basename}${BASENAME_SUFFIX}`
    
    // OnchainKit doesn't directly expose text record fetching in the public API
    // For now, we'll return basic metadata structure
    // In a production app, you might want to use additional ENS libraries or custom contract calls
    
    return {
      // Placeholder - would need custom implementation for text records
      avatar: undefined,
      description: undefined,
      email: undefined,
      url: undefined,
    }
  } catch (error) {
    console.error('Error getting basename metadata:', error)
    return null
  }
}