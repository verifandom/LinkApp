'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Users,
  Search,
  Plus,
  DollarSign,
  ChevronLeft,
  Check,
  Clock,
  XCircle,
  Wallet,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { linkUtils } from '@/lib/contract';
import { useBasename, useBasenameSearch } from '@/hooks/useBasename';
import {
  useCreators,
  useClaimPeriods,
  useSubscriberAirdrops,
  type Creator as DBCreator,
  type ClaimPeriod as DBClaimPeriod,
  type SubscriberAirdrop,
} from '@/hooks/useDatabase';
import { BasenameDisplay, BasenameSearchDisplay } from './BasenameDisplay';
import { OnrampButton } from './OnrampButton';
import type { Address } from 'viem';
import { useBalance } from 'wagmi';
import { base } from 'wagmi/chains';

type UserType = 'creator' | 'fan';
type ViewType = 'dashboard' | 'creatorProfile' | 'onramp' | 'airdrop';

// Local types for component state
interface ClaimPeriod {
  id: number;
  creatorName: string;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  proofsCount: number;
  channelId: string;
}

interface ZKProof {
  id: string;
  fanAddress: string;
  creatorId: string;
  claimPeriodId: string;
  proofData: string;
  submittedAt: Date;
  status: 'pending' | 'verified' | 'rejected';
}

interface Creator {
  id: number;
  name: string;
  points: string;
  hasActiveClaimPeriod: boolean;
  connectedSocials: string[];
}

interface LiquidGlassOverlayProps {
  farcasterWalletAddress: Address | null;
  isInMiniApp: boolean;
}

