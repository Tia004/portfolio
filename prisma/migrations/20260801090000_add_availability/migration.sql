-- CreateTable
CREATE TABLE "AvailabilitySetting" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
