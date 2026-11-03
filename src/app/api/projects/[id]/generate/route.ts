import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import {
  getDb,
  projectProfiles,
  eccSyncs,
  eccComponents,
  harnessGenerations,
  generatedArtifacts,
} from '@/db';
import { AuthService, requireAuthUser } from '@/modules/auth';
import { SelectionEngine, CatalogCandidateInput } from '@/modules/selection-engine';
import { getBuiltinCuratedExcellenceComponents } from '@/modules/ecc-catalog/catalog-service';
import { HarnessBuilderService } from '@/modules/harness-builder';
import { LocalDiskStorage } from '@/modules/documents/storage';
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

    // 2. Récupération du catalogue ECC actif
    const [activeSync] = await db
      .select()
      .from(eccSyncs)
      .where(eq(eccSyncs.isActiveCatalog, true))
      .limit(1);

    const catalogCandidates: CatalogCandidateInput[] = [];
    let eccSyncId = activeSync?.id;

    if (activeSync) {
      const dbComponents = await db
        .select()
        .from(eccComponents)
        .where(eq(eccComponents.eccSyncId, activeSync.id));

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
    } else {
      // Si aucun sync n'est encore enregistré en DB, on crée un sync minimal
      const [dummySync] = await db
        .insert(eccSyncs)
        .values({
          commitSha: '25278e7d8050e82c5f94d9305ea6a0fceec3ea42',
          versionTag: 'v2.2.3',
          status: 'VALID',
          isActiveCatalog: true,
          componentCount: 0,
        })
        .returning();
      if (!dummySync) throw new Error('Échec d initialisation du catalogue ECC.');
      eccSyncId = dummySync.id;
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
    const harnessBuilder = new HarnessBuilderService();
    const builtPackage = await harnessBuilder.buildHarness(profile, selection, {
      eccCommitSha: activeSync?.commitSha ?? '25278e7d8050e82c5f94d9305ea6a0fceec3ea42',
      eccVersionTag: activeSync?.versionTag ?? 'v2.2.3',
      generatedAtIso: new Date().toISOString(),
    });

    // 5. Sauvegarde du fichier ZIP sur disque privé
    const storage = new LocalDiskStorage();
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
        eccSyncId: eccSyncId!,
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
        originStatus: 'ecc_adapted',
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
    const msg = err instanceof Error ? err.message : 'Erreur lors de la génération du harnais.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
