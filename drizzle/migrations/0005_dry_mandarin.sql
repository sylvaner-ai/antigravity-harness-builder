CREATE TABLE "catalog_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"pinned_commit" text NOT NULL,
	"license" text DEFAULT 'UNKNOWN' NOT NULL,
	"role" text DEFAULT 'SPECIALIST' NOT NULL,
	"priority" integer DEFAULT 70 NOT NULL,
	"category" text DEFAULT 'QUALITY' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"copyright_notice" text DEFAULT '' NOT NULL,
	"native_install" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"analysis" jsonb DEFAULT 'null'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ecc_syncs" ADD COLUMN "sources" jsonb DEFAULT '[]'::jsonb NOT NULL;