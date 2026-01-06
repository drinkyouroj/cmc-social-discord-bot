-- AlterTable
ALTER TABLE "Submission"
ADD COLUMN     "pointsAwarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pointsAmount" INTEGER,
ADD COLUMN     "pointsCurrency" TEXT,
ADD COLUMN     "pointsAwardedByDiscordUserId" TEXT,
ADD COLUMN     "pointsAwardedAt" TIMESTAMP(3),
ADD COLUMN     "pointsNote" TEXT;

-- CreateIndex
CREATE INDEX "Submission_guildId_pointsAwarded_idx" ON "Submission"("guildId", "pointsAwarded");

