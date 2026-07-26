-- Band Goal Room is layered on top of the Goal/CheckIn pivot migration.
-- It intentionally does not recreate Goal, CheckIn, User, or PointsLedger.

ALTER TABLE "Goal" ADD COLUMN "bandRoomId" TEXT;

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

CREATE TABLE "Reflection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "checkInId" TEXT,
    "kind" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "insights" TEXT NOT NULL,
    "nextFocus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reflection_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reflection_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "CoachSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT,
    "sessionId" TEXT NOT NULL,
    "approach" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoachSession_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Goal_bandRoomId_key" ON "Goal"("bandRoomId");
CREATE UNIQUE INDEX "GoalRoomEvent_idempotencyKey_key" ON "GoalRoomEvent"("idempotencyKey");
CREATE INDEX "GoalRoomEvent_goalId_occurredAt_idx" ON "GoalRoomEvent"("goalId", "occurredAt");
CREATE UNIQUE INDEX "Reflection_checkInId_key" ON "Reflection"("checkInId");
CREATE INDEX "Reflection_goalId_kind_idx" ON "Reflection"("goalId", "kind");
CREATE UNIQUE INDEX "CoachSession_sessionId_key" ON "CoachSession"("sessionId");
