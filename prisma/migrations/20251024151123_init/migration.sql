-- CreateTable
CREATE TABLE "creators" (
    "id" SERIAL NOT NULL,
    "walletAddress" VARCHAR(42) NOT NULL,
    "channelId" VARCHAR(255) NOT NULL,
    "channelName" VARCHAR(255) NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_periods" (
    "id" SERIAL NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "channelId" VARCHAR(255) NOT NULL,
    "claimPeriodId" BIGINT NOT NULL,
    "startTime" BIGINT NOT NULL,
    "endTime" BIGINT NOT NULL,
    "isOpen" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claim_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriber_proofs" (
    "id" SERIAL NOT NULL,
    "subscriberAddress" VARCHAR(42) NOT NULL,
    "claimPeriodId" INTEGER NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "proofSubmittedAt" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'verified',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriber_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airdrops" (
    "id" SERIAL NOT NULL,
    "claimPeriodId" INTEGER NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "totalTokenAmount" BIGINT NOT NULL,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "amountPerUser" BIGINT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "airdrops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creators_walletAddress_key" ON "creators"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "creators_channelId_key" ON "creators"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "claim_periods_claimPeriodId_key" ON "claim_periods"("claimPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriber_proofs_subscriberAddress_claimPeriodId_key" ON "subscriber_proofs"("subscriberAddress", "claimPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "airdrops_claimPeriodId_key" ON "airdrops"("claimPeriodId");

-- AddForeignKey
ALTER TABLE "claim_periods" ADD CONSTRAINT "claim_periods_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriber_proofs" ADD CONSTRAINT "subscriber_proofs_claimPeriodId_fkey" FOREIGN KEY ("claimPeriodId") REFERENCES "claim_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriber_proofs" ADD CONSTRAINT "subscriber_proofs_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airdrops" ADD CONSTRAINT "airdrops_claimPeriodId_fkey" FOREIGN KEY ("claimPeriodId") REFERENCES "claim_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airdrops" ADD CONSTRAINT "airdrops_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
