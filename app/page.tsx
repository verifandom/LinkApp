'use client';

import { HalftoneCloud } from './components/HalftoneCloud';
import { LiquidGlassOverlay } from './components/LiquidGlassOverlay';
import { OnrampButton } from './components/OnrampButton';
import { useEffect, useState } from 'react';
import sdk from '@farcaster/miniapp-sdk';

export default function Home() {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function checkMiniAppContext() {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(inMiniApp);
        
        if (inMiniApp) {
          const context = await sdk.context;
          setUser(context?.user);
        }
      } catch (error) {
        console.log('Not in mini app context');
      }
    }
    
    checkMiniAppContext();
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      <HalftoneCloud />
      <LiquidGlassOverlay />
      
      {isInMiniApp && (
        <div className="absolute top-4 right-4 z-50 text-white bg-black/50 backdrop-blur-sm rounded-lg p-3">
          <div className="text-sm">
            {user ? (
              <div>
                <p>Welcome, {user.displayName || 'User'}!</p>
                <p className="text-xs opacity-75">FID: {user.fid}</p>
              </div>
            ) : (
              <p>Mini App Ready</p>
            )}
          </div>
        </div>
      )}
      
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <OnrampButton 
          variant="outline" 
          size="lg"
          className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
        />
      </div>
    </div>
  );
}
