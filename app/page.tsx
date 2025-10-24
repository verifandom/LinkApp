'use client';

import { HalftoneCloud } from './components/HalftoneCloud';
import { LiquidGlassOverlay } from './components/LiquidGlassOverlay';
import { useEffect, useState } from 'react';
import { useAccount, useConnect } from 'wagmi';
import sdk from '@farcaster/miniapp-sdk';

export default function Home() {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  useEffect(() => {
    async function initializeMiniApp() {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(inMiniApp);

        if (inMiniApp) {
          await sdk.actions.ready();

          // Auto-connect to Farcaster wallet (first connector)
          if (!isConnected && connectors.length > 0) {
            const farcasterConnector = connectors.find(c => c.id === 'farcasterMiniApp');
            if (farcasterConnector) {
              connect({ connector: farcasterConnector });
            }
          }
        }
      } catch (error) {
        console.log('Not in mini app context:', error);
      }
    }

    initializeMiniApp();
  }, [isConnected, connectors, connect]);

  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      <HalftoneCloud />
      <LiquidGlassOverlay
        farcasterWalletAddress={address || null}
        isInMiniApp={isInMiniApp}
      />
    </div>
  );
}
