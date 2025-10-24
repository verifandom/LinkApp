'use client'

import { type Address } from 'viem'
import { useBasename } from '@/hooks/useBasename'
import { Avatar } from './ui/avatar'
import { Badge } from './ui/badge'
import { Skeleton } from './ui/skeleton'
import { ExternalLink, User } from 'lucide-react'

interface BasenameDisplayProps {
  address: Address | null
  showFull?: boolean
  className?: string
}

export function BasenameDisplay({ address, showFull = false, className = '' }: BasenameDisplayProps) {
  const { basename, avatar, description, url, isLoading, error } = useBasename(address)

  if (!address) {
    return null
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
    )
  }

  if (error || !basename) {
    return (
      <div className={`flex items-center gap-2 text-white/60 ${className}`}>
        <User className="h-4 w-4" />
        <span className="text-sm font-mono">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {avatar ? (
        <img 
          src={avatar} 
          alt={`${basename} avatar`}
          className="h-6 w-6 rounded-full object-cover"
        />
      ) : (
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {basename.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            {basename}
          </span>
          <Badge 
            variant="outline" 
            className="text-xs bg-blue-500/20 border-blue-500/30 text-blue-300"
          >
            Base
          </Badge>
        </div>
        
        {showFull && description && (
          <p className="text-xs text-white/60 mt-1 max-w-[200px] truncate">
            {description}
          </p>
        )}
        
        {showFull && url && (
          <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200 mt-1"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Website</span>
          </a>
        )}
      </div>
    </div>
  )
}

interface BasenameSearchDisplayProps {
  basename: string
  address: Address
  avatar?: string
  description?: string
  onClick?: () => void
  className?: string
}

export function BasenameSearchDisplay({ 
  basename, 
  address, 
  avatar, 
  description, 
  onClick,
  className = '' 
}: BasenameSearchDisplayProps) {
  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer ${className}`}
      onClick={onClick}
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {avatar ? (
        <img 
          src={avatar} 
          alt={`${basename} avatar`}
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
          <span className="text-white text-sm font-bold">
            {basename.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium truncate">
            {basename}
          </span>
          <Badge 
            variant="outline" 
            className="text-xs bg-blue-500/20 border-blue-500/30 text-blue-300 flex-shrink-0"
          >
            Base
          </Badge>
        </div>
        
        {description && (
          <p className="text-xs text-white/60 mt-1 truncate">
            {description}
          </p>
        )}
        
        <p className="text-xs text-white/40 mt-1 font-mono">
          {address.slice(0, 8)}...{address.slice(-6)}
        </p>
      </div>
    </div>
  )
}