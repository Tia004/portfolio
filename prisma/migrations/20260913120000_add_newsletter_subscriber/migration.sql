-- Newsletter subscribers (public double opt-in form).
-- `email` is unique so a second signup with the same address updates the
-- existing row instead of creating a duplicate; `confirmToken` is nullable and
-- cleared after use, while `unsubscribeToken` persists for campaign opt-outs.

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "locale" TEXT NOT NULL DEFAULT 'it',
    "source" TEXT NOT NULL DEFAULT 'website',
    "consentText" TEXT,
    "consentAt" DATETIME,
    "confirmToken" TEXT,
    "unsubscribeToken" TEXT NOT NULL,
    "confirmedAt" DATETIME,
    "unsubscribedAt" DATETIME,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "lastEmailAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_confirmToken_key" ON "NewsletterSubscriber"("confirmToken");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeToken_key" ON "NewsletterSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_status_createdAt_idx" ON "NewsletterSubscriber"("status", "createdAt");
