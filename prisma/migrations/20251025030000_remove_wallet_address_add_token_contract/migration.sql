-- AlterTable
ALTER TABLE "creators" DROP COLUMN "walletAddress";

-- AlterTable
ALTER TABLE "creators" ADD COLUMN "tokenContractAddress" VARCHAR(42);

-- AlterTable
ALTER TABLE "creators" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
