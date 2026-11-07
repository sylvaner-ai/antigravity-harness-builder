-- Noms neutres : le catalogue est multi-sources, il n'est plus propre à ECC.
ALTER TABLE "ecc_syncs" RENAME TO "catalog_syncs";--> statement-breakpoint
ALTER TABLE "ecc_components" RENAME TO "catalog_components";--> statement-breakpoint
ALTER TABLE "catalog_components" RENAME COLUMN "ecc_sync_id" TO "catalog_sync_id";--> statement-breakpoint
ALTER TABLE "harness_generations" RENAME COLUMN "ecc_sync_id" TO "catalog_sync_id";--> statement-breakpoint
ALTER TABLE "generated_artifacts" RENAME COLUMN "source_ecc_component_id" TO "source_component_id";--> statement-breakpoint
ALTER TABLE "catalog_syncs" RENAME CONSTRAINT "ecc_syncs_pkey" TO "catalog_syncs_pkey";--> statement-breakpoint
ALTER TABLE "catalog_components" RENAME CONSTRAINT "ecc_components_pkey" TO "catalog_components_pkey";--> statement-breakpoint
ALTER TABLE "catalog_components" RENAME CONSTRAINT "ecc_components_ecc_sync_id_ecc_syncs_id_fk" TO "catalog_components_catalog_sync_id_catalog_syncs_id_fk";--> statement-breakpoint
ALTER TABLE "harness_generations" RENAME CONSTRAINT "harness_generations_ecc_sync_id_ecc_syncs_id_fk" TO "harness_generations_catalog_sync_id_catalog_syncs_id_fk";--> statement-breakpoint
ALTER TABLE "generated_artifacts" RENAME CONSTRAINT "generated_artifacts_source_ecc_component_id_ecc_components_id_fk" TO "generated_artifacts_source_component_id_catalog_components_id_fk";--> statement-breakpoint
ALTER INDEX "ecc_components_sync_external_idx" RENAME TO "catalog_components_sync_external_idx";--> statement-breakpoint
ALTER INDEX "ecc_components_sync_kind_idx" RENAME TO "catalog_components_sync_kind_idx";--> statement-breakpoint
ALTER INDEX "ecc_syncs_active_idx" RENAME TO "catalog_syncs_active_idx";--> statement-breakpoint
-- Statuts d'origine : un composant peut venir de n'importe quelle source du catalogue.
UPDATE "generated_artifacts" SET "origin_status" = 'source_adapted' WHERE "origin_status" = 'ecc_adapted';--> statement-breakpoint
UPDATE "generated_artifacts" SET "origin_status" = 'source_verbatim' WHERE "origin_status" = 'ecc_verbatim';