export function LiquidGlassOverlay({
  farcasterWalletAddress,
  isInMiniApp,
}: LiquidGlassOverlayProps) {
  const [userType, setUserType] = useState<UserType>('creator');
  const [showLabel, setShowLabel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState({
    youtube: false,
    instagram: false,
    twitter: false,
  });

  // New state for the flow
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [claimPeriods, setClaimPeriods] = useState<ClaimPeriod[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [balance, setBalance] = useState(0);
  const [proofText, setProofText] = useState('');
  const [submittedProofs, setSubmittedProofs] = useState<ZKProof[]>([]);
  const [selectedClaimPeriodForAirdrop, setSelectedClaimPeriodForAirdrop] =
    useState<ClaimPeriod | null>(null);
  const [airdropAmount, setAirdropAmount] = useState('');

  // Use Farcaster wallet address instead of manual connection
  const walletAddress = farcasterWalletAddress;
  const [contractLoading, setContractLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [ethPriceUSD, setEthPriceUSD] = useState<number>(0);
  const [youtubeChannelId, setYoutubeChannelId] = useState<string>('');
  const [tokenContractAddress, setTokenContractAddress] = useState<string>('');

  // Use wagmi hook to get balance
  const { data: balanceData } = useBalance({
    address: walletAddress || undefined,
    chainId: base.id,
  });

  const ethBalance = balanceData ? parseFloat(balanceData.formatted).toFixed(6) : '0.000000';

  // Basename state
  const [basenameQuery, setBasenameQuery] = useState('');
  const [basenameResults, setBasenameResults] = useState<any[]>([]);

  // Basename hooks
  const { basename: connectedBasename } = useBasename(walletAddress);
  const { searchBasename, isSearching } = useBasenameSearch();

  // Database hooks
  const { data: dbCreators, isLoading: creatorsLoading } = useCreators();
  const { data: dbClaimPeriods, isLoading: periodsLoading } = useClaimPeriods();
  const { data: myAirdrops, isLoading: airdropsLoading } =
    useSubscriberAirdrops(walletAddress);

  // Transform database creators to component format
  const creators: Creator[] = (dbCreators || []).map((creator) => ({
    id: creator.id,
    name: creator.channelName,
    points: '0', // We could calculate this from claim periods
    hasActiveClaimPeriod: (dbClaimPeriods || []).some(
      (p) => p.creatorId === creator.id && p.isOpen
    ),
    connectedSocials: ['youtube'], // Default, could be enhanced
  }));

  // Transform database claim periods to component format
  const transformedClaimPeriods: ClaimPeriod[] = (dbClaimPeriods || []).map(
    (period) => ({
      id: period.id,
      creatorName: period.creator?.channelName || 'Unknown',
      startDate: new Date(parseInt(period.startTime.toString()) * 1000),
      endDate: period.isOpen
        ? null
        : new Date(parseInt(period.endTime.toString()) * 1000),
      isActive: period.isOpen,
      proofsCount: 0, // Would need subscriber count from DB
      channelId: period.channelId,
    })
  );

  useEffect(() => {
    setMounted(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Function to start polling for OAuth completion
  const startOAuthPolling = useCallback((sessionId: string) => {
    console.log('Starting OAuth polling for session:', sessionId);
    setMessage('Checking for YouTube connection...');

    const pollInterval = setInterval(async () => {
      try {
        console.log('Polling OAuth session...');
        const response = await fetch(`/api/oauth/poll?sessionId=${sessionId}`);
        const data = await response.json();
        console.log('Poll response:', data);

        if (data.success) {
          // OAuth completed! Generate Reclaim proof
          console.log('OAuth successful, generating proof...');
          clearInterval(pollInterval);
          sessionStorage.removeItem('youtube-oauth-session');
          setMessage('Generating Reclaim proof...');

          const proofResponse = await fetch('/api/reclaim/generate-creator-proof', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accessToken: data.accessToken,
              channelId: data.channelId,
              channelName: data.channelName,
              // tokenContractAddress can be added later manually
            }),
          });

          const proofData = await proofResponse.json();
          console.log('Reclaim proof response:', proofData);

          if (proofData.success) {
            setConnectedAccounts((prev) => ({ ...prev, youtube: true }));
            sessionStorage.setItem('youtube-connected', 'true');
            sessionStorage.setItem('youtube-channel-id', data.channelId);
            setYoutubeChannelId(data.channelId);
            setMessage('YouTube verified with Reclaim!');
          } else {
            setMessage(`Failed to verify YouTube: ${proofData.error || 'Unknown error'}`);
            console.error('Reclaim proof error:', proofData);
          }

          setTimeout(() => setMessage(''), 5000);
        } else if (data.pending) {
          console.log('OAuth still pending...');
        }
      } catch (error) {
        console.error('OAuth polling error:', error);
        setMessage('Error checking OAuth status');
      }
    }, 5000); // Poll every 5 seconds

    // Stop polling after 5 minutes
    const timeout = setTimeout(() => {
      console.log('OAuth polling timeout');
      clearInterval(pollInterval);
      sessionStorage.removeItem('youtube-oauth-session');
      setMessage('OAuth timeout - please try again');
      setTimeout(() => setMessage(''), 3000);
    }, 300000);

    // Return cleanup function
    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, []);

  // Poll for OAuth result when in mini app (on mount and when returning from OAuth)
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    // Check if YouTube was previously connected
    if (sessionStorage.getItem('youtube-connected') === 'true') {
      setConnectedAccounts((prev) => ({ ...prev, youtube: true }));
      const savedChannelId = sessionStorage.getItem('youtube-channel-id');
      if (savedChannelId) {
        setYoutubeChannelId(savedChannelId);
      }
      return;
    }

    // Check if we're waiting for OAuth to complete
    const sessionId = sessionStorage.getItem('youtube-oauth-session');
    if (!sessionId) return;

    // Start polling
    const cleanup = startOAuthPolling(sessionId);
    return cleanup;
  }, [mounted, startOAuthPolling]);

  // Fetch ETH price
  useEffect(() => {
    async function fetchEthPrice() {
      try {
        // Fetch ETH price from CoinGecko
        const priceResponse = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
        );
        const priceData = await priceResponse.json();

        if (priceData.ethereum?.usd) {
          setEthPriceUSD(priceData.ethereum.usd);
        }
      } catch (error) {
        console.error('Error fetching ETH price:', error);
        // Fallback price if API fails
        setEthPriceUSD(3000);
      }
    }

    fetchEthPrice();
    // Refresh every 60 seconds
    const interval = setInterval(fetchEthPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  // Contract functions
  const checkAndRegisterCreator = async (
    channelId: string,
    tokenAddress: string = '0x0000000000000000000000000000000000000000'
  ) => {
    if (!walletAddress) {
      setMessage('Please connect your wallet first');
      return false;
    }

    try {
      // Check if creator is already registered
      const creator = await linkUtils.getCreator(channelId);
      if (creator.registered) {
        return true;
      }

      // If not registered, register first
      setMessage('Fetching Reclaim proof...');

      // Fetch the real Reclaim proof from database using channelId
      const creatorResponse = await fetch(`/api/creator/${channelId}`);
      if (!creatorResponse.ok) {
        throw new Error('Creator not found. Please connect YouTube first.');
      }

      const creatorData = await creatorResponse.json();
      if (!creatorData.reclaimProof) {
        throw new Error('No Reclaim proof found. Please reconnect YouTube.');
      }

      const reclaimProof = JSON.parse(creatorData.reclaimProof);
      setMessage('Registering as creator...');

      const registerHash = await linkUtils.registerCreator(
        channelId,
        tokenAddress as `0x${string}`,
        reclaimProof
      );
      setMessage('Creator registered successfully!');
      console.log('Registration hash:', registerHash);
      return true;
    } catch (error) {
      console.error('Error registering creator:', error);
      setMessage(
        'Failed to register creator - you may need a valid Reclaim proof'
      );
      return false;
    }
  };

  const createClaimPeriod = async (channelId: string) => {
    if (!walletAddress) {
      setMessage('Please connect your wallet first');
      return;
    }

    try {
      setContractLoading(true);
      setMessage('Checking creator registration...');

      // Use the token contract address from state, or zero address if not set
      const tokenAddr = tokenContractAddress || '0x0000000000000000000000000000000000000000';

      // Check/register creator first
      const isRegistered = await checkAndRegisterCreator(channelId, tokenAddr);
      if (!isRegistered) {
        return;
      }

      setMessage('Creating claim period...');

      const now = Math.floor(Date.now() / 1000);
      const endTime = now + 7 * 24 * 60 * 60; // 7 days from now

      const hash = await linkUtils.openClaimPeriod(
        channelId,
        BigInt(now),
        BigInt(endTime)
      );

      console.log('Transaction hash:', hash);
      setMessage('Syncing to database...');

      // Get the claim period ID from on-chain (it's the nextClaimPeriodId - 1)
      const nextId = await linkUtils.getNextClaimPeriodId();
      const claimPeriodId = nextId - BigInt(1);

      // Sync to database
      try {
        const syncResponse = await fetch('/api/db/sync-claim-period', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId,
            claimPeriodId: claimPeriodId.toString(),
            startTime: now.toString(),
            endTime: endTime.toString(),
          }),
        });

        const syncData = await syncResponse.json();
        if (!syncData.success) {
          console.error('Failed to sync claim period to DB:', syncData);
          setMessage('Claim period created but DB sync failed');
        } else {
          setMessage('Claim period created successfully!');
        }
      } catch (syncError) {
        console.error('Error syncing claim period:', syncError);
        setMessage('Claim period created but DB sync failed');
      }
    } catch (error) {
      console.error('Error creating claim period:', error);
      setMessage('Failed to create claim period');
    } finally {
      setContractLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const executeAirdrop = async (claimPeriodId: string, amount: string) => {
    if (!walletAddress) {
      setMessage('Please connect your wallet first');
      return;
    }

    try {
      setContractLoading(true);
      setMessage('Executing airdrop...');

      // Convert amount to wei (assuming amount is in ETH)
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));

      const hash = await linkUtils.airdrop(BigInt(claimPeriodId), amountInWei);

      setMessage('Airdrop executed successfully!');
      console.log('Transaction hash:', hash);

      // Update balance
      setBalance(balance - parseFloat(amount));
    } catch (error) {
      console.error('Error executing airdrop:', error);
      setMessage('Failed to execute airdrop');
    } finally {
      setContractLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Removed liquid glass animation effect

  return (
    <div className='fixed inset-0 flex items-center justify-center pointer-events-none'>
      <div
        className='relative rounded-3xl overflow-hidden pointer-events-auto'
        style={{
          width: isMobile ? 'calc(100% - 32px)' : '600px',
          height: isMobile ? 'calc(100% - 180px)' : 'calc(100vh - 160px)',
          maxWidth: isMobile ? '400px' : '600px',
          maxHeight: isMobile ? 'none' : '800px',
          margin: isMobile ? '16px 16px 100px 16px' : '0',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        }}
      >
        {/* Frosted glass with backdrop blur */}
        <div
          className='absolute inset-0'
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(80px)',
            WebkitBackdropFilter: 'blur(80px)',
          }}
        />

        {/* Subtle noise texture */}
        <div
          className='absolute inset-0 opacity-[0.02]'
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />

        {/* Glass highlights */}
        <div
          className='absolute inset-0'
          style={{
            background:
              'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0) 80%, rgba(255, 255, 255, 0.1) 100%)',
          }}
        />

        {/* Top shimmer */}
        <div
          className='absolute top-0 left-0 right-0 h-px'
          style={{
            background:
              'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 255, 255, 0) 100%)',
          }}
        />

        {/* Main Content */}
        <div className='absolute inset-0 z-10 flex flex-col items-center justify-start py-8 px-12 overflow-y-auto'>
          <div className='w-full max-w-md'>
            {/* Wrapper for centering */}

            {/* Status Message */}
            {message && (
              <div
                className='mb-4 p-3 rounded-xl text-center text-sm'
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <span className='text-white'>{message}</span>
              </div>
            )}
            {userType === 'fan' ? (
              <>
                {currentView === 'dashboard' && (
                  <div className='w-full max-w-md space-y-6'>
                    <h1 className='text-white text-center mb-2 text-[32px] font-[Satoshi] font-bold'>
                      {connectedBasename
                        ? `Hello ${connectedBasename.replace('.base.eth', '')}`
                        : 'Hello Fan!'}
                    </h1>
                    <h2 className='text-white text-center mb-4 text-[25px] px-[-46px] py-[0px] font-[Satoshi] font-bold'>
                      Search for your favorite web2
                    </h2>

                    {/* My Airdrops Section */}
                    {walletAddress && myAirdrops && myAirdrops.length > 0 && (
                      <div
                        className='rounded-2xl p-4'
                        style={{
                          background: 'rgba(34, 197, 94, 0.1)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                        }}
                      >
                        <h3 className='text-white/80 text-sm mb-3 px-2 font-[Satoshi] text-[16px] flex items-center gap-2'>
                          <Check className='h-4 w-4 text-green-400' />
                          My Participating Airdrops ({myAirdrops.length})
                        </h3>
                        <div className='space-y-2'>
                          {myAirdrops.map((airdrop) => (
                            <div
                              key={airdrop.id}
                              className='rounded-xl p-3'
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                              }}
                            >
                              <p className='text-white text-sm font-[Satoshi] font-semibold'>
                                {airdrop.claimPeriod?.creator?.channelName || 'Unknown'}
                              </p>
                              <p className='text-white/60 text-xs mt-1'>
                                {airdrop.claimPeriod?.isOpen
                                  ? 'Active Period'
                                  : 'Period Closed'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Basename Search */}
                    <div className='space-y-4'>
                      <div className='relative'>
                        <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60' />
                        <Input
                          type='text'
                          value={basenameQuery}
                          onChange={(e) => setBasenameQuery(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && basenameQuery.trim()) {
                              const result = await searchBasename(
                                basenameQuery.trim()
                              );
                              if (result) {
                                setBasenameResults([result]);
                              } else {
                                setBasenameResults([]);
                              }
                            }
                          }}
                          placeholder='Search basenames (e.g. vitalik.base.eth)...'
                          className='w-full pl-12 pr-4 py-6 rounded-2xl border-none text-white placeholder:text-white/40'
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(30px)',
                            WebkitBackdropFilter: 'blur(30px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                          }}
                        />
                        {isSearching && (
                          <div className='absolute right-4 top-1/2 -translate-y-1/2'>
                            <div className='animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full' />
                          </div>
                        )}
                      </div>

                      {/* Basename Search Results */}
                      {basenameResults.length > 0 && (
                        <div
                          className='rounded-2xl p-4'
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(30px)',
                            WebkitBackdropFilter: 'blur(30px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <h3 className='text-white/80 text-sm mb-3 px-2 font-[Satoshi] text-[16px]'>
                            Basename Found
                          </h3>
                          <div className='space-y-2'>
                            {basenameResults.map((result, idx) => (
                              <BasenameSearchDisplay
                                key={idx}
                                basename={result.basename}
                                address={result.address}
                                avatar={result.avatar}
                                description={result.description}
                                onClick={() => {
                                  // You could navigate to this user's profile or copy address
                                  navigator.clipboard.writeText(result.address);
                                  setMessage(
                                    `Copied ${result.basename} address!`
                                  );
                                  setTimeout(() => setMessage(''), 2000);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Regular creator search */}
                    <div className='relative'>
                      <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60' />
                      <Input
                        type='text'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder='Search creators...'
                        className='w-full pl-12 pr-4 py-6 rounded-2xl border-none text-white placeholder:text-white/40'
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                      />
                    </div>

                    <div
                      className='rounded-2xl p-4 mt-6'
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <h3 className='text-white/80 text-sm mb-3 px-2 font-[Satoshi] text-[20px]'>
                        Top Creators
                      </h3>
                      <div className='space-y-2'>
                        {creatorsLoading ? (
                          <div className='text-white/60 text-sm text-center py-4'>
                            Loading creators...
                          </div>
                        ) : creators.length === 0 ? (
                          <div className='text-white/60 text-sm text-center py-4'>
                            No creators found
                          </div>
                        ) : (
                          creators
                            .filter(
                              (c) =>
                                searchQuery === '' ||
                                c.name
                                  .toLowerCase()
                                  .includes(searchQuery.toLowerCase())
                            )
                            .map((creator, idx) => (
                              <div
                                key={creator.id}
                                onClick={() => {
                                  setSelectedCreator(creator);
                                  setCurrentView('creatorProfile');
                                }}
                                className='flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer'
                                style={{
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                              >
                                <div className='flex items-center gap-3'>
                                  <span
                                    className='flex items-center justify-center w-6 h-6 rounded-full text-xs'
                                    style={{
                                      background:
                                        idx < 3
                                          ? 'rgba(255, 215, 0, 0.2)'
                                          : 'rgba(255, 255, 255, 0.1)',
                                      color: idx < 3 ? '#ffd700' : '#fff',
                                    }}
                                  >
                                    {idx + 1}
                                  </span>
                                  <span className='text-white text-sm font-[Satoshi]'>
                                    {creator.name}
                                  </span>
                                  {creator.hasActiveClaimPeriod && (
                                    <span className='text-xs text-green-400'>
                                      ● Active
                                    </span>
                                  )}
                                </div>
                                <span className='text-white/60 text-xs'>
                                  {creator.points}
                                </span>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {currentView === 'creatorProfile' && selectedCreator && (
                  <div className='w-full max-w-md space-y-6'>
                    <div className='flex items-center gap-3 mb-4'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => {
                          setCurrentView('dashboard');
                          setSelectedCreator(null);
                          setProofText('');
                        }}
                        className='rounded-full'
                        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                      >
                        <ChevronLeft className='h-5 w-5 text-white' />
                      </Button>
                      <h2 className='text-white text-[25px] font-[Satoshi] font-bold'>
                        {selectedCreator.name}
                      </h2>
                    </div>

                    {selectedCreator.hasActiveClaimPeriod ? (
                      <div
                        className='rounded-2xl p-6'
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <div className='flex items-center gap-2 mb-4'>
                          <Clock className='h-5 w-5 text-green-400' />
                          <h3 className='text-white font-[Satoshi] text-[20px]'>
                            Active Claim Period
                          </h3>
                        </div>

                        <p className='text-white/60 text-sm mb-4'>
                          Submit your zk-TLS proof to participate in this
                          creator's airdrop
                        </p>

                        <Textarea
                          value={proofText}
                          onChange={(e) => setProofText(e.target.value)}
                          placeholder='Paste your zk-TLS proof data here...'
                          className='w-full min-h-[120px] mb-4 rounded-xl border-none text-white placeholder:text-white/40 resize-none'
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(30px)',
                            WebkitBackdropFilter: 'blur(30px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                          }}
                        />

                        <Button
                          onClick={() => {
                            if (proofText.trim()) {
                              const newProof: ZKProof = {
                                id: Date.now().toString(),
                                fanAddress: '0x1234...5678',
                                creatorId: selectedCreator.id.toString(),
                                claimPeriodId: 'active-period',
                                proofData: proofText,
                                submittedAt: new Date(),
                                status: 'pending',
                              };
                              setSubmittedProofs([
                                ...submittedProofs,
                                newProof,
                              ]);
                              setProofText('');
                              alert('Proof submitted successfully!');
                            }
                          }}
                          disabled={!proofText.trim()}
                          className='w-full rounded-xl py-6 transition-all duration-200 hover:scale-105'
                          style={{
                            background: proofText.trim()
                              ? 'rgba(34, 197, 94, 0.2)'
                              : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                          }}
                        >
                          <span className='text-white font-[Satoshi]'>
                            Submit Proof
                          </span>
                        </Button>
                      </div>
                    ) : (
                      <div
                        className='rounded-2xl p-6 text-center'
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <XCircle className='h-12 w-12 text-white/40 mx-auto mb-3' />
                        <p className='text-white/60'>No active claim period</p>
                      </div>
                    )}

                    <div
                      className='rounded-2xl p-6'
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <h3 className='text-white/80 text-sm mb-3 font-[Satoshi] text-[20px]'>
                        Creator Info
                      </h3>
                      <div className='space-y-2'>
                        <div className='flex justify-between'>
                          <span className='text-white/60 text-sm'>Points</span>
                          <span className='text-white text-sm'>
                            {selectedCreator.points}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-white/60 text-sm'>
                            Connected Socials
                          </span>
                          <span className='text-white text-sm'>
                            {selectedCreator.connectedSocials.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {currentView === 'dashboard' && (
                  <div className='w-full max-w-md space-y-6'>
                    <h2 className='text-white text-center mb-4 text-[25px] font-[Satoshi] font-bold'>
                      Creator Dashboard
                    </h2>


                    {/* Balance & Actions */}
                    <div
                      className='rounded-2xl p-6'
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div className='text-center mb-4'>
                        <div className='text-white/60 text-sm mb-2'>
                          Balance (Base)
                        </div>
                        <div className='text-white text-[32px] font-[Satoshi] font-bold'>
                          {mounted && walletAddress
                            ? `$${(parseFloat(ethBalance) * ethPriceUSD).toFixed(2)}`
                            : '$0.00'}
                        </div>
                        <div className='text-white/40 text-xs mt-1'>
                          {mounted && walletAddress ? `${ethBalance} ETH` : '0.000000 ETH'}
                        </div>
                      </div>
                      <Button
                        onClick={() => setCurrentView('onramp')}
                        className='w-full rounded-xl py-6 mb-3 transition-all duration-200 hover:scale-105'
                        style={{
                          background: 'rgba(59, 130, 246, 0.2)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                      >
                        <DollarSign className='h-5 w-5 mr-2 text-blue-400' />
                        <span className='text-white font-[Satoshi]'>
                          Add Funds (Coinbase)
                        </span>
                      </Button>
                    </div>

                    {/* Social Media Connections */}
                    <div
                      className='rounded-2xl p-6'
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <h3 className='text-white/80 text-sm mb-4 font-[Satoshi] text-[20px]'>
                        Connect Your Accounts
                      </h3>

                      <div className='space-y-3'>
                        <button
                          onClick={async () => {
                            if (!walletAddress) {
                              setMessage('Please connect your wallet first');
                              setTimeout(() => setMessage(''), 3000);
                              return;
                            }

                            if (connectedAccounts.youtube) {
                              return;
                            }

                            try {
                              setMessage('Redirecting to YouTube OAuth...');

                              // Get OAuth URL and session ID from backend
                              // /api/auth/youtube generates a unique sessionId and includes it in the OAuth state
                              const authResponse = await fetch('/api/auth/youtube?type=creator');
                              const { authUrl, sessionId } = await authResponse.json();

                              if (!sessionId) {
                                setMessage('Failed to initialize OAuth session');
                                return;
                              }

                              // Store session ID for polling after OAuth completes
                              sessionStorage.setItem('youtube-oauth-session', sessionId);

                              // Detect if mobile: check screen width (more reliable than user agent in Farcaster)
                              const isMobileScreen = window.innerWidth <= 768;

                              // Mobile Farcaster: Use SDK to open external browser
                              if (isInMiniApp && isMobileScreen) {
                                try {
                                  const { default: sdk } = await import('@farcaster/miniapp-sdk');
                                  await sdk.actions.openUrl(authUrl);
                                  setMessage('Complete OAuth in browser, then return to Farcaster');
                                  // Polling will be handled by useEffect when user returns
                                } catch (error) {
                                  console.error('SDK openUrl error:', error);
                                  setMessage('Failed to open browser');
                                }
                              }
                              // Desktop (Farcaster or regular browser): Use popup
                              else if (!isMobileScreen) {
                                const width = 600;
                                const height = 700;
                                const left = window.screen.width / 2 - width / 2;
                                const top = window.screen.height / 2 - height / 2;

                                const authWindow = window.open(
                                  authUrl,
                                  'YouTube OAuth',
                                  `width=${width},height=${height},left=${left},top=${top}`
                                );

                                // If popup failed (blocked), start polling instead
                                if (!authWindow || authWindow.closed) {
                                  setMessage('Popup blocked. Please allow popups and try again.');
                                  sessionStorage.removeItem('youtube-oauth-session');
                                  setTimeout(() => setMessage(''), 3000);
                                  return;
                                }

                                // Listen for postMessage from popup
                                const handleMessage = async (event: MessageEvent) => {
                                  if (event.data.type === 'youtube-auth-success') {
                                    // Close the popup window (since COOP blocks window.close() from within)
                                    try {
                                      authWindow?.close();
                                    } catch (e) {
                                      console.log('Could not close auth window:', e);
                                    }
                                    const { accessToken, channelId, channelName } = event.data;

                                    setMessage('Generating Reclaim proof...');

                                    try {
                                      const proofResponse = await fetch('/api/reclaim/generate-creator-proof', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          accessToken,
                                          channelId,
                                          channelName,
                                          walletAddress,
                                        }),
                                      });

                                      const proofData = await proofResponse.json();

                                      if (proofData.success) {
                                        setConnectedAccounts((prev) => ({ ...prev, youtube: true }));
                                        sessionStorage.setItem('youtube-connected', 'true');
                                        sessionStorage.setItem('youtube-channel-id', channelId);
                                        setYoutubeChannelId(channelId);
                                        sessionStorage.removeItem('youtube-oauth-session');
                                        setMessage('YouTube verified with Reclaim!');
                                      } else {
                                        setMessage(`Failed to verify YouTube: ${proofData.error || 'Unknown error'}`);
                                        console.error('Reclaim proof error:', proofData);
                                      }
                                    } catch (error) {
                                      console.error('Reclaim proof error:', error);
                                      setMessage('Failed to generate proof');
                                    }

                                    setTimeout(() => setMessage(''), 5000);
                                    window.removeEventListener('message', handleMessage);
                                  }
                                };

                                window.addEventListener('message', handleMessage);
                              }
                              // Mobile browser (not Farcaster): Redirect
                              else {
                                window.location.href = authUrl;
                              }
                            } catch (error) {
                              console.error('YouTube OAuth error:', error);
                              setMessage('Failed to initiate OAuth');
                              setTimeout(() => setMessage(''), 3000);
                            }
                          }}
                          disabled={!mounted || contractLoading || !walletAddress}
                          className='w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 hover:scale-105'
                          style={{
                            background: connectedAccounts.youtube
                              ? 'rgba(255, 0, 0, 0.15)'
                              : 'rgba(255, 255, 255, 0.08)',
                            border: connectedAccounts.youtube
                              ? '1px solid rgba(255, 0, 0, 0.3)'
                              : '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <div className='flex items-center gap-3'>
                            <div className='h-5 w-5 flex items-center justify-center'>
                              <svg
                                viewBox='0 0 24 24'
                                fill='currentColor'
                                className='h-5 w-5 text-red-500'
                              >
                                <path d='M23.498 6.186a2.997 2.997 0 0 0-2.11-2.125C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.388.516A2.997 2.997 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a2.997 2.997 0 0 0 2.11 2.125C4.495 20.455 12 20.455 12 20.455s7.505 0 9.388-.516a2.997 2.997 0 0 0 2.11-2.125C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.75 15.568V8.432L15.5 12l-5.75 3.568z' />
                              </svg>
                            </div>
                            <span className='text-white text-sm font-[Satoshi]'>
                              YouTube
                            </span>
                          </div>
                          <span className='text-xs text-white/60'>
                            {connectedAccounts.youtube
                              ? 'Connected'
                              : 'Connect'}
                          </span>
                        </button>

                        <button
                          onClick={() =>
                            setConnectedAccounts((prev) => ({
                              ...prev,
                              instagram: !prev.instagram,
                            }))
                          }
                          className='w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 hover:scale-105'
                          style={{
                            background: connectedAccounts.instagram
                              ? 'rgba(225, 48, 108, 0.15)'
                              : 'rgba(255, 255, 255, 0.08)',
                            border: connectedAccounts.instagram
                              ? '1px solid rgba(225, 48, 108, 0.3)'
                              : '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <div className='flex items-center gap-3'>
                            <div className='h-5 w-5 flex items-center justify-center'>
                              <svg
                                viewBox='0 0 24 24'
                                fill='currentColor'
                                className='h-5 w-5 text-pink-500'
                              >
                                <path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' />
                              </svg>
                            </div>
                            <span className='text-white text-sm font-[Satoshi]'>
                              Instagram
                            </span>
                          </div>
                          <span className='text-xs text-white/60'>
                            {connectedAccounts.instagram
                              ? 'Connected'
                              : 'Connect'}
                          </span>
                        </button>

                        <button
                          onClick={() =>
                            setConnectedAccounts((prev) => ({
                              ...prev,
                              twitter: !prev.twitter,
                            }))
                          }
                          className='w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 hover:scale-105'
                          style={{
                            background: connectedAccounts.twitter
                              ? 'rgba(255, 255, 255, 0.15)'
                              : 'rgba(255, 255, 255, 0.08)',
                            border: connectedAccounts.twitter
                              ? '1px solid rgba(255, 255, 255, 0.3)'
                              : '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <div className='flex items-center gap-3'>
                            <div className='h-5 w-5 flex items-center justify-center'>
                              <svg
                                viewBox='0 0 24 24'
                                fill='currentColor'
                                className='h-4 w-4 text-white'
                              >
                                <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
                              </svg>
                            </div>
                            <span className='text-white text-sm font-[Satoshi]'>
                              X
                            </span>
                          </div>
                          <span className='text-xs text-white/60'>
                            {connectedAccounts.twitter
                              ? 'Connected'
                              : 'Connect'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Token Contract Address (Zora Coin) - Only show when YouTube is connected */}
                    {connectedAccounts.youtube && (
                      <div
                        className='rounded-2xl p-6'
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <h3 className='text-white/80 text-sm mb-4 font-[Satoshi] text-[20px]'>
                          Creator Coin Address
                        </h3>
                        <p className='text-white/60 text-xs mb-4'>
                          Enter the address of your Zora creator coin contract (optional)
                        </p>
                        <Input
                          type='text'
                          value={tokenContractAddress}
                          onChange={(e) => setTokenContractAddress(e.target.value)}
                          placeholder='0x...'
                          className='w-full px-4 py-6 rounded-xl border-none text-white placeholder:text-white/40'
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(30px)',
                            WebkitBackdropFilter: 'blur(30px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                          }}
                        />
                        {tokenContractAddress && !tokenContractAddress.startsWith('0x') && (
                          <p className='text-red-400 text-xs mt-2'>
                            Address must start with 0x
                          </p>
                        )}
                      </div>
                    )}

                    {/* Create Claim Period (only if at least one social is connected) */}
                    {(connectedAccounts.youtube ||
                      connectedAccounts.instagram ||
                      connectedAccounts.twitter) && (
                        <Button
                          onClick={() => {
                            // Use the actual YouTube channel ID
                            if (!youtubeChannelId) {
                              setMessage('Please connect YouTube first');
                              setTimeout(() => setMessage(''), 3000);
                              return;
                            }
                            createClaimPeriod(youtubeChannelId);
                          }}
                          disabled={
                            claimPeriods.some((p) => p.isActive) ||
                            contractLoading ||
                            !walletAddress ||
                            !youtubeChannelId
                          }
                          className='w-full rounded-xl py-6 transition-all duration-200 hover:scale-105'
                          style={{
                            background:
                              claimPeriods.some((p) => p.isActive) ||
                                !walletAddress
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(34, 197, 94, 0.2)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                          }}
                        >
                          <Plus className='h-5 w-5 mr-2 text-white' />
                          <span className='text-white font-[Satoshi]'>
                            {!walletAddress
                              ? 'Connect Wallet First'
                              : claimPeriods.some((p) => p.isActive)
                                ? 'Period Already Active'
                                : contractLoading
                                  ? 'Creating...'
                                  : 'Create Claim Period'}
                          </span>
                        </Button>
                      )}

                    {/* Claim Periods List */}
                    {(transformedClaimPeriods.length > 0 ||
                      (walletAddress && dbClaimPeriods)) && (
                        <div
                          className='rounded-2xl p-6'
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(30px)',
                            WebkitBackdropFilter: 'blur(30px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <h3 className='text-white/80 text-sm mb-4 font-[Satoshi] text-[20px]'>
                            Claim Periods
                          </h3>
                          {transformedClaimPeriods.length === 0 ? (
                            <div className='text-white/60 text-sm text-center py-4'>
                              No claim periods yet
                            </div>
                          ) : (
                            <div className='space-y-3'>
                              {transformedClaimPeriods.map((period) => (
                                <div
                                  key={period.id}
                                  className='rounded-xl p-4'
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: period.isActive
                                      ? '1px solid rgba(34, 197, 94, 0.3)'
                                      : '1px solid rgba(255, 255, 255, 0.1)',
                                  }}
                                >
                                  <div className='flex items-center justify-between mb-2'>
                                    <div className='flex items-center gap-2'>
                                      {period.isActive ? (
                                        <Clock className='h-4 w-4 text-green-400' />
                                      ) : (
                                        <Check className='h-4 w-4 text-white/60' />
                                      )}
                                      <span className='text-white text-sm font-[Satoshi]'>
                                        {period.isActive ? 'Active' : 'Closed'}
                                      </span>
                                    </div>
                                    <span className='text-white/60 text-xs'>
                                      {period.proofsCount} proofs
                                    </span>
                                  </div>
                                  <div className='text-white/60 text-xs mb-3'>
                                    Started:{' '}
                                    {period.startDate.toLocaleDateString()}
                                  </div>
                                  {period.isActive ? (
                                    <Button
                                      onClick={async () => {
                                        // Call smart contract to close period
                                        try {
                                          setContractLoading(true);
                                          setMessage('Closing claim period...');
                                          // Implementation would go here
                                          setMessage(
                                            'Period closed successfully!'
                                          );
                                        } catch (error) {
                                          setMessage('Failed to close period');
                                        } finally {
                                          setContractLoading(false);
                                          setTimeout(() => setMessage(''), 3000);
                                        }
                                      }}
                                      disabled={contractLoading}
                                      className='w-full rounded-lg py-2 transition-all duration-200 hover:scale-105'
                                      style={{
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        border:
                                          '1px solid rgba(239, 68, 68, 0.3)',
                                      }}
                                    >
                                      <span className='text-white text-sm font-[Satoshi]'>
                                        Close Period
                                      </span>
                                    </Button>
                                  ) : (
                                    <Button
                                      onClick={() => {
                                        setSelectedClaimPeriodForAirdrop(period);
                                        setCurrentView('airdrop');
                                      }}
                                      className='w-full rounded-lg py-2 transition-all duration-200 hover:scale-105'
                                      style={{
                                        background: 'rgba(59, 130, 246, 0.2)',
                                        border:
                                          '1px solid rgba(59, 130, 246, 0.3)',
                                      }}
                                    >
                                      <span className='text-white text-sm font-[Satoshi]'>
                                        Setup Airdrop
                                      </span>
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                )}

                {currentView === 'onramp' && (
                  <div className='w-full max-w-md space-y-6'>
                    <div className='flex items-center gap-3 mb-4'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => setCurrentView('dashboard')}
                        className='rounded-full'
                        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                      >
                        <ChevronLeft className='h-5 w-5 text-white' />
                      </Button>
                      <h2 className='text-white text-[25px] font-[Satoshi] font-bold'>
                        Add Funds
                      </h2>
                    </div>

                    <div
                      className='rounded-2xl p-6'
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div className='text-center mb-6'>
                        <DollarSign className='h-16 w-16 text-blue-400 mx-auto mb-4' />
                        <h3 className='text-white font-[Satoshi] text-[20px] mb-2'>
                          Coinbase Onramp
                        </h3>
                        <p className='text-white/60 text-sm'>
                          Connect your Coinbase account to add funds
                        </p>
                      </div>

                      <div className='space-y-3'>
                        <OnrampButton
                          className='w-full rounded-xl py-6 transition-all duration-200 hover:scale-105 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20'
                          variant='outline'
                          size='lg'
                        />

                        <p className='text-white/40 text-xs text-center mt-4'>
                          Secure Coinbase integration for crypto purchases
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {currentView === 'airdrop' && selectedClaimPeriodForAirdrop && (
                  <div className='w-full max-w-md space-y-6'>
                    <div className='flex items-center gap-3 mb-4'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => {
                          setCurrentView('dashboard');
                          setSelectedClaimPeriodForAirdrop(null);
                          setAirdropAmount('');
                        }}
                        className='rounded-full'
                        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                      >
                        <ChevronLeft className='h-5 w-5 text-white' />
                      </Button>
                      <h2 className='text-white text-[25px] font-[Satoshi] font-bold'>
                        Setup Airdrop
                      </h2>
                    </div>

                    <div
                      className='rounded-2xl p-6'
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div className='mb-6'>
                        <div className='text-white/60 text-sm mb-2'>
                          Your Balance (Base)
                        </div>
                        <div className='text-white text-[28px] font-[Satoshi] font-bold'>
                          {mounted && walletAddress
                            ? `$${(parseFloat(ethBalance) * ethPriceUSD).toFixed(2)}`
                            : '$0.00'}
                        </div>
                        <div className='text-white/40 text-xs mt-1'>
                          {mounted && walletAddress ? `${ethBalance} ETH` : '0.000000 ETH'}
                        </div>
                      </div>

                      <div className='mb-4'>
                        <div className='text-white/60 text-sm mb-2'>
                          Proofs Submitted
                        </div>
                        <div className='text-white text-[20px] font-[Satoshi]'>
                          {selectedClaimPeriodForAirdrop.proofsCount}
                        </div>
                      </div>

                      <Input
                        type='number'
                        value={airdropAmount}
                        onChange={(e) => setAirdropAmount(e.target.value)}
                        placeholder='Total airdrop amount (USD)'
                        className='w-full px-4 py-6 rounded-xl border-none text-white placeholder:text-white/40 mb-4'
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                      />

                      {airdropAmount &&
                        selectedClaimPeriodForAirdrop.proofsCount > 0 && (
                          <div
                            className='mb-4 p-4 rounded-xl'
                            style={{ background: 'rgba(255, 255, 255, 0.08)' }}
                          >
                            <div className='text-white/60 text-sm mb-1'>
                              Amount per participant
                            </div>
                            <div className='text-white font-[Satoshi]'>
                              $
                              {(
                                parseFloat(airdropAmount) /
                                selectedClaimPeriodForAirdrop.proofsCount
                              ).toFixed(2)}
                            </div>
                          </div>
                        )}

                      <Button
                        onClick={async () => {
                          if (!walletAddress) {
                            setMessage('Please connect your wallet first');
                            return;
                          }
                          if (
                            parseFloat(airdropAmount) <= balance &&
                            selectedClaimPeriodForAirdrop
                          ) {
                            await executeAirdrop(
                              selectedClaimPeriodForAirdrop.id.toString(),
                              airdropAmount
                            );
                            setCurrentView('dashboard');
                            setAirdropAmount('');
                            setSelectedClaimPeriodForAirdrop(null);
                          } else {
                            setMessage('Insufficient balance!');
                          }
                        }}
                        disabled={
                          !airdropAmount ||
                          parseFloat(airdropAmount) <= 0 ||
                          parseFloat(airdropAmount) > balance ||
                          contractLoading ||
                          !walletAddress
                        }
                        className='w-full rounded-xl py-6 transition-all duration-200 hover:scale-105'
                        style={{
                          background:
                            airdropAmount &&
                              parseFloat(airdropAmount) > 0 &&
                              parseFloat(airdropAmount) <= balance &&
                              walletAddress
                              ? 'rgba(34, 197, 94, 0.2)'
                              : 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                        }}
                      >
                        <span className='text-white font-[Satoshi]'>
                          {!walletAddress
                            ? 'Connect Wallet First'
                            : contractLoading
                              ? 'Executing...'
                              : 'Distribute Airdrop'}
                        </span>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          {/* End wrapper */}
        </div>
      </div>

      {/* Dynamic Island at Bottom */}
      <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto'>
        <div
          className='relative flex items-center justify-between gap-3 px-3 py-3 rounded-full'
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            minWidth: '280px',
          }}
        >
          {/* Profile Toggle Button */}
          <motion.button
            animate={{
              width: showLabel
                ? userType === 'creator'
                  ? '110px'
                  : '70px'
                : '36px',
              borderRadius: showLabel ? '18px' : '50%',
            }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className='flex-shrink-0 flex items-center justify-start gap-2 h-9 px-2 overflow-hidden'
            style={{
              background:
                userType === 'creator'
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
            onClick={() => {
              setUserType(userType === 'creator' ? 'fan' : 'creator');
              setShowLabel(true);
              setTimeout(() => setShowLabel(false), 1000);
            }}
          >
            <div className='flex-shrink-0 flex items-center justify-center w-5 h-5'>
              {userType === 'creator' ? (
                <User className='h-4 w-4 text-white' />
              ) : (
                <Users className='h-4 w-4 text-white' />
              )}
            </div>
            <AnimatePresence>
              {showLabel && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.3 }}
                  className='text-white uppercase tracking-wider whitespace-nowrap overflow-hidden'
                  style={{ fontSize: '11px' }}
                >
                  {userType === 'creator' ? 'Creator' : 'Fan'}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* App Name */}
          <AnimatePresence>
            {!showLabel && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className='flex-1 text-center'
              >
                <span
                  className='text-white uppercase tracking-widest'
                  style={{ fontSize: '14px', fontWeight: '600' }}
                >
                  Link
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wallet/Basename Display */}
          <div className='flex-shrink-0 flex items-center gap-2'>
            {mounted && walletAddress && connectedBasename ? (
              <BasenameDisplay
                address={walletAddress}
                className='bg-white/10 rounded-full px-3 py-1'
              />
            ) : mounted && walletAddress ? (
              <div
                className='flex-shrink-0 rounded-full p-2'
                style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  width: '36px',
                  height: '36px',
                }}
              >
                <Wallet className='h-4 w-4 text-green-400' />
              </div>
            ) : (
              <div
                className='flex-shrink-0 rounded-full p-2'
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  width: '36px',
                  height: '36px',
                }}
              >
                <Wallet className='h-4 w-4 text-white/60' />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
