'use client'

import { useState, useEffect } from 'react'
import { type Address } from 'viem'
import { reverseResolveBasename, getBasenameMetadata } from '@/lib/basenames'

interface BasenameData {
  basename: string | null
  avatar?: string
  description?: string
  email?: string
  url?: string
  isLoading: boolean
  error: string | null
}

/**
 * Hook to get basename data for a connected wallet address
 */
export function useBasename(address: Address | null): BasenameData {
  const [basename, setBasename] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<{
    avatar?: string
    description?: string
    email?: string
    url?: string
  }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address) {
      setBasename(null)
      setMetadata({})
      setIsLoading(false)
      setError(null)
      return
    }

    async function fetchBasename() {
      if (!address) return; // TypeScript guard
      
      setIsLoading(true)
      setError(null)

      try {
        // Get the basename for this address
        const resolvedBasename = await reverseResolveBasename(address)
        setBasename(resolvedBasename)

        // If we have a basename, get its metadata
        if (resolvedBasename) {
          const meta = await getBasenameMetadata(resolvedBasename)
          setMetadata(meta || {})
        } else {
          setMetadata({})
        }
      } catch (err) {
        console.error('Error fetching basename:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch basename')
        setBasename(null)
        setMetadata({})
      } finally {
        setIsLoading(false)
      }
    }

    fetchBasename()
  }, [address])

  return {
    basename,
    ...metadata,
    isLoading,
    error,
  }
}

/**
 * Hook to search for basenames
 */
export function useBasenameSearch() {
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const searchBasename = async (query: string): Promise<{
    basename: string
    address: Address | null
    avatar?: string
    description?: string
  } | null> => {
    setIsSearching(true)
    setSearchError(null)

    try {
      const { resolveBasename, getBasenameMetadata } = await import('@/lib/basenames')
      
      // Clean the query
      const cleanQuery = query.trim().toLowerCase()
      if (!cleanQuery) return null

      // Try to resolve the basename
      const address = await resolveBasename(cleanQuery)
      
      if (!address) {
        return null
      }

      // Get metadata
      const metadata = await getBasenameMetadata(cleanQuery)

      return {
        basename: cleanQuery.endsWith('.base.eth') ? cleanQuery : `${cleanQuery}.base.eth`,
        address,
        avatar: metadata?.avatar,
        description: metadata?.description,
      }
    } catch (err) {
      console.error('Error searching basename:', err)
      setSearchError(err instanceof Error ? err.message : 'Search failed')
      return null
    } finally {
      setIsSearching(false)
    }
  }

  return {
    searchBasename,
    isSearching,
    searchError,
  }
}