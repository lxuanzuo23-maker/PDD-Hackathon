-- AlterTable
ALTER TABLE "PointsLedger" ADD COLUMN "goalId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastStreakAt" DATETIME;

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "cadence" TEXT NOT NULL DEFAULT 'daily',
    "status" TEXT NOT NULL DEFAULT 'active',
    "bandRoomId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoalCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "checkInDate" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "verdictMessage" TEXT NOT NULL,
    "multiplier" REAL NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "mood" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoalCheckIn_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoalRoomEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoalRoomEvent_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reflection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "checkInId" TEXT,
    "kind" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "insights" TEXT NOT NULL,
    "nextFocus" TEXT,
    "bandEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reflection_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reflection_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "GoalCheckIn" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT,
    "sessionId" TEXT NOT NULL,
    "approach" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoachSession_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Goal_bandRoomId_key" ON "Goal"("bandRoomId");

-- CreateIndex
CREATE INDEX "Goal_userId_status_idx" ON "Goal"("userId", "status");

-- CreateIndex
CREATE INDEX "GoalCheckIn_goalId_idx" ON "GoalCheckIn"("goalId");

-- CreateIndex
CREATE UNIQUE INDEX "GoalCheckIn_goalId_checkInDate_key" ON "GoalCheckIn"("goalId", "checkInDate");

-- CreateIndex
CREATE UNIQUE INDEX "GoalRoomEvent_idempotencyKey_key" ON "GoalRoomEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GoalRoomEvent_goalId_occurredAt_idx" ON "GoalRoomEvent"("goalId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reflection_checkInId_key" ON "Reflection"("checkInId");

-- CreateIndex
CREATE UNIQUE INDEX "Reflection_bandEventId_key" ON "Reflection"("bandEventId");

-- CreateIndex
CREATE INDEX "Reflection_goalId_kind_idx" ON "Reflection"("goalId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "CoachSession_sessionId_key" ON "CoachSession"("sessionId");

-- CreateIndex
CREATE INDEX "PointsLedger_goalId_idx" ON "PointsLedger"("goalId");
