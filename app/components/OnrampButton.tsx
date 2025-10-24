'use client';

import { useEffect, useState } from 'react';
import { initOnRamp } from '@coinbase/cbpay-js';
import { Button } from './ui/button';

interface OnrampButtonProps {
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function OnrampButton({ className, variant = 'default', size = 'default' }: OnrampButtonProps) {
  const [onrampInstance, setOnrampInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeOnramp = async () => {
      try {
        setError(null);
        
        // For demo purposes, show a mock implementation since we don't have onramp permissions
        console.log('Onramp feature available but not fully configured');
        setOnrampInstance({ 
          open: () => {
            alert('🚀 Onramp Demo\n\nThis would open Coinbase onramp to purchase crypto.\n\nTo enable real functionality:\n1. Get onramp permissions in CDP portal\n2. Configure proper API credentials');
          }
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing onramp:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize');
        setIsLoading(false);
      }
    };

    initializeOnramp();

    return () => {
      if (onrampInstance) {
        onrampInstance.destroy?.();
      }
    };
  }, []);

  const handleOnrampClick = () => {
    if (onrampInstance) {
      onrampInstance.open();
    }
  };

  const getButtonText = () => {
    if (isLoading) return 'Loading...';
    if (error) return 'Service Unavailable';
    return 'Buy Crypto (Demo)';
  };

  return (
    <Button
      onClick={handleOnrampClick}
      disabled={isLoading || !onrampInstance || !!error}
      variant={variant}
      size={size}
      className={className}
      title={error || undefined}
    >
      {getButtonText()}
    </Button>
  );
}