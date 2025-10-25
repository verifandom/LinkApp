import { PrismaClient } from '@prisma/client';

// Create a single instance of PrismaClient
const prisma = new PrismaClient();

/**
 * Initialize database schema
 * With Prisma, this is done via migrations: npx prisma migrate dev
 * But we can use this to check if connection is working
 */
export async function initializeDatabase() {
  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection successful');
    return { success: true };
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export { prisma };

/**
 * Creator operations
 */
export async function createCreator(
  channelId: string,
  channelName: string,
  reclaimProof?: string,
  tokenContractAddress?: string
) {
  try {
    const creator = await prisma.creator.upsert({
      where: { channelId },
      update: {
        channelName,
        reclaimProof: reclaimProof || undefined,
        tokenContractAddress: tokenContractAddress || undefined,
      },
      create: {
        channelId,
        channelName,
        reclaimProof,
        tokenContractAddress,
      },
    });
    return creator;
  } catch (error) {
    console.error('Error creating creator:', error);
    throw error;
  }
}

export async function updateCreatorTokenAddress(
  channelId: string,
  tokenContractAddress: string
) {
  try {
    const creator = await prisma.creator.update({
      where: { channelId },
      data: { tokenContractAddress },
    });
    return creator;
  } catch (error) {
    console.error('Error updating creator token address:', error);
    throw error;
  }
}

export async function getCreatorByChannelId(channelId: string) {
  try {
    const creator = await prisma.creator.findUnique({
      where: { channelId },
    });
    return creator || null;
  } catch (error) {
    console.error('Error getting creator by channel ID:', error);
    throw error;
  }
}

export async function getAllCreators() {
  try {
    const creators = await prisma.creator.findMany({
      orderBy: { registeredAt: 'desc' },
    });
    return creators;
  } catch (error) {
    console.error('Error getting all creators:', error);
    throw error;
  }
}

/**
 * Claim period operations
 */
export async function createClaimPeriod(
  creatorId: number,
  channelId: string,
  claimPeriodId: bigint,
  startTime: bigint,
  endTime: bigint,
  isOpen: boolean
) {
  try {
    const claimPeriod = await prisma.claimPeriod.create({
      data: {
        creatorId,
        channelId,
        claimPeriodId,
        startTime,
        endTime,
        isOpen,
      },
      include: { creator: true },
    });
    return claimPeriod;
  } catch (error) {
    console.error('Error creating claim period:', error);
    throw error;
  }
}

export async function updateClaimPeriod(
  claimPeriodId: bigint,
  isOpen: boolean
) {
  try {
    const claimPeriod = await prisma.claimPeriod.updateMany({
      where: { claimPeriodId },
      data: { isOpen, updatedAt: new Date() },
    });
    return claimPeriod;
  } catch (error) {
    console.error('Error updating claim period:', error);
    throw error;
  }
}

export async function getClaimPeriodsByCreator(creatorId: number) {
  try {
    const periods = await prisma.claimPeriod.findMany({
      where: { creatorId },
      include: { creator: true },
      orderBy: { createdAt: 'desc' },
    });
    return periods;
  } catch (error) {
    console.error('Error getting claim periods by creator:', error);
    throw error;
  }
}

export async function getAllClaimPeriods() {
  try {
    const periods = await prisma.claimPeriod.findMany({
      include: { creator: true },
      orderBy: { createdAt: 'desc' },
    });
    return periods;
  } catch (error) {
    console.error('Error getting all claim periods:', error);
    throw error;
  }
}

/**
 * Subscriber proof operations
 */
export async function createSubscriberProof(
  subscriberAddress: string,
  claimPeriodId: number,
  creatorId: number,
  proofSubmittedAt: Date
) {
  try {
    const proof = await prisma.subscriberProof.upsert({
      where: {
        subscriberAddress_claimPeriodId: {
          subscriberAddress: subscriberAddress.toLowerCase(),
          claimPeriodId,
        },
      },
      update: { updatedAt: new Date() },
      create: {
        subscriberAddress: subscriberAddress.toLowerCase(),
        claimPeriodId,
        creatorId,
        proofSubmittedAt,
        status: 'verified',
      },
      include: { claimPeriod: true, creator: true },
    });
    return proof;
  } catch (error) {
    console.error('Error creating subscriber proof:', error);
    throw error;
  }
}

export async function getSubscriberProofs(subscriberAddress: string) {
  try {
    const proofs = await prisma.subscriberProof.findMany({
      where: { subscriberAddress: subscriberAddress.toLowerCase() },
      include: { claimPeriod: { include: { creator: true } }, creator: true },
      orderBy: { claimPeriod: { createdAt: 'desc' } },
    });
    return proofs;
  } catch (error) {
    console.error('Error getting subscriber proofs:', error);
    throw error;
  }
}

export async function getProofsByClaimPeriod(claimPeriodId: number) {
  try {
    const proofs = await prisma.subscriberProof.findMany({
      where: { claimPeriodId },
      orderBy: { proofSubmittedAt: 'desc' },
    });
    return proofs;
  } catch (error) {
    console.error('Error getting proofs by claim period:', error);
    throw error;
  }
}

export async function checkIfProofExists(
  subscriberAddress: string,
  claimPeriodId: number
): Promise<boolean> {
  try {
    const proof = await prisma.subscriberProof.findUnique({
      where: {
        subscriberAddress_claimPeriodId: {
          subscriberAddress: subscriberAddress.toLowerCase(),
          claimPeriodId,
        },
      },
    });
    return proof !== null;
  } catch (error) {
    console.error('Error checking proof existence:', error);
    throw error;
  }
}

/**
 * Airdrop operations
 */
export async function createAirdrop(
  claimPeriodId: number,
  creatorId: number,
  totalTokenAmount: string,
  subscriberCount: number
) {
  try {
    const amountPerUser =
      subscriberCount > 0
        ? BigInt(totalTokenAmount) / BigInt(subscriberCount)
        : BigInt(0);

    const airdrop = await prisma.airdrop.create({
      data: {
        claimPeriodId,
        creatorId,
        totalTokenAmount: BigInt(totalTokenAmount),
        subscriberCount,
        amountPerUser,
        executedAt: new Date(),
      },
      include: { claimPeriod: { include: { creator: true } }, creator: true },
    });
    return airdrop;
  } catch (error) {
    console.error('Error creating airdrop:', error);
    throw error;
  }
}

export async function getAirdropByClaimPeriod(claimPeriodId: number) {
  try {
    const airdrop = await prisma.airdrop.findUnique({
      where: { claimPeriodId },
      include: { claimPeriod: { include: { creator: true } }, creator: true },
    });
    return airdrop || null;
  } catch (error) {
    console.error('Error getting airdrop:', error);
    throw error;
  }
}

export async function getAirdropsByCreator(creatorId: number) {
  try {
    const airdrops = await prisma.airdrop.findMany({
      where: { creatorId },
      include: { claimPeriod: { include: { creator: true } }, creator: true },
      orderBy: { executedAt: 'desc' },
    });
    return airdrops;
  } catch (error) {
    console.error('Error getting airdrops by creator:', error);
    throw error;
  }
}
