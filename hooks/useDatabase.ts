import { useQuery } from '@tanstack/react-query';

export interface Creator {
  id: number;
  wallet_address: string;
  channel_id: string;
  channel_name: string;
  registered_at: string;
}

export interface ClaimPeriod {
  id: number;
  creator_id: number;
  channel_id: string;
  claim_period_id: string;
  start_time: string;
  end_time: string;
  is_open: boolean;
  channel_name: string;
  wallet_address: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriberAirdrop {
  id: number;
  subscriber_address: string;
  claim_period_id: number;
  creator_id: number;
  proof_submitted_at: string;
  status: string;
  claim_period_id_num: string;
  start_time: string;
  end_time: string;
  is_open: boolean;
  channel_id: string;
  channel_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch all creators
 */
export function useCreators() {
  return useQuery({
    queryKey: ['creators'],
    queryFn: async () => {
      const response = await fetch('/api/db/creators');
      if (!response.ok) {
        throw new Error('Failed to fetch creators');
      }
      const data = await response.json();
      return data.creators as Creator[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch all claim periods
 */
export function useClaimPeriods() {
  return useQuery({
    queryKey: ['claimPeriods'],
    queryFn: async () => {
      const response = await fetch('/api/db/claim-periods');
      if (!response.ok) {
        throw new Error('Failed to fetch claim periods');
      }
      const data = await response.json();
      return data.claimPeriods as ClaimPeriod[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch subscriber's airdrops
 */
export function useSubscriberAirdrops(address: string | null) {
  return useQuery({
    queryKey: ['subscriberAirdrops', address],
    queryFn: async () => {
      if (!address) return [];

      const response = await fetch(`/api/db/my-airdrops?address=${encodeURIComponent(address)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch subscriber airdrops');
      }
      const data = await response.json();
      return data.airdrops as SubscriberAirdrop[];
    },
    enabled: !!address,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Sync creator to database after on-chain registration
 */
export async function syncCreatorToDb(
  walletAddress: string,
  channelId: string,
  channelName: string
) {
  const response = await fetch('/api/db/sync-creator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress,
      channelId,
      channelName,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync creator');
  }

  return response.json();
}

/**
 * Sync claim period to database after on-chain creation
 */
export async function syncClaimPeriodToDb(
  channelId: string,
  claimPeriodId: bigint,
  startTime: bigint,
  endTime: bigint
) {
  const response = await fetch('/api/db/sync-claim-period', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channelId,
      claimPeriodId: claimPeriodId.toString(),
      startTime: startTime.toString(),
      endTime: endTime.toString(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync claim period');
  }

  return response.json();
}

/**
 * Sync proof to database after on-chain submission
 */
export async function syncProofToDb(
  subscriberAddress: string,
  claimPeriodId: number,
  creatorId: number
) {
  const response = await fetch('/api/db/sync-proof', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscriberAddress,
      claimPeriodId,
      creatorId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync proof');
  }

  return response.json();
}

/**
 * Sync airdrop to database after on-chain execution
 */
export async function syncAirdropToDb(
  claimPeriodId: number,
  creatorId: number,
  totalTokenAmount: string
) {
  const response = await fetch('/api/db/sync-airdrop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      claimPeriodId,
      creatorId,
      totalTokenAmount,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync airdrop');
  }

  return response.json();
}
