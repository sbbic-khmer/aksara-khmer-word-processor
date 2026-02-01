-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storageLimitBytes" BIGINT NOT NULL DEFAULT 5242880,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "showAds" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled',
    "content" TEXT NOT NULL DEFAULT '',
    "editorState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vadSilenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "vadThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "preferredMicDeviceId" TEXT,
    "showBreaks" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_dictionary_word" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 50000,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_dictionary_word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_ignored_dictionary_word" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_ignored_dictionary_word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spell_check_added_word" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spell_check_added_word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spell_check_ignored_word" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spell_check_ignored_word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_replacement" (
    "id" TEXT NOT NULL,
    "incorrectWord" TEXT NOT NULL,
    "correctWord" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "promotedFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_replacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_replacement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "incorrectWord" TEXT NOT NULL,
    "correctWord" TEXT NOT NULL,
    "notes" TEXT,
    "promotedToMaster" BOOLEAN NOT NULL DEFAULT false,
    "promotedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_replacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "document_userId_idx" ON "document"("userId");

-- CreateIndex
CREATE INDEX "document_updatedAt_idx" ON "document"("updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_preference_userId_key" ON "user_preference"("userId");

-- CreateIndex
CREATE INDEX "user_dictionary_word_userId_idx" ON "user_dictionary_word"("userId");

-- CreateIndex
CREATE INDEX "user_dictionary_word_word_idx" ON "user_dictionary_word"("word");

-- CreateIndex
CREATE UNIQUE INDEX "user_dictionary_word_userId_word_key" ON "user_dictionary_word"("userId", "word");

-- CreateIndex
CREATE INDEX "user_ignored_dictionary_word_userId_idx" ON "user_ignored_dictionary_word"("userId");

-- CreateIndex
CREATE INDEX "user_ignored_dictionary_word_word_idx" ON "user_ignored_dictionary_word"("word");

-- CreateIndex
CREATE UNIQUE INDEX "user_ignored_dictionary_word_userId_word_key" ON "user_ignored_dictionary_word"("userId", "word");

-- CreateIndex
CREATE INDEX "spell_check_added_word_userId_idx" ON "spell_check_added_word"("userId");

-- CreateIndex
CREATE INDEX "spell_check_added_word_word_idx" ON "spell_check_added_word"("word");

-- CreateIndex
CREATE UNIQUE INDEX "spell_check_added_word_userId_word_key" ON "spell_check_added_word"("userId", "word");

-- CreateIndex
CREATE INDEX "spell_check_ignored_word_userId_idx" ON "spell_check_ignored_word"("userId");

-- CreateIndex
CREATE INDEX "spell_check_ignored_word_word_idx" ON "spell_check_ignored_word"("word");

-- CreateIndex
CREATE UNIQUE INDEX "spell_check_ignored_word_userId_word_key" ON "spell_check_ignored_word"("userId", "word");

-- CreateIndex
CREATE UNIQUE INDEX "master_replacement_incorrectWord_key" ON "master_replacement"("incorrectWord");

-- CreateIndex
CREATE INDEX "master_replacement_incorrectWord_idx" ON "master_replacement"("incorrectWord");

-- CreateIndex
CREATE INDEX "user_replacement_userId_idx" ON "user_replacement"("userId");

-- CreateIndex
CREATE INDEX "user_replacement_incorrectWord_idx" ON "user_replacement"("incorrectWord");

-- CreateIndex
CREATE UNIQUE INDEX "user_replacement_userId_incorrectWord_key" ON "user_replacement"("userId", "incorrectWord");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_dictionary_word" ADD CONSTRAINT "user_dictionary_word_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ignored_dictionary_word" ADD CONSTRAINT "user_ignored_dictionary_word_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spell_check_added_word" ADD CONSTRAINT "spell_check_added_word_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spell_check_ignored_word" ADD CONSTRAINT "spell_check_ignored_word_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_replacement" ADD CONSTRAINT "master_replacement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_replacement" ADD CONSTRAINT "user_replacement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
