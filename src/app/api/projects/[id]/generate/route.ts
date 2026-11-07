import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import {
  getDb,
  projectProfiles,
  catalogSyncs,
  catalogComponents,
  harnessGenerations,
  generatedArtifacts,
  sourceDocuments,
} from '@/db';
import { AuthService, requireAuthUser } from '@/modules/auth';
import { SelectionEngine, CatalogCandidateInput } from '@/modules/selection-engine';
import { getBuiltinCuratedExcellenceComponents } from '@/modules/catalog/catalog-service';
import { HarnessBuilderService } from '@/modules/harness-builder';
import { LocalDiskStorage } from '@/modules/documents/storage';
import { ensureDocumentDigests } from '@/modules/documents/document-digest';
import { ZodError } from 'zod';
import { PresetMode } from '@/modules/selection-engine/schema';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const user = await requireAuthUser(req);
    const auth = new AuthService();
    await auth.assertProjectOwnership(projectId, user.userId);

    const db = getDb();
    const body = await req.json().catch(() => ({}));
    const presetMode: PresetMode = body.presetMode || 'BALANCED';
    const userIncludes: string[] = body.userIncludes || [];
    const userExcludes: string[] = body.userExcludes || [];
    const excellencePacks = body.excellencePacks;

    // 1. Récupération du dernier profil validé
    const [latestProfileRecord] = await db
      .select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, projectId))
      .orderBy(desc(projectProfiles.version));

    if (!latestProfileRecord) {
      return NextResponse.json(
        { error: 'Aucun profil de projet validé n est disponible pour ce projet.' },
        { status: 400 }
      );
    }
    const profile = latestProfileRecord.profileData;

    // 2. Catalogue en service : sans lui, aucune génération (pas de catalogue factice)
    const [activeSync] = await db
      .select()
      .from(catalogSyncs)
      .where(eq(catalogSyncs.isActiveCatalog, true))
      .limit(1);
    if (!activeSync) {
      return NextResponse.json(
        { error: 'Aucun catalogue en service : ouvrez la page Catalogue et cliquez sur « Reconstruire le catalogue ».' },
        { status: 409 }
      );
    }

    const catalogCandidates: CatalogCandidateInput[] = [];
    const catalogSyncId = activeSync.id;

    const dbComponents = await db
      .select()
      .from(catalogComponents)
      .where(eq(catalogComponents.catalogSyncId, activeSync.id));

    for (const comp of dbComponents) {
      catalogCandidates.push({
        slug: comp.slug,
        name: comp.name,
        kind: comp.kind,
        description: comp.description,
        sourceRelativePath: comp.sourceRelativePath,
        sourceUrl: comp.sourceUrl,
        license: comp.license,
        adaptedContent: comp.adaptedContent,
        parsedMeta: comp.parsedMeta,
        compatibilityStatus: comp.compatibilityStatus,
        compatibilityIssues: comp.compatibilityIssues,
        searchText: comp.searchText,
      });
    }

    // 2b. Enrichissement systématique avec les composants d'excellence pré-packagés
    const curatedExcellence = getBuiltinCuratedExcellenceComponents();
    for (const comp of curatedExcellence) {
      if (!catalogCandidates.some((c) => c.slug === comp.slug)) {
        catalogCandidates.push(comp);
      }
    }

    // 3. Exécution du moteur de sélection explicable
    const selectionEngine = new SelectionEngine();
    const selection = selectionEngine.selectComponents(profile, catalogCandidates, {
      presetMode,
      userIncludes,
      userExcludes,
      excellencePacks,
    });

    // 4. Construction déterministe du harnais
    // Documents d'entrée réels du projet (nom, taille et empreinte enregistrés à l'import) pour le manifeste
    const projectDocuments = await db
      .select()
      .from(sourceDocuments)
      .where(eq(sourceDocuments.projectId, projectId));
    const storage = new LocalDiskStorage();
    const verifiedDocuments = await ensureDocumentDigests(db, projectDocuments, storage);
    const inputDocuments = verifiedDocuments.map((d) => ({
      documentId: d.id,
      role: d.role,
      fileName: d.originalName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      sha256: d.sha256Hash,
    }));

    const harnessBuilder = new HarnessBuilderService();
    const builtPackage = await harnessBuilder.buildHarness(profile, selection, {
      ...(inputDocuments.length > 0 ? { inputDocuments } : {}),
      catalog: { versionTag: activeSync.versionTag, sources: activeSync.sources },
      generatedAtIso: new Date().toISOString(),
    });

    // 5. Sauvegarde du fichier ZIP sur disque privé
    const storageRes = await storage.saveFile(
      projectId,
      `${builtPackage.packageRootName}.zip`,
      builtPackage.zipBuffer
    );
    const zipStoragePath = storageRes.relativePath;

    // 6. Enregistrement en base de la génération
    const [generation] = await db
      .insert(harnessGenerations)
      .values({
        projectId,
        projectProfileId: latestProfileRecord.id,
        catalogSyncId: catalogSyncId!,
        status: 'COMPLETED',
        presetMode,
        selectionState: selection as unknown as Record<string, unknown>,
        orchestrationPlan: { plan: 'docs/ORCHESTRATION.md' },
        validationReport: builtPackage.manifest.validationSummary as any,
        manifestData: builtPackage.manifest as any,
        zipStoragePath,
        zipSha256: builtPackage.zipSha256,
        completedAt: new Date(),
      })
      .returning();

    if (!generation) {
      throw new Error('Échec de l enregistrement de la génération.');
    }

    // 7. Enregistrement des artefacts générés pour prévisualisation rapide
    for (const file of builtPackage.files) {
      const artifactType =
        file.relativePath === 'START_HERE.md'
          ? 'START_HERE'
          : file.relativePath === 'AGENTS.md'
            ? 'AGENTS_MD'
            : file.relativePath.startsWith('.agents/rules/')
              ? 'RULE'
              : file.relativePath.startsWith('.agents/skills/')
                ? 'SKILL'
                : file.relativePath.startsWith('.agents/agents/')
                  ? 'SUBAGENT'
                  : file.relativePath.endsWith('manifest.json')
                    ? 'MANIFEST'
                    : 'DOC';

      await db.insert(generatedArtifacts).values({
        generationId: generation.id,
        relativePath: file.relativePath,
        artifactType,
        originStatus: 'source_adapted',
        content: file.content,
        sizeBytes: file.sizeBytes,
        sha256Hash: file.sha256,
        validationTier: 'AUTO_VALIDATED',
      });
    }

    return NextResponse.json({
      generationId: generation.id,
      packageRootName: builtPackage.packageRootName,
      manifest: builtPackage.manifest,
      zipSha256: builtPackage.zipSha256,
      files: builtPackage.files.map((f: { relativePath: string; sizeBytes: number; sha256: string }) => ({
        relativePath: f.relativePath,
        sizeBytes: f.sizeBytes,
        sha256: f.sha256,
      })),
      selection,
    });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      // Message lisible : champ en cause et valeur attendue, sans le détail technique de validation.
      const details = err.issues
        .slice(0, 3)
        .map((i) => `${i.path.map((p) => (typeof p === 'number' ? `n°${p + 1}` : String(p))).join(' › ')} : ${i.message}`)
        .join(' ; ');
      return NextResponse.json({ error: `Harnais non conforme — ${details}.` }, { status: 500 });
    }
    const msg = err instanceof Error ? err.message : 'Erreur lors de la génération du harnais.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
