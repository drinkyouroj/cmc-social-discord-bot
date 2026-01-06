-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "registeredHandle" TEXT,
    "registeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingRegistration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedHandle" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildConfig" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "adminRoleId" TEXT,
    "maxPostAgeDays" INTEGER NOT NULL DEFAULT 7,
    "sentimentMinConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.65,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildAllowlistedUser" (
    "id" TEXT NOT NULL,
    "guildConfigId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildAllowlistedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "userId" TEXT,
    "postIdOrUrl" TEXT NOT NULL,
    "postStableId" TEXT,
    "postUrl" TEXT,
    "postOwnerHandle" TEXT,
    "postText" TEXT,
    "postTimeMs" BIGINT,
    "bullish" BOOLEAN,
    "llmLabel" TEXT,
    "llmConfidence" DOUBLE PRECISION,
    "llmLanguage" TEXT,
    "llmRawJson" JSONB,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "decisionReason" TEXT,
    "decidedByDiscordUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_discordUserId_key" ON "User"("discordUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PendingRegistration_code_key" ON "PendingRegistration"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GuildConfig_guildId_key" ON "GuildConfig"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildAllowlistedUser_guildConfigId_discordUserId_key" ON "GuildAllowlistedUser"("guildConfigId", "discordUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_postStableId_key" ON "Submission"("postStableId");

-- CreateIndex
CREATE INDEX "Submission_guildId_status_idx" ON "Submission"("guildId", "status");

-- CreateIndex
CREATE INDEX "Submission_discordUserId_idx" ON "Submission"("discordUserId");

-- AddForeignKey
ALTER TABLE "PendingRegistration" ADD CONSTRAINT "PendingRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildAllowlistedUser" ADD CONSTRAINT "GuildAllowlistedUser_guildConfigId_fkey" FOREIGN KEY ("guildConfigId") REFERENCES "GuildConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

