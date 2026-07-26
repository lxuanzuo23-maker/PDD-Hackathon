-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RewardItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '⭐',
    "themeKey" TEXT
);
INSERT INTO "new_RewardItem" ("cost", "description", "id", "kind", "name") SELECT "cost", "description", "id", "kind", "name" FROM "RewardItem";
DROP TABLE "RewardItem";
ALTER TABLE "new_RewardItem" RENAME TO "RewardItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
