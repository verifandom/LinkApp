import { createPublicClient, http, type Address, keccak256, toHex, stringToBytes } from 'viem'
import { base, baseSepolia } from 'viem/chains'

// Public client for Base mainnet (where Basenames are deployed)
export const baseClient = createPublicClient({
  chain: base,
  transport: http()
})

// ENS L2 Resolver address on Base mainnet for Basenames
const ENS_L2_RESOLVER_ADDRESS = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD' as Address

// Base Name Wrapper address
const BASE_NAME_WRAPPER_ADDRESS = '0x4F7A67464B5976d7547c860109e4432d50AfB38e' as Address

// Basename suffix
const BASENAME_SUFFIX = '.base.eth'

/**
 * Resolve a basename to an address using ENS resolver
 */
export async function resolveBasename(basename: string): Promise<Address | null> {
  try {
    // Ensure the basename ends with .base.eth
    const fullBasename = basename.endsWith(BASENAME_SUFFIX) ? basename : `${basename}${BASENAME_SUFFIX}`
    
    // Use ENS resolution via the L2 resolver
    const result = await baseClient.readContract({
      address: ENS_L2_RESOLVER_ADDRESS,
      abi: [
        {
          inputs: [{ name: 'name', type: 'bytes32' }],
          name: 'addr',
          outputs: [{ name: '', type: 'address' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'addr',
      args: [namehash(fullBasename)],
    })

    return result as Address
  } catch (error) {
    console.error('Error resolving basename:', error)
    return null
  }
}

/**
 * Generate ENS namehash for a domain
 */
function namehash(name: string): `0x${string}` {
  if (!name) return '0x0000000000000000000000000000000000000000000000000000000000000000'
  
  const labels = name.split('.')
  let hash = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
  
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = keccak256(stringToBytes(labels[i]))
    hash = keccak256(`${hash}${labelHash.slice(2)}` as `0x${string}`)
  }
  
  return hash
}

/**
 * Reverse resolve an address to get its basename
 */
export async function reverseResolveBasename(address: Address): Promise<string | null> {
  try {
    // Construct reverse ENS name: address.addr.reverse
    const reverseNode = `${address.slice(2).toLowerCase()}.addr.reverse`
    const reverseHash = namehash(reverseNode)
    
    // Get the reverse record name
    const result = await baseClient.readContract({
      address: ENS_L2_RESOLVER_ADDRESS,
      abi: [
        {
          inputs: [{ name: 'node', type: 'bytes32' }],
          name: 'name',
          outputs: [{ name: '', type: 'string' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'name',
      args: [reverseHash],
    })

    const basename = result as string
    
    // Only return if it's a .base.eth name
    if (basename && basename.endsWith('.base.eth')) {
      // Verify the basename resolves back to the same address
      const resolvedAddress = await resolveBasename(basename)
      if (resolvedAddress?.toLowerCase() === address.toLowerCase()) {
        return basename
      }
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
    return address === null || address === '0x0000000000000000000000000000000000000000'
  } catch (error) {
    console.error('Error checking basename availability:', error)
    return false
  }
}

/**
 * Get basename metadata (if available)
 */
export async function getBasenameMetadata(basename: string): Promise<{
  avatar?: string
  description?: string
  email?: string
  url?: string
} | null> {
  try {
    const fullBasename = basename.endsWith(BASENAME_SUFFIX) ? basename : `${basename}${BASENAME_SUFFIX}`
    const nodeHash = namehash(fullBasename)
    
    // Get text records using ENS text resolver
    const [avatar, description, email, url] = await Promise.all([
      baseClient.readContract({
        address: ENS_L2_RESOLVER_ADDRESS,
        abi: [
          {
            inputs: [{ name: 'node', type: 'bytes32' }, { name: 'key', type: 'string' }],
            name: 'text',
            outputs: [{ name: '', type: 'string' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'text',
        args: [nodeHash, 'avatar'],
      }).catch(() => ''),
      baseClient.readContract({
        address: ENS_L2_RESOLVER_ADDRESS,
        abi: [
          {
            inputs: [{ name: 'node', type: 'bytes32' }, { name: 'key', type: 'string' }],
            name: 'text',
            outputs: [{ name: '', type: 'string' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'text',
        args: [nodeHash, 'description'],
      }).catch(() => ''),
      baseClient.readContract({
        address: ENS_L2_RESOLVER_ADDRESS,
        abi: [
          {
            inputs: [{ name: 'node', type: 'bytes32' }, { name: 'key', type: 'string' }],
            name: 'text',
            outputs: [{ name: '', type: 'string' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'text',
        args: [nodeHash, 'email'],
      }).catch(() => ''),
      baseClient.readContract({
        address: ENS_L2_RESOLVER_ADDRESS,
        abi: [
          {
            inputs: [{ name: 'node', type: 'bytes32' }, { name: 'key', type: 'string' }],
            name: 'text',
            outputs: [{ name: '', type: 'string' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'text',
        args: [nodeHash, 'url'],
      }).catch(() => ''),
    ])

    return {
      avatar: avatar as string || undefined,
      description: description as string || undefined,
      email: email as string || undefined,
      url: url as string || undefined,
    }
  } catch (error) {
    console.error('Error getting basename metadata:', error)
    return null
  }
}