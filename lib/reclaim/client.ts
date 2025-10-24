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
  channelId: string
): Promise<CreatorProof> {
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

    // Fetch and generate ZK proof for the channels.list API
    const proof = await reclaimClient.zkFetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      publicOptions,
      privateOptions,
      5, // retries
      10000 // retry interval in ms
    );
    console.log(proof);

    // Verify the proof
    const isVerified = await verifyProof(proof);
    if (!isVerified) {
      throw new Error('Proof verification failed');
    }

    return {
      taskId: proof.taskId,
      snapshotSignature: proof.snapshotSignature,
      ownerPublicKey: proof.ownerPublicKey,
      timestampS: proof.timestampS,
      witnessAddresses: proof.witnessAddresses,
      witnesses: proof.witnesses,
      channelId,
      channelTitle: `Channel ${channelId}`,
      subscriberCount: '0',
    };
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
): Promise<SubscriberProof> {
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

    // Verify the proof
    const isVerified = await verifyProof(proof);
    if (!isVerified) {
      throw new Error('Proof verification failed');
    }

    return {
      taskId: proof.taskId,
      snapshotSignature: proof.snapshotSignature,
      ownerPublicKey: proof.ownerPublicKey,
      timestampS: proof.timestampS,
      witnessAddresses: proof.witnessAddresses,
      witnesses: proof.witnesses,
      channelId,
      channelTitle: `Channel ${channelId}`,
      subscribedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating subscriber proof:', error);
    throw error;
  }
}

/**
 * Verify a Reclaim proof
 */
export async function verifyReclaimProof(
  proof: ReclaimProof
): Promise<boolean> {
  try {
    const isVerified = await verifyProof(proof);
    return isVerified;
  } catch (error) {
    console.error('Error verifying proof:', error);
    return false;
  }
}

/**
 * Transform proof for on-chain submission
 */
export async function transformProofForOnchain(proof: ReclaimProof): Promise<any> {
  try {
    return transformForOnchain(proof);
  } catch (error) {
    console.error('Error transforming proof for on-chain:', error);
    throw error;
  }
}
