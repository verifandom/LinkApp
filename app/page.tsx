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
        } else {
          // Desktop browser: auto-connect to injected wallet if available
          console.log('Desktop browser detected');
          console.log('Available connectors:', connectors.map(c => ({ id: c.id, name: c.name })));

          if (!isConnected && connectors.length > 0) {
            // Try to connect to injected wallet (MetaMask, Coinbase, etc.)
            const injectedConnector = connectors.find(c => c.id === 'injected' || c.id === 'io.metamask');
            if (injectedConnector) {
              console.log('Attempting to connect to injected wallet:', injectedConnector.name);
              connect({ connector: injectedConnector });
            } else {
              console.log('No injected wallet found. Install MetaMask or Coinbase Wallet.');
            }
          }
        }
      } catch (error) {
        console.log('Not in mini app context:', error);
        // Still try to connect in desktop browser
        if (!isConnected && connectors.length > 0) {
          const injectedConnector = connectors.find(c => c.id === 'injected');
          if (injectedConnector) {
            console.log('Fallback: connecting to injected wallet');
            connect({ connector: injectedConnector });
          }
        }
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

      {/* Debug Panel - Only show when not connected */}
      {!isConnected && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-lg bg-black/80 backdrop-blur-md border border-white/20 max-w-sm">
          <h3 className="text-white text-sm font-bold mb-2">Wallet Connection</h3>
          <p className="text-white/60 text-xs mb-3">
            {connectors.length > 0
              ? 'Click a connector to connect:'
              : 'No wallet connectors available'}
          </p>
          <div className="space-y-2">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => {
                  console.log('Manually connecting to:', connector.name);
                  connect({ connector });
                }}
                className="w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-all"
              >
                Connect {connector.name}
              </button>
            ))}
          </div>
          <p className="text-white/40 text-xs mt-3">
            Make sure you have MetaMask or Coinbase Wallet installed
          </p>
        </div>
      )}
    </div>
  );
}
