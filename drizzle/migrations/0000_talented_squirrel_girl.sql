CREATE TABLE "ecc_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ecc_sync_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"slug" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"source_relative_path" text NOT NULL,
	"source_url" text NOT NULL,
	"license" text DEFAULT 'MIT' NOT NULL,
	"content_sha256" text NOT NULL,
	"raw_content" text NOT NULL,
	"adapted_content" text NOT NULL,
	"parsed_meta" jsonb NOT NULL,
	"compatibility_status" text NOT NULL,
	"compatibility_issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"search_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ecc_syncs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commit_sha" text NOT NULL,
	"version_tag" text NOT NULL,
	"status" text DEFAULT 'IN_PROGRESS' NOT NULL,
	"is_active_catalog" boolean DEFAULT false NOT NULL,
	"component_count" integer DEFAULT 0 NOT NULL,
	"catalog_sha256" text DEFAULT '' NOT NULL,
	"error_details" jsonb DEFAULT 'null'::jsonb,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" uuid NOT NULL,
	"relative_path" text NOT NULL,
	"artifact_type" text NOT NULL,
	"origin_status" text NOT NULL,
	"source_ecc_component_id" uuid,
	"content" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256_hash" text NOT NULL,
	"validation_tier" text NOT NULL,
	"validation_issues" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "harness_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"project_profile_id" uuid NOT NULL,
	"ecc_sync_id" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"preset_mode" text DEFAULT 'BALANCED' NOT NULL,
	"selection_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"orchestration_plan" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"validation_report" jsonb DEFAULT 'null'::jsonb,
	"manifest_data" jsonb DEFAULT 'null'::jsonb,
	"zip_storage_path" text,
	"zip_sha256" text,
	"llm_tokens_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"generation_id" uuid,
	"type" text NOT NULL,
	"status" text DEFAULT 'QUEUED' NOT NULL,
	"current_step" text DEFAULT 'INITIALIZED' NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"checkpoint_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"safe_error" jsonb DEFAULT 'null'::jsonb,
	"locked_at" timestamp with time zone,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'DRAFT_EXTRACTED' NOT NULL,
	"profile_data" jsonb NOT NULL,
	"user_notes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"profile_sha256" text NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"target_surface" text DEFAULT 'IDE' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"role" text NOT NULL,
	"original_name" text NOT NULL,
	"safe_storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256_hash" text NOT NULL,
	"extraction_status" text DEFAULT 'PENDING' NOT NULL,
	"extracted_text" text,
	"extraction_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'USER' NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ecc_components" ADD CONSTRAINT "ecc_components_ecc_sync_id_ecc_syncs_id_fk" FOREIGN KEY ("ecc_sync_id") REFERENCES "public"."ecc_syncs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_artifacts" ADD CONSTRAINT "generated_artifacts_generation_id_harness_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."harness_generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_artifacts" ADD CONSTRAINT "generated_artifacts_source_ecc_component_id_ecc_components_id_fk" FOREIGN KEY ("source_ecc_component_id") REFERENCES "public"."ecc_components"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harness_generations" ADD CONSTRAINT "harness_generations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harness_generations" ADD CONSTRAINT "harness_generations_project_profile_id_project_profiles_id_fk" FOREIGN KEY ("project_profile_id") REFERENCES "public"."project_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harness_generations" ADD CONSTRAINT "harness_generations_ecc_sync_id_ecc_syncs_id_fk" FOREIGN KEY ("ecc_sync_id") REFERENCES "public"."ecc_syncs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_generation_id_harness_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."harness_generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_profiles" ADD CONSTRAINT "project_profiles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ecc_components_sync_external_idx" ON "ecc_components" USING btree ("ecc_sync_id","external_id");--> statement-breakpoint
CREATE INDEX "ecc_components_sync_kind_idx" ON "ecc_components" USING btree ("ecc_sync_id","kind");--> statement-breakpoint
CREATE INDEX "ecc_syncs_active_idx" ON "ecc_syncs" USING btree ("is_active_catalog");--> statement-breakpoint
CREATE INDEX "generated_artifacts_generation_id_idx" ON "generated_artifacts" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "harness_generations_project_id_idx" ON "harness_generations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "jobs_status_run_after_idx" ON "jobs" USING btree ("status","run_after");--> statement-breakpoint
CREATE INDEX "project_profiles_project_id_idx" ON "project_profiles" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "source_documents_project_id_idx" ON "source_documents" USING btree ("project_id");