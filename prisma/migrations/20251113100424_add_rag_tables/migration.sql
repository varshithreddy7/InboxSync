-- CreateTable
CREATE TABLE "TrainingData" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "emailBody" TEXT NOT NULL,
    "suggestedReply" TEXT NOT NULL,
    "embedding" vector(1536),
    "account" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuggestedReply" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "reply" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuggestedReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingData_account_idx" ON "TrainingData"("account");

-- CreateIndex
CREATE INDEX "SuggestedReply_emailId_idx" ON "SuggestedReply"("emailId");
