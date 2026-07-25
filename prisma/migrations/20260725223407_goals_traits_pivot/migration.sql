/*
  Warnings:

  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `taskId` on the `CheckIn` table. All the data in the column will be lost.
  - You are about to drop the column `taskId` on the `PointsLedger` table. All the data in the column will be lost.
  - Added the required column `feeling` to the `CheckIn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `goalId` to the `CheckIn` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Task_userId_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastStreakAt" DATETIME;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Task";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME NOT NULL,
    "checkInFrequency" TEXT NOT NULL DEFAULT 'daily',
    "penaltyPoints" INTEGER NOT NULL DEFAULT 20,
    "lastCheckInAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserTraits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "habitToImprove" TEXT,
    "newHabitGoal" TEXT,
    "visionBoardImageUrl" TEXT,
    "visionBoardThemes" TEXT,
    "communicationStyle" TEXT NOT NULL DEFAULT 'encouraging',
    "motivationStyle" TEXT NOT NULL DEFAULT 'support',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserTraits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MoodCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MoodCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "feeling" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "verdictMessage" TEXT NOT NULL DEFAULT '',
    "multiplier" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CheckIn_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CheckIn" ("answers", "createdAt", "id", "multiplier", "verdict") SELECT "answers", "createdAt", "id", "multiplier", "verdict" FROM "CheckIn";
DROP TABLE "CheckIn";
ALTER TABLE "new_CheckIn" RENAME TO "CheckIn";
CREATE INDEX "CheckIn_goalId_idx" ON "CheckIn"("goalId");
CREATE TABLE "new_PointsLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "goalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointsLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PointsLedger" ("amount", "createdAt", "id", "reason", "userId") SELECT "amount", "createdAt", "id", "reason", "userId" FROM "PointsLedger";
DROP TABLE "PointsLedger";
ALTER TABLE "new_PointsLedger" RENAME TO "PointsLedger";
CREATE INDEX "PointsLedger_userId_idx" ON "PointsLedger"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTraits_userId_key" ON "UserTraits"("userId");

-- CreateIndex
CREATE INDEX "MoodCheckIn_userId_createdAt_idx" ON "MoodCheckIn"("userId", "createdAt");
