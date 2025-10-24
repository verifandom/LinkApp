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

  useEffect(() => {
    const initializeOnramp = async () => {
      try {
        const options = {
          appId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID || 'your-project-id-here',
          widgetParameters: {
            addresses: { 
              '0x0000000000000000000000000000000000000000': ['ethereum', 'base'],
            },
            assets: ['ETH', 'USDC', 'USDT'],
          },
          onSuccess: () => {
            console.log('Onramp transaction successful');
          },
          onExit: () => {
            console.log('User exited onramp');
          },
          onEvent: (event: any) => {
            console.log('Onramp event:', event);
          },
          experienceLoggedIn: 'popup' as const,
          experienceLoggedOut: 'popup' as const,
          closeOnExit: true,
          closeOnSuccess: true,
        };

        initOnRamp(options, (error: any, instance: any) => {
          if (error) {
            console.error('Failed to initialize onramp:', error);
          } else {
            setOnrampInstance(instance);
          }
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Error initializing onramp:', error);
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

  return (
    <Button
      onClick={handleOnrampClick}
      disabled={isLoading || !onrampInstance}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? 'Loading...' : 'Buy Crypto'}
    </Button>
  );
}