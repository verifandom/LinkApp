'use client';

import { HalftoneCloud } from './components/HalftoneCloud';
import { LiquidGlassOverlay } from './components/LiquidGlassOverlay';
import { useEffect, useState } from 'react';
import sdk from '@farcaster/miniapp-sdk';
import { 
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownLink,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity';

export default function Home() {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function initializeMiniApp() {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(inMiniApp);
        
        if (inMiniApp) {
          await sdk.actions.ready();
          const context = await sdk.context;
          setUser(context?.user);
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
      <LiquidGlassOverlay />
      
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-4">
        <div className="flex justify-end">
          <Wallet>
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2">
                <Avatar />
                <Name />
                <Address />
                <EthBalance />
              </Identity>
              <WalletDropdownLink
                icon="wallet"
                href="https://keys.coinbase.com"
                target="_blank"
              >
                Wallet
              </WalletDropdownLink>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>
      </div>
    </div>
  );
}
