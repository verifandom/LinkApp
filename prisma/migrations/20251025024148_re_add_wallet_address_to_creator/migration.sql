/*
  Warnings:

  - Added the required column `walletAddress` to the `creators` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add column with default placeholder for existing rows
ALTER TABLE "creators" ADD COLUMN "walletAddress" VARCHAR(42) NOT NULL DEFAULT '0x0000000000000000000000000000000000000000';

-- Remove default constraint (new rows must provide walletAddress)
ALTER TABLE "creators" ALTER COLUMN "walletAddress" DROP DEFAULT;
