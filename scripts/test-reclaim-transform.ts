import { PrismaClient } from '@prisma/client';
import { transformForOnchain } from '@reclaimprotocol/js-sdk';

const prisma = new PrismaClient();

async function main() {
  const channelId = 'UCFMAzieriztdMf1aRkaSNwQ';

  const creator = await prisma.creator.findUnique({
    where: { channelId },
  });

  if (!creator?.reclaimProof) {
    console.error('No creator found or no proof');
    return;
  }

  const storedProof = JSON.parse(creator.reclaimProof);
  console.log('=== STORED PROOF (what we save in DB) ===');
  console.log(JSON.stringify(storedProof, null, 2));

  console.log('\n=== CHECKING STRUCTURE ===');
  console.log('Has claimInfo?', !!storedProof.claimInfo);
  console.log('Has signedClaim?', !!storedProof.signedClaim);
  console.log('claimInfo structure:', storedProof.claimInfo);
  console.log('signedClaim structure:', storedProof.signedClaim);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
