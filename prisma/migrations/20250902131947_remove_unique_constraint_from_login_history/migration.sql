-- DropIndex
DROP INDEX "public"."login_history_userId_key";

-- CreateIndex
CREATE INDEX "login_history_lastSignInAt_idx" ON "public"."login_history"("lastSignInAt");
