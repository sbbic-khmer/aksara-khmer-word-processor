-- Better Auth now owns the password-reset and email-verification token flows
-- (storing tokens in its own `verification` table). Drop our custom tables.

DROP TABLE IF EXISTS "email_verification_token";
DROP TABLE IF EXISTS "password_reset_token";

-- Backfill: enabling `requireEmailVerification` would lock out every existing
-- user whose `emailVerified` is still false. Mark every user created before
-- this migration as verified so the toggle only applies to new signups.
UPDATE "user" SET "emailVerified" = true WHERE "emailVerified" = false;
