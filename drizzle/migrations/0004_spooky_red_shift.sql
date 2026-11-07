CREATE TABLE "install_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "install_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "install_links" ADD CONSTRAINT "install_links_generation_id_harness_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."harness_generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "install_links_expires_at_idx" ON "install_links" USING btree ("expires_at");