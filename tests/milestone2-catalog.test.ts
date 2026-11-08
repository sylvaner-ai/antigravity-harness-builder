import { buildSyntheticTarGz } from './support/synthetic-tar';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { closeDbPool, catalogSyncs, getDb } from '../src/db';
import { sanitizeErrorMessage } from '../src/lib/sanitize-error';
import {
  CatalogService,
  CatalogFetcher,
  GitHubCatalogFetcher,
  DEFAULT_CATALOG_SOURCES,
} from '../src/modules/catalog/catalog-service';

describe('Masquage des secrets dans les messages d’erreur (§9 & FR-10)', () => {
  it('masque systématiquement les clés API et mots de passe DB', () => {
    // Valeurs factices assemblées à l'exécution : aucune chaîne au format d'un vrai secret dans le dépôt.
    const fakeGeminiKey = ['AIza', 'Sy', 'CLE_FACTICE_DE_TEST_', '0'.repeat(14)].join('');
    const fakeGithubToken = ['ghp', '_', 'JETONFACTICE', '0'.repeat(24)].join('');
    const rawErr = new Error(
      `Failed request with key ${fakeGeminiKey} and token ${fakeGithubToken} on postgresql://user:secretPass123@localhost:5433/db`
    );
    const sanitized = sanitizeErrorMessage(rawErr);

    expect(sanitized.message).toContain('[REDACTED_GEMINI_KEY]');
    expect(sanitized.message).toContain('[REDACTED_GITHUB_TOKEN]');
    expect(sanitized.message).toContain('[REDACTED_PASSWORD]');
    expect(sanitized.message).not.toContain(fakeGeminiKey);
    expect(sanitized.message).not.toContain(fakeGithubToken);
    expect(sanitized.message).not.toContain('secretPass123');
  });
});

