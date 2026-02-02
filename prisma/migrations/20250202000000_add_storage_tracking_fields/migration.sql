-- Add storage tracking fields for efficient quota checking
-- These fields are maintained atomically on document create/update/delete
-- to avoid expensive queries that fetch all documents

-- Add storageUsedBytes to user (cached total of all document sizes)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "storageUsedBytes" INTEGER NOT NULL DEFAULT 0;

-- Add sizeBytes to document (actual stored size after compression)
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "sizeBytes" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing document sizes
-- Note: This calculates size as length of content + length of editorState (as string)
-- For compressed documents, editorState is already a string
UPDATE "document"
SET "sizeBytes" = COALESCE(octet_length(content), 0) + COALESCE(octet_length(CAST("editorState" AS TEXT)), 0)
WHERE "sizeBytes" = 0;

-- Backfill user storage totals from their documents
UPDATE "user" u
SET "storageUsedBytes" = COALESCE((
  SELECT SUM(d."sizeBytes")
  FROM "document" d
  WHERE d."userId" = u.id
), 0);
