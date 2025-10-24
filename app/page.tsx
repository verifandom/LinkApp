'use client';

import { HalftoneCloud } from './components/HalftoneCloud';
import { LiquidGlassOverlay } from './components/LiquidGlassOverlay';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import sdk from '@farcaster/miniapp-sdk';

export default function Home() {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const { address } = useAccount();

  useEffect(() => {
    async function initializeMiniApp() {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(inMiniApp);

        if (inMiniApp) {
          await sdk.actions.ready();
        }
      } catch (error) {
        console.log('Not in mini app context');
      }
    }

    initializeMiniApp();
  }, []);

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
