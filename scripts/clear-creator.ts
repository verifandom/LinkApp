import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const channelId = 'UCFMAzieriztdMf1aRkaSNwQ';

  console.log(`Deleting creator with channelId: ${channelId}`);

  const deleted = await prisma.creator.delete({
    where: { channelId },
  });

  console.log('Deleted:', deleted);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
