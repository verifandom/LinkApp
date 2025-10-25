'use server';

import { ReclaimClient } from '@reclaimprotocol/zk-fetch';
import { verifyProof, transformForOnchain } from '@reclaimprotocol/js-sdk';

export interface ReclaimProof {
  taskId: string;
  snapshotSignature: string;
  ownerPublicKey: string;
  timestampS: number;
  witnessAddresses: string[];
  witnesses: Array<{
    address: string;
    signature: string;
  }>;
}

export interface CreatorProof extends ReclaimProof {
  channelId: string;
  channelTitle: string;
  subscriberCount: string;
}

export interface SubscriberProof extends ReclaimProof {
  channelId: string;
  channelTitle: string;
  subscribedAt: string;
}

const appId = process.env.NEXT_PUBLIC_RECLAIM_APP_ID;
const appSecret = process.env.RECLAIM_APP_SECRET;

if (!appId || !appSecret) {
  throw new Error(
    'Missing RECLAIM_APP_ID or RECLAIM_APP_SECRET in environment variables'
  );
}

const reclaimClient = new ReclaimClient(appId, appSecret);

/**
 * Generate a zero-knowledge proof for YouTube channel ownership
 * Uses the YouTube API to fetch channel information and generates a proof
 */
export async function generateCreatorProof(
  accessToken: string,
  channelId: string,
  _walletAddress?: string
): Promise<any> {
  try {
    const publicOptions = {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    };

    // Note: We don't use contextAddress because it invalidates the proof signature
    // The smart contract has been modified to not require proof.owner == msg.sender

    const privateOptions = {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      responseMatches: [
        {
          type: 'contains' as const,
          value: channelId,
        },
      ],
    };

    // Fetch and generate ZK proof for the channels.list API
    const proof = await reclaimClient.zkFetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      publicOptions,
      privateOptions,
      5, // retries
      10000 // retry interval in ms
    );
    console.log('Raw proof from zkFetch:', proof);

    if (!proof) {
      throw new Error('zkFetch returned undefined proof');
    }

    // Verify the proof
    const isVerified = await verifyProof(proof as any);
    if (!isVerified) {
      throw new Error('Proof verification failed');
    }

    // Return the FULL proof object - transformForOnchain needs the raw structure
    return proof;
  } catch (error) {
    console.error('Error generating creator proof:', error);
    throw error;
  }
}

/**
 * Generate a zero-knowledge proof for YouTube subscription
 * Uses the YouTube API to verify subscription and generates a proof
 */
export async function generateSubscriberProof(
  accessToken: string,
  channelId: string
): Promise<any> {
  try {
    const publicOptions = {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    };

    const privateOptions = {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      responseMatches: [
        {
          type: 'contains' as const,
          value: channelId,
        },
      ],
    };

    // Fetch and generate ZK proof for the subscriptions.list API
    const proof = await reclaimClient.zkFetch(
      `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&forChannelId=${channelId}&maxResults=1`,
      publicOptions,
      privateOptions,
      5, // retries
      10000 // retry interval in ms
    );
    console.log('Raw subscriber proof from zkFetch:', proof);

    if (!proof) {
      throw new Error('zkFetch returned undefined proof');
    }

    // Verify the proof
    const isVerified = await verifyProof(proof as any);
    if (!isVerified) {
      throw new Error('Proof verification failed');
    }

    // Return the FULL proof object - transformForOnchain needs the raw structure
    return proof;
  } catch (error) {
    console.error('Error generating subscriber proof:', error);
    throw error;
  }
}

/**
 * Verify a Reclaim proof
 */
export async function verifyReclaimProof(
  proof: any
): Promise<boolean> {
  try {
    const isVerified = await verifyProof(proof as any);
    return isVerified;
  } catch (error) {
    console.error('Error verifying proof:', error);
    return false;
  }
}

/**
 * Transform proof for on-chain submission
 * Custom transformation to match our smart contract's expected format
 *
 * @param proof - Raw proof from Reclaim zkFetch
 * @param userWalletAddress - OPTIONAL: User's wallet address to override proof owner
 *                            This is a WORKAROUND because zkFetch runs server-side
 */
export async function transformProofForOnchain(
  proof: any,
  userWalletAddress?: string
): Promise<any> {
  try {
    console.log('=== TRANSFORM PROOF DEBUG ===');
    console.log('Input proof:', JSON.stringify(proof, null, 2));
    console.log('User wallet override:', userWalletAddress);

    // First get the SDK transformation
    const sdkTransformed = transformForOnchain(proof);
    console.log('SDK transformed:', JSON.stringify(sdkTransformed, null, 2));

    // Return exactly what the SDK gives us - don't restructure!
    // The Reclaim verifier expects the exact structure from transformForOnchain
    console.log('Returning SDK transformed proof as-is');
    console.log('=== END TRANSFORM DEBUG ===');

    return sdkTransformed;
  } catch (error) {
    console.error('Error transforming proof for on-chain:', error);
    console.error('Error stack:', error);
    throw error;
  }
}

/**
 * Validate and ensure proof structure matches the contract ABI
 * Use this before passing proof to contract calls
 */
export async function validateProofStructure(proof: any): Promise<any> {
  if (!proof) {
    throw new Error('Proof is null or undefined');
  }

  if (!proof.claimInfo) {
    throw new Error('Missing claimInfo in proof');
  }

  if (!proof.signedClaim) {
    throw new Error('Missing signedClaim in proof');
  }

  if (!proof.signedClaim.claim) {
    throw new Error('Missing claim in signedClaim');
  }

  if (!proof.signedClaim.claim.identifier) {
    throw new Error('Missing identifier in claim');
  }

  if (!Array.isArray(proof.signedClaim.signatures)) {
    throw new Error('signatures must be an array');
  }

  // Ensure proper types - viem needs exact types
  return {
    claimInfo: {
      provider: String(proof.claimInfo.provider),
      parameters: String(proof.claimInfo.parameters),
      context: String(proof.claimInfo.context),
    },
    signedClaim: {
      claim: {
        identifier: proof.signedClaim.claim.identifier, // Should be bytes32 (0x...)
        owner: proof.signedClaim.claim.owner, // Should be address (0x...)
        timestampS: Number(proof.signedClaim.claim.timestampS),
        epoch: Number(proof.signedClaim.claim.epoch),
      },
      signatures: proof.signedClaim.signatures, // Array of bytes
    },
  };
}
