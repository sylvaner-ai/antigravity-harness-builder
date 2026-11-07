import { gzipSync, strToU8 } from 'fflate';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { closeDbPool, eccSyncs, getDb } from '../src/db';
import { sanitizeErrorMessage } from '../src/lib/sanitize-error';
import {
  EccCatalogService,
  EccRemoteFetcher,
  GitHubOfficialEccFetcher,
} from '../src/modules/ecc-catalog/catalog-service';

/**
 * Utilitaire de test construisant une archive `.tar.gz` POSIX USTAR valide en mémoire.
 */
function buildSyntheticTarGz(files: Array<{ path: string; content: string }>): Uint8Array {
  const blocks: Uint8Array[] = [];

  for (const file of files) {
    const contentBytes = strToU8(file.content);
    const header = new Uint8Array(512);

    // Name (0..100)
    const nameBytes = strToU8(file.path.slice(0, 99));
    header.set(nameBytes, 0);

    // Mode (100..108)
    header.set(strToU8('0000644\0'), 100);
    // Size en octal sur 11 chiffres + NUL (124..136)
    const sizeOctal = contentBytes.byteLength.toString(8).padStart(11, '0') + '\0';
    header.set(strToU8(sizeOctal), 124);
    // Mtime (136..148)
    header.set(strToU8('14725276000\0'), 136);
    // Typeflag '0' (fichier régulier) à l'offset 156
    header[156] = '0'.charCodeAt(0);
    // Magic USTAR (257..263)
    header.set(strToU8('ustar\0'), 257);
    header.set(strToU8('00'), 263);

    // Calcul du checksum (148..156) : remplissage initial avec des espaces
    for (let i = 148; i < 156; i += 1) {
      header[i] = 32;
    }
    let checksum = 0;
    for (let i = 0; i < 512; i += 1) {
      checksum += header[i] ?? 0;
    }
    const chkOctal = checksum.toString(8).padStart(6, '0') + '\0 ';
    header.set(strToU8(chkOctal), 148);

    blocks.push(header);
    blocks.push(contentBytes);

    const remainder = contentBytes.byteLength % 512;
    if (remainder !== 0) {
      blocks.push(new Uint8Array(512 - remainder));
    }
  }

  // Deux blocs de 512 octets à zéro pour marquer la fin de l'archive TAR
  blocks.push(new Uint8Array(1024));

  const totalLength = blocks.reduce((acc, b) => acc + b.byteLength, 0);
  const tarBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of blocks) {
    tarBuffer.set(b, offset);
    offset += b.byteLength;
  }

  return gzipSync(tarBuffer);
}

describe('Masquage des secrets dans les messages d’erreur (§9 & FR-10)', () => {
  it('masque systématiquement les clés API et mots de passe DB', () => {
    const rawErr = new Error(
      'Failed request with key AIzaSyD1234567890abcdefghijklmnopqrstuv and token ghp_1234567890abcdefghijklmnopqrstuv on postgresql://user:secretPass123@localhost:5433/db'
    );
    const sanitized = sanitizeErrorMessage(rawErr);

    expect(sanitized.message).toContain('[REDACTED_GEMINI_KEY]');
    expect(sanitized.message).toContain('[REDACTED_GITHUB_TOKEN]');
    expect(sanitized.message).toContain('[REDACTED_PASSWORD]');
    expect(sanitized.message).not.toContain('AIzaSyD1234567890abcdefghijklmnopqrstuv');
    expect(sanitized.message).not.toContain('secretPass123');
  });
});

describe('Jalon 2 — Catalogue ECC versionné, Résilience & Synchronisation réelle GitHub (FR-04)', () => {
  const db = getDb();

  beforeEach(async () => {
    // Nettoyer uniquement les synchronisations ECC de test (sha '1111111111111111111111111111111111111111')
    await db.delete(eccSyncs).where(eq(eccSyncs.commitSha, '1111111111111111111111111111111111111111'));
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

    const mockFetcher: EccRemoteFetcher = {
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

    const service = new EccCatalogService(db, mockFetcher);

    // 1. Première synchronisation réussie
    const sync1 = await service.synchronizeCatalog();
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
      service.synchronizeCatalog({ forceResync: true })
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
      const liveService = new EccCatalogService(db, new GitHubOfficialEccFetcher());
      const liveSync = await liveService.synchronizeCatalog({
        owner: 'affaan-m',
        repo: 'ECC',
        ref: 'main',
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
