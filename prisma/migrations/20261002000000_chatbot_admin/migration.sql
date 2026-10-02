CREATE TABLE "AiChatMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AiChatMessage_sessionId_createdAt_idx" ON "AiChatMessage"("sessionId", "createdAt");
CREATE INDEX "AiChatMessage_createdAt_idx" ON "AiChatMessage"("createdAt");

CREATE TABLE "ChatbotConfig" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "customRules" TEXT NOT NULL DEFAULT '',
  "nvidiaKeyEncrypted" TEXT,
  "geminiKeyEncrypted" TEXT,
  "nvidiaModel" TEXT NOT NULL DEFAULT 'openai/gpt-oss-20b',
  "geminiModel" TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