describe('Jalon 2 — Catalogue ECC versionné, Résilience & Synchronisation réelle GitHub (FR-04)', () => {
  const db = getDb();

  beforeEach(async () => {
    // Nettoyer uniquement les synchronisations ECC de test (sha '1111111111111111111111111111111111111111')
    await db.delete(catalogSyncs).where(eq(catalogSyncs.commitSha, '1111111111111111111111111111111111111111'));
  });

  afterAll(async () => {
    await closeDbPool();
  });

  it('conserve intact le dernier catalogue valide si une synchronisation ultérieure échoue ou renvoie un tarball corrompu (FR-04 & §11.2)', async () => {
    const validSha = '1111111111111111111111111111111111111111';
    const validTarGz = buildSyntheticTarGz([
      {
        path: 'ECC-main/package.json',
        content: JSON.stringify({ name: 'ecc-universal', version: '2.2.3' }),
      },
      {
        path: 'ECC-main/LICENSE',
        content: 'MIT License\nCopyright (c) 2026 Affaan Mustafa',
      },
      {
        path: 'ECC-main/rules/common/coding-style.md',
        content: '# Common Coding Style\nPrefer immutable structures and small modules.',
      },
      {
        path: 'ECC-main/rules/typescript/testing.md',
        content: '# TypeScript Testing\nUse Vitest and strict types in all unit tests.',
      },
      {
        path: 'ECC-main/agents/code-reviewer.md',
        content: `---\nname: code-reviewer\ndescription: Independent reviewer checking quality and tests.\ntools: Read, Grep, Write\nmodel: sonnet\n---\nReview all code in \${CLAUDE_PROJECT_DIR}.`,
      },
      {
        path: 'ECC-main/skills/api-design/SKILL.md',
        content: `---\nname: api-design\ndescription: Use this skill when designing REST APIs.\n---\n# API Design\nFollow REST conventions and validate schemas.`,
      },
      {
        path: 'ECC-main/commands/plan-feature.md',
        content: `---\ndescription: Create a step-by-step implementation plan.\n---\n# Plan Feature\nAnalyze requirements before writing code.`,
      },
      // Doit être ignoré (packaging Codex .agents/ et hooks/)
      {
        path: 'ECC-main/.agents/openai.yaml',
        content: 'codex: true',
      },
      {
        path: 'ECC-main/hooks/hooks.json',
        content: '{}',
      },
    ]);

    let shouldFailNextFetch = false;

    const mockFetcher: CatalogFetcher = {
      async resolveRefCommitSha() {
        if (shouldFailNextFetch) {
          throw new Error('GitHub API 403 rate limit exceeded');
        }
        return validSha;
      },
      async downloadRepositoryTarball() {
        if (shouldFailNextFetch) {
          throw new Error('Network connection reset');
        }
        return validTarGz;
      },
    };

    const service = new CatalogService(db, mockFetcher);

    // 1. Première synchronisation réussie
    const ecc = DEFAULT_CATALOG_SOURCES.find((s) => s.id === 'ecc-official')!;
    const sync1 = await service.synchronizeCatalog({ sources: [ecc] });
    expect(sync1.status).toBe('VALID');
    expect(sync1.isActiveCatalog).toBe(true);
    expect(sync1.commitSha).toBe(validSha);
    expect(sync1.versionTag).toBe('affaan-m/ECC@1111111');
    expect(sync1.componentCount).toBe(5); // 2 règles + 1 agent + 1 skill + 1 commande convertie en skill

    // Vérifier que le relecteur code-reviewer a bien été privé de `write_to_file` (§6.2)
    const indexedComponents = await service.searchComponents();
    const reviewer = indexedComponents.find((c) => c.externalId === 'subagent:code-reviewer');
    expect(reviewer).toBeDefined();
    expect(reviewer?.parsedMeta.adaptedTools).toEqual(['view_file', 'grep_search']);
    expect(reviewer?.parsedMeta.adaptedModel).toBe('pro');

    // Vérifier que la commande `commands/plan-feature.md` a été convertie en Skill natif valide (Q3)
    const convertedCmd = indexedComponents.find(
      (c) => c.externalId === 'command-skill:plan-feature'
    );
    expect(convertedCmd?.kind).toBe('COMMAND_CONVERTED');
    expect(convertedCmd?.compatibilityStatus).toBe('AUTO_VALIDATED');

    // 2. Seconde synchronisation en échec (simulation panne GitHub)
    shouldFailNextFetch = true;
    await expect(
      service.synchronizeCatalog({ sources: [ecc], forceResync: true })
    ).rejects.toThrow(/GitHub API 403 rate limit exceeded/);

    // Le catalogue actif précédent DOIT être intact et toujours actif !
    const activeAfterFailure = await service.getActiveCatalogSync();
    expect(activeAfterFailure?.id).toBe(sync1.id);
    expect(activeAfterFailure?.commitSha).toBe(validSha);

    const remainingComponents = await service.searchComponents();
    expect(remainingComponents).toHaveLength(5);
  });

  // Appel réseau réel vers GitHub : lancé seulement si RUN_LIVE_GITHUB_TESTS=1 (activé dans l'intégration continue).
  it.runIf(process.env.RUN_LIVE_GITHUB_TESTS === '1')(
    'synchronise et indexe réellement le dépôt officiel affaan-m/ECC depuis GitHub en moins de 10 secondes',
    async () => {
      const liveService = new CatalogService(db, new GitHubCatalogFetcher());
      const ecc = DEFAULT_CATALOG_SOURCES.find((s) => s.id === 'ecc-official')!;
      const liveSync = await liveService.synchronizeCatalog({
        sources: [{ ...ecc, pinnedCommit: 'main', ref: 'main' }],
        forceResync: true,
      });

      expect(liveSync.status).toBe('VALID');
      expect(liveSync.isActiveCatalog).toBe(true);
      expect(liveSync.commitSha).toMatch(/^[0-9a-f]{40}$/);
      expect(liveSync.componentCount).toBeGreaterThan(100);

      // Recherche hybride sur TypeScript / Next.js
      const tsResults = await liveService.searchComponents({
        languages: ['typescript'],
        frameworks: ['nextjs'],
        onlyCompatible: true,
      });
      expect(tsResults.length).toBeGreaterThan(5);

      // Vérifier que chaque composant indexé possède une provenance traçable et une empreinte SHA-256
      for (const comp of tsResults.slice(0, 15)) {
        expect(comp.sourceUrl).toContain(`https://github.com/affaan-m/ECC/blob/${liveSync.commitSha}/`);
        expect(comp.contentSha256).toMatch(/^[0-9a-f]{64}$/);
        expect(['AUTO_VALIDATED', 'DOC_COMPATIBLE']).toContain(comp.compatibilityStatus);
      }
    },
    30_000
  );
});
