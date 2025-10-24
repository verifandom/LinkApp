'use client';

import { useEffect, useRef, useState } from 'react';
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
  Wallet
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { linkUtils } from '@/lib/contract';
import { useBasename, useBasenameSearch } from '@/hooks/useBasename';
import { BasenameDisplay, BasenameSearchDisplay } from './BasenameDisplay';
import { OnrampButton } from './OnrampButton';
import type { Address } from 'viem';

type UserType = 'creator' | 'fan';
type ViewType = 'dashboard' | 'creatorProfile' | 'onramp' | 'airdrop';

interface ClaimPeriod {
  id: string;
  creatorName: string;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  proofsCount: number;
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
  id: string;
  name: string;
  points: string;
  hasActiveClaimPeriod: boolean;
  connectedSocials: string[];
}

export function LiquidGlassOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [userType, setUserType] = useState<UserType>('creator');
  const [showLabel, setShowLabel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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
  const [selectedClaimPeriodForAirdrop, setSelectedClaimPeriodForAirdrop] = useState<ClaimPeriod | null>(null);
  const [airdropAmount, setAirdropAmount] = useState('');

  // Wallet state
  const [walletAddress, setWalletAddress] = useState<Address | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Basename state
  const [basenameQuery, setBasenameQuery] = useState('');
  const [basenameResults, setBasenameResults] = useState<any[]>([]);

  // Basename hooks
  const { basename: connectedBasename } = useBasename(walletAddress);
  const { searchBasename, isSearching } = useBasenameSearch();

  // Mock creators data
  const mockCreators: Creator[] = [
    { id: '1', name: 'Sarah Chen', points: '12.5K', hasActiveClaimPeriod: true, connectedSocials: ['youtube', 'instagram'] },
    { id: '2', name: 'Alex Rivera', points: '10.2K', hasActiveClaimPeriod: false, connectedSocials: ['twitter', 'youtube'] },
    { id: '3', name: 'Jordan Kim', points: '9.8K', hasActiveClaimPeriod: true, connectedSocials: ['instagram'] },
    { id: '4', name: 'Taylor Swift', points: '8.9K', hasActiveClaimPeriod: false, connectedSocials: ['twitter'] },
    { id: '5', name: 'Morgan Lee', points: '7.6K', hasActiveClaimPeriod: true, connectedSocials: ['youtube'] },
  ];

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Wallet connection function
  const connectWallet = async () => {
    if (isConnecting) return;

    try {
      setIsConnecting(true);
      setMessage('');

      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts'
        });

        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setMessage('Wallet connected successfully!');

          // Try to switch to Base Sepolia
          try {
            await (window as any).ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x14a34' }], // Base Sepolia chainId
            });
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              // Chain not added, add it
              await (window as any).ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x14a34',
                  chainName: 'Base Sepolia',
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                  rpcUrls: ['https://sepolia.base.org'],
                  blockExplorerUrls: ['https://sepolia-explorer.base.org'],
                }],
              });
            }
          }
        }
      } else {
        setMessage('Please install MetaMask or another web3 wallet');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      setMessage('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Contract functions
  const checkAndRegisterCreator = async (channelId: string, tokenAddress: string = '0x0000000000000000000000000000000000000000') => {
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
      setMessage('Registering as creator...');

      // Mock proof structure for demonstration
      // In production, this would come from Reclaim protocol
      const mockProof = {
        claimInfo: {
          identifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
          owner: walletAddress,
          timestampS: Math.floor(Date.now() / 1000),
          epoch: 1
        },
        signedClaim: {
          claim: {
            identifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
            owner: walletAddress,
            timestampS: Math.floor(Date.now() / 1000),
            epoch: 1
          },
          signatures: ['0x']
        }
      };

      const registerHash = await linkUtils.registerCreator(channelId, tokenAddress as `0x${string}`, mockProof);
      setMessage('Creator registered successfully!');
      console.log('Registration hash:', registerHash);
      return true;

    } catch (error) {
      console.error('Error registering creator:', error);
      setMessage('Failed to register creator - you may need a valid Reclaim proof');
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

      // Check/register creator first
      const isRegistered = await checkAndRegisterCreator(channelId);
      if (!isRegistered) {
        return;
      }

      setMessage('Creating claim period...');

      const now = Math.floor(Date.now() / 1000);
      const endTime = now + (7 * 24 * 60 * 60); // 7 days from now

      const hash = await linkUtils.openClaimPeriod(
        channelId,
        BigInt(now),
        BigInt(endTime)
      );

      setMessage('Claim period created successfully!');
      console.log('Transaction hash:', hash);

      // Update local state
      const newPeriod: ClaimPeriod = {
        id: Date.now().toString(),
        creatorName: 'You',
        startDate: new Date(),
        endDate: null,
        isActive: true,
        proofsCount: 0
      };
      setClaimPeriods([...claimPeriods, newPeriod]);

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

      const hash = await linkUtils.airdrop(
        BigInt(claimPeriodId),
        amountInWei
      );

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    // Canvas is fixed to card size
    canvas.width = 600;
    canvas.height = 400;

    // Create gradient blob
    const createBlob = (
      x: number,
      y: number,
      radius: number,
      color: string
    ) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      return gradient;
    };

    // Animation loop for liquid effect
    const animate = () => {
      time += 0.003;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Create multiple animated blobs for liquid effect
      const blobs = [
        {
          x: centerX + Math.sin(time) * 100,
          y: centerY + Math.cos(time * 0.8) * 80,
          radius: 150 + Math.sin(time * 2) * 30,
          color: 'rgba(255, 255, 255, 0.08)',
        },
        {
          x: centerX + Math.sin(time * 1.2 + 2) * 120,
          y: centerY + Math.cos(time * 0.9 + 3) * 100,
          radius: 180 + Math.sin(time * 1.5) * 35,
          color: 'rgba(255, 255, 255, 0.06)',
        },
        {
          x: centerX + Math.sin(time * 0.8 + 4) * 90,
          y: centerY + Math.cos(time * 1.1 + 1) * 90,
          radius: 140 + Math.sin(time * 1.8) * 25,
          color: 'rgba(200, 220, 255, 0.05)',
        },
      ];

      // Draw blobs
      blobs.forEach((blob) => {
        ctx.fillStyle = createBlob(blob.x, blob.y, blob.radius, blob.color);
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="relative rounded-3xl overflow-hidden pointer-events-auto"
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
        {/* Liquid gradient blobs */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{
            mixBlendMode: 'screen',
          }}
        />

        {/* Frosted glass with backdrop blur */}
        <div
          className="absolute inset-0"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(80px)',
            WebkitBackdropFilter: 'blur(80px)',
          }}
        />

        {/* Subtle noise texture */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />

        {/* Glass highlights */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0) 80%, rgba(255, 255, 255, 0.1) 100%)',
          }}
        />

        {/* Top shimmer */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 255, 255, 0) 100%)',
          }}
        />

        {/* Main Content */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-start py-8 px-12 overflow-y-auto">
          <div className="w-full max-w-md">{/* Wrapper for centering */}

            {/* Status Message */}
            {message && (
              <div
                className="mb-4 p-3 rounded-xl text-center text-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <span className="text-white">{message}</span>
              </div>
            )}
            {userType === 'fan' ? (
              <>
                {currentView === 'dashboard' && (
                  <div className="w-full max-w-md space-y-6">
                    <h1 className="text-white text-center mb-2 text-[32px] font-[Satoshi] font-bold">
                      {connectedBasename ? `Hello ${connectedBasename.replace('.base.eth', '')}` : 'Hello Fan!'}
                    </h1>
                    <h2 className="text-white text-center mb-4 text-[25px] px-[-46px] py-[0px] font-[Satoshi] font-bold">Search for your favorite web2</h2>

                    {/* Basename Search */}
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
                        <Input
                          type="text"
                          value={basenameQuery}
                          onChange={(e) => setBasenameQuery(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && basenameQuery.trim()) {
                              const result = await searchBasename(basenameQuery.trim());
                              if (result) {
                                setBasenameResults([result]);
                              } else {
                                setBasenameResults([]);
                              }
                            }
                          }}
                          placeholder="Search basenames (e.g. vitalik.base.eth)..."
                          className="w-full pl-12 pr-4 py-6 rounded-2xl border-none text-white placeholder:text-white/40"
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(30px)',
                            WebkitBackdropFilter: 'blur(30px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                          }}
                        />
                        {isSearching && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" />
                          </div>
                        )}
                      </div>

                      {/* Basename Search Results */}
                      {basenameResults.length > 0 && (
                        <div
                          className="rounded-2xl p-4"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(30px)',
                            WebkitBackdropFilter: 'blur(30px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <h3 className="text-white/80 text-sm mb-3 px-2 font-[Satoshi] text-[16px]">Basename Found</h3>
                          <div className="space-y-2">
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
                                  setMessage(`Copied ${result.basename} address!`);
                                  setTimeout(() => setMessage(''), 2000);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Regular creator search */}
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
                      <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search creators..."
                        className="w-full pl-12 pr-4 py-6 rounded-2xl border-none text-white placeholder:text-white/40"
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                      />
                    </div>

                    <div
                      className="rounded-2xl p-4 mt-6"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <h3 className="text-white/80 text-sm mb-3 px-2 font-[Satoshi] text-[20px]">Top Creators</h3>
                      <div className="space-y-2">
                        {mockCreators
                          .filter(c => searchQuery === '' || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((creator, idx) => (
                            <div
                              key={creator.id}
                              onClick={() => {
                                setSelectedCreator(creator);
                                setCurrentView('creatorProfile');
                              }}
                              className="flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer"
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className="flex items-center justify-center w-6 h-6 rounded-full text-xs"
                                  style={{
                                    background: idx < 3 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                    color: idx < 3 ? '#ffd700' : '#fff',
                                  }}
                                >
                                  {idx + 1}
                                </span>
                                <span className="text-white text-sm font-[Satoshi]">{creator.name}</span>
                                {creator.hasActiveClaimPeriod && (
                                  <span className="text-xs text-green-400">● Active</span>
                                )}
                              </div>
                              <span className="text-white/60 text-xs">{creator.points}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {currentView === 'creatorProfile' && selectedCreator && (
                  <div className="w-full max-w-md space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCurrentView('dashboard');
                          setSelectedCreator(null);
                          setProofText('');
                        }}
                        className="rounded-full"
                        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                      >
                        <ChevronLeft className="h-5 w-5 text-white" />
                      </Button>
                      <h2 className="text-white text-[25px] font-[Satoshi] font-bold">{selectedCreator.name}</h2>
                    </div>

                    {selectedCreator.hasActiveClaimPeriod ? (
                      <div
                        className="rounded-2xl p-6"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <Clock className="h-5 w-5 text-green-400" />
                          <h3 className="text-white font-[Satoshi] text-[20px]">Active Claim Period</h3>
                        </div>

                        <p className="text-white/60 text-sm mb-4">
                          Submit your zk-TLS proof to participate in this creator's airdrop
                        </p>

                        <Textarea
                          value={proofText}
                          onChange={(e) => setProofText(e.target.value)}
                          placeholder="Paste your zk-TLS proof data here..."
                          className="w-full min-h-[120px] mb-4 rounded-xl border-none text-white placeholder:text-white/40 resize-none"
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
                                creatorId: selectedCreator.id,
                                claimPeriodId: 'active-period',
                                proofData: proofText,
                                submittedAt: new Date(),
                                status: 'pending'
                              };
                              setSubmittedProofs([...submittedProofs, newProof]);
                              setProofText('');
                              alert('Proof submitted successfully!');
                            }
                          }}
                          disabled={!proofText.trim()}
                          className="w-full rounded-xl py-6 transition-all duration-200 hover:scale-105"
                          style={{
                            background: proofText.trim()
                              ? 'rgba(34, 197, 94, 0.2)'
                              : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                          }}
                        >
                          <span className="text-white font-[Satoshi]">Submit Proof</span>
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="rounded-2xl p-6 text-center"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <XCircle className="h-12 w-12 text-white/40 mx-auto mb-3" />
                        <p className="text-white/60">No active claim period</p>
                      </div>
                    )}

                    <div
                      className="rounded-2xl p-6"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <h3 className="text-white/80 text-sm mb-3 font-[Satoshi] text-[20px]">Creator Info</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-white/60 text-sm">Points</span>
                          <span className="text-white text-sm">{selectedCreator.points}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60 text-sm">Connected Socials</span>
                          <span className="text-white text-sm">{selectedCreator.connectedSocials.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {currentView === 'dashboard' && (
                  <div className="w-full max-w-md space-y-6">
                    <h2 className="text-white text-center mb-4 text-[25px] font-[Satoshi] font-bold">
                      Creator Dashboard
                    </h2>

                    {/* Balance & Actions */}
                    <div
                      className="rounded-2xl p-6"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div className="text-center mb-4">
                        <div className="text-white/60 text-sm mb-2">Balance</div>
                        <div className="text-white text-[32px] font-[Satoshi] font-bold">${balance.toFixed(2)}</div>
                      </div>
                      <Button
                        onClick={() => setCurrentView('onramp')}
                        className="w-full rounded-xl py-6 mb-3 transition-all duration-200 hover:scale-105"
                        style={{
                          background: 'rgba(59, 130, 246, 0.2)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                      >
                        <DollarSign className="h-5 w-5 mr-2 text-blue-400" />
                        <span className="text-white font-[Satoshi]">Add Funds (Coinbase)</span>
                      </Button>
                    </div>

                    {/* Social Media Connections */}
                    <div
                      className="rounded-2xl p-6"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <h3 className="text-white/80 text-sm mb-4 font-[Satoshi] text-[20px]">
                        Connect Your Accounts
                      </h3>

                      <div className="space-y-3">
                        <button
                          onClick={() => setConnectedAccounts(prev => ({ ...prev, youtube: !prev.youtube }))}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 hover:scale-105"
                          style={{
                            background: connectedAccounts.youtube ? 'rgba(255, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                            border: connectedAccounts.youtube ? '1px solid rgba(255, 0, 0, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-5 w-5 flex items-center justify-center">
                              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-red-500">
                                <path d="M23.498 6.186a2.997 2.997 0 0 0-2.11-2.125C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.388.516A2.997 2.997 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a2.997 2.997 0 0 0 2.11 2.125C4.495 20.455 12 20.455 12 20.455s7.505 0 9.388-.516a2.997 2.997 0 0 0 2.11-2.125C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.75 15.568V8.432L15.5 12l-5.75 3.568z" />
                              </svg>
                            </div>
                            <span className="text-white text-sm font-[Satoshi]">YouTube</span>
                          </div>
                          <span className="text-xs text-white/60">
                            {connectedAccounts.youtube ? 'Connected' : 'Connect'}
                          </span>
                        </button>

                        <button
                          onClick={() => setConnectedAccounts(prev => ({ ...prev, instagram: !prev.instagram }))}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 hover:scale-105"
                          style={{
                            background: connectedAccounts.instagram ? 'rgba(225, 48, 108, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                            border: connectedAccounts.instagram ? '1px solid rgba(225, 48, 108, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-5 w-5 flex items-center justify-center">
                              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-pink-500">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                              </svg>
                            </div>
                            <span className="text-white text-sm font-[Satoshi]">Instagram</span>
                          </div>
                          <span className="text-xs text-white/60">
                            {connectedAccounts.instagram ? 'Connected' : 'Connect'}
                          </span>
                        </button>

                        <button
                          onClick={() => setConnectedAccounts(prev => ({ ...prev, twitter: !prev.twitter }))}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 hover:scale-105"
                          style={{
                            background: connectedAccounts.twitter ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                            border: connectedAccounts.twitter ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-5 w-5 flex items-center justify-center">
                              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                              </svg>
                            </div>
                            <span className="text-white text-sm font-[Satoshi]">X</span>
                          </div>
                          <span className="text-xs text-white/60">
                            {connectedAccounts.twitter ? 'Connected' : 'Connect'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Create Claim Period (only if at least one social is connected) */}
                    {(connectedAccounts.youtube || connectedAccounts.instagram || connectedAccounts.twitter) && (
                      <Button
                        onClick={() => {
                          // Use connected social as channel ID
                          const channelId = connectedAccounts.youtube ? 'youtube_channel' :
                            connectedAccounts.instagram ? 'instagram_channel' :
                              'twitter_channel';
                          createClaimPeriod(channelId);
                        }}
                        disabled={claimPeriods.some(p => p.isActive) || contractLoading || !walletAddress}
                        className="w-full rounded-xl py-6 transition-all duration-200 hover:scale-105"
                        style={{
                          background: claimPeriods.some(p => p.isActive) || !walletAddress
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(34, 197, 94, 0.2)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                        }}
                      >
                        <Plus className="h-5 w-5 mr-2 text-white" />
                        <span className="text-white font-[Satoshi]">
                          {!walletAddress ? 'Connect Wallet First' :
                            claimPeriods.some(p => p.isActive) ? 'Period Already Active' :
                              contractLoading ? 'Creating...' : 'Create Claim Period'}
                        </span>
                      </Button>
                    )}

                    {/* Claim Periods List */}
                    {claimPeriods.length > 0 && (
                      <div
                        className="rounded-2xl p-6"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <h3 className="text-white/80 text-sm mb-4 font-[Satoshi] text-[20px]">
                          Claim Periods
                        </h3>
                        <div className="space-y-3">
                          {claimPeriods.map((period) => (
                            <div
                              key={period.id}
                              className="rounded-xl p-4"
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: period.isActive ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                              }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {period.isActive ? (
                                    <Clock className="h-4 w-4 text-green-400" />
                                  ) : (
                                    <Check className="h-4 w-4 text-white/60" />
                                  )}
                                  <span className="text-white text-sm font-[Satoshi]">
                                    {period.isActive ? 'Active' : 'Closed'}
                                  </span>
                                </div>
                                <span className="text-white/60 text-xs">
                                  {period.proofsCount} proofs
                                </span>
                              </div>
                              <div className="text-white/60 text-xs mb-3">
                                Started: {period.startDate.toLocaleDateString()}
                              </div>
                              {period.isActive ? (
                                <Button
                                  onClick={() => {
                                    setClaimPeriods(claimPeriods.map(p =>
                                      p.id === period.id
                                        ? { ...p, isActive: false, endDate: new Date() }
                                        : p
                                    ));
                                  }}
                                  className="w-full rounded-lg py-2 transition-all duration-200 hover:scale-105"
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                  }}
                                >
                                  <span className="text-white text-sm font-[Satoshi]">Close Period</span>
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => {
                                    setSelectedClaimPeriodForAirdrop(period);
                                    setCurrentView('airdrop');
                                  }}
                                  className="w-full rounded-lg py-2 transition-all duration-200 hover:scale-105"
                                  style={{
                                    background: 'rgba(59, 130, 246, 0.2)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                  }}
                                >
                                  <span className="text-white text-sm font-[Satoshi]">Setup Airdrop</span>
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {currentView === 'onramp' && (
                  <div className="w-full max-w-md space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentView('dashboard')}
                        className="rounded-full"
                        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                      >
                        <ChevronLeft className="h-5 w-5 text-white" />
                      </Button>
                      <h2 className="text-white text-[25px] font-[Satoshi] font-bold">Add Funds</h2>
                    </div>

                    <div
                      className="rounded-2xl p-6"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div className="text-center mb-6">
                        <DollarSign className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                        <h3 className="text-white font-[Satoshi] text-[20px] mb-2">Coinbase Onramp</h3>
                        <p className="text-white/60 text-sm">
                          Connect your Coinbase account to add funds
                        </p>
                      </div>

                      <div className="space-y-3">
                        <OnrampButton 
                          className="w-full rounded-xl py-6 transition-all duration-200 hover:scale-105 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                          variant="outline"
                          size="lg"
                        />

                        <p className="text-white/40 text-xs text-center mt-4">
                          Secure Coinbase integration for crypto purchases
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {currentView === 'airdrop' && selectedClaimPeriodForAirdrop && (
                  <div className="w-full max-w-md space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCurrentView('dashboard');
                          setSelectedClaimPeriodForAirdrop(null);
                          setAirdropAmount('');
                        }}
                        className="rounded-full"
                        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                      >
                        <ChevronLeft className="h-5 w-5 text-white" />
                      </Button>
                      <h2 className="text-white text-[25px] font-[Satoshi] font-bold">Setup Airdrop</h2>
                    </div>

                    <div
                      className="rounded-2xl p-6"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div className="mb-6">
                        <div className="text-white/60 text-sm mb-2">Your Balance</div>
                        <div className="text-white text-[28px] font-[Satoshi] font-bold">${balance.toFixed(2)}</div>
                      </div>

                      <div className="mb-4">
                        <div className="text-white/60 text-sm mb-2">Proofs Submitted</div>
                        <div className="text-white text-[20px] font-[Satoshi]">{selectedClaimPeriodForAirdrop.proofsCount}</div>
                      </div>

                      <Input
                        type="number"
                        value={airdropAmount}
                        onChange={(e) => setAirdropAmount(e.target.value)}
                        placeholder="Total airdrop amount (USD)"
                        className="w-full px-4 py-6 rounded-xl border-none text-white placeholder:text-white/40 mb-4"
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                      />

                      {airdropAmount && selectedClaimPeriodForAirdrop.proofsCount > 0 && (
                        <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
                          <div className="text-white/60 text-sm mb-1">Amount per participant</div>
                          <div className="text-white font-[Satoshi]">
                            ${(parseFloat(airdropAmount) / selectedClaimPeriodForAirdrop.proofsCount).toFixed(2)}
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={async () => {
                          if (!walletAddress) {
                            setMessage('Please connect your wallet first');
                            return;
                          }
                          if (parseFloat(airdropAmount) <= balance && selectedClaimPeriodForAirdrop) {
                            await executeAirdrop(selectedClaimPeriodForAirdrop.id, airdropAmount);
                            setCurrentView('dashboard');
                            setAirdropAmount('');
                            setSelectedClaimPeriodForAirdrop(null);
                          } else {
                            setMessage('Insufficient balance!');
                          }
                        }}
                        disabled={!airdropAmount || parseFloat(airdropAmount) <= 0 || parseFloat(airdropAmount) > balance || contractLoading || !walletAddress}
                        className="w-full rounded-xl py-6 transition-all duration-200 hover:scale-105"
                        style={{
                          background: airdropAmount && parseFloat(airdropAmount) > 0 && parseFloat(airdropAmount) <= balance && walletAddress
                            ? 'rgba(34, 197, 94, 0.2)'
                            : 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                        }}
                      >
                        <span className="text-white font-[Satoshi]">
                          {!walletAddress ? 'Connect Wallet First' :
                            contractLoading ? 'Executing...' : 'Distribute Airdrop'}
                        </span>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>{/* End wrapper */}
        </div>
      </div>

      {/* Dynamic Island at Bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <div
          className="relative flex items-center justify-between gap-3 px-3 py-3 rounded-full"
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
              width: showLabel ? (userType === 'creator' ? '110px' : '70px') : '36px',
              borderRadius: showLabel ? '18px' : '50%',
            }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="flex-shrink-0 flex items-center justify-start gap-2 h-9 px-2 overflow-hidden"
            style={{
              background: userType === 'creator' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
            onClick={() => {
              setUserType(userType === 'creator' ? 'fan' : 'creator');
              setShowLabel(true);
              setTimeout(() => setShowLabel(false), 1000);
            }}
          >
            <div className="flex-shrink-0 flex items-center justify-center w-5 h-5">
              {userType === 'creator' ? (
                <User className="h-4 w-4 text-white" />
              ) : (
                <Users className="h-4 w-4 text-white" />
              )}
            </div>
            <AnimatePresence>
              {showLabel && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-white uppercase tracking-wider whitespace-nowrap overflow-hidden"
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
                className="flex-1 text-center"
              >
                <span className="text-white uppercase tracking-widest" style={{ fontSize: '14px', fontWeight: '600' }}>
                  Link
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wallet/Basename Display */}
          <div className="flex-shrink-0 flex items-center gap-2">
            {walletAddress && connectedBasename ? (
              <BasenameDisplay
                address={walletAddress}
                className="bg-white/10 rounded-full px-3 py-1"
              />
            ) : (
              <button
                className="flex-shrink-0 rounded-full p-2 transition-all duration-300 hover:scale-110"
                style={{
                  background: walletAddress ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.15)',
                  border: walletAddress ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
                  width: '36px',
                  height: '36px',
                }}
                onClick={connectWallet}
                disabled={isConnecting}
              >
                <Wallet className={`h-4 w-4 ${walletAddress ? 'text-green-400' : 'text-white'}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
