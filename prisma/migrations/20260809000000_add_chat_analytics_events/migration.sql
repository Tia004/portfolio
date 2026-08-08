-- Add ChatMessage and AnalyticsEvent tables and align AvailabilitySetting
-- with the current schema (generated via `prisma migrate diff`).

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "data" TEXT,
    "timestamp" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AvailabilitySetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AvailabilitySetting" ("id", "isOnline", "updatedAt") SELECT "id", "isOnline", "updatedAt" FROM "AvailabilitySetting";
DROP TABLE "AvailabilitySetting";
ALTER TABLE "new_AvailabilitySetting" RENAME TO "AvailabilitySetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_timestamp_idx" ON "ChatMessage"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_timestamp_idx" ON "AnalyticsEvent"("type", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_timestamp_idx" ON "AnalyticsEvent"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_timestamp_idx" ON "AnalyticsEvent"("timestamp");
