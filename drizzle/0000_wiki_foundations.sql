CREATE TABLE IF NOT EXISTS "page_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "page_id" uuid NOT NULL REFERENCES "pages"("id") ON DELETE cascade,
  "title" varchar(1000) NOT NULL,
  "content" jsonb DEFAULT '[]'::jsonb,
  "content_text" text,
  "created_by" text NOT NULL REFERENCES "users"("id") ON DELETE restrict,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "page_slug_aliases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "page_id" uuid NOT NULL REFERENCES "pages"("id") ON DELETE cascade,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "old_slug" varchar(1000) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_page_favorites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "page_id" uuid NOT NULL REFERENCES "pages"("id") ON DELETE cascade,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "page_views" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "page_id" uuid NOT NULL REFERENCES "pages"("id") ON DELETE cascade,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "viewed_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "page_slug_aliases_workspace_old_slug_idx"
  ON "page_slug_aliases" ("workspace_id", "old_slug");

CREATE UNIQUE INDEX IF NOT EXISTS "user_page_favorites_user_page_idx"
  ON "user_page_favorites" ("user_id", "page_id");

CREATE INDEX IF NOT EXISTS "page_revisions_page_created_idx"
  ON "page_revisions" ("page_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "page_views_user_workspace_viewed_idx"
  ON "page_views" ("user_id", "workspace_id", "viewed_at" DESC);

ALTER TABLE "pages"
  ADD COLUMN IF NOT EXISTS "is_explicitly_private" boolean DEFAULT false NOT NULL;

ALTER TABLE "pages"
  ADD COLUMN IF NOT EXISTS "content_tsv" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce("content_text", '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS "pages_content_tsv_idx"
  ON "pages" USING gin ("content_tsv");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pages_parent_id_fk'
  ) THEN
    ALTER TABLE "pages"
      ADD CONSTRAINT "pages_parent_id_fk"
      FOREIGN KEY ("parent_id") REFERENCES "pages"("id") ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_workspace_user_unique'
  ) THEN
    ALTER TABLE "workspace_members"
      ADD CONSTRAINT "workspace_members_workspace_user_unique"
      UNIQUE ("workspace_id", "user_id");
  END IF;
END $$;
