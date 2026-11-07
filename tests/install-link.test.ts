import crypto from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { unzipSync, strFromU8 } from 'fflate';
import {
  closeDbPool,
  catalogSyncs,
  generatedArtifacts,
  getDb,
  harnessGenerations,
  projectProfiles,
  projects,
  users,
} from '../src/db';
import {
  INSTALL_LINK_TTL_MS,
  buildInstallZip,
  createInstallLink,
  loadInstallFiles,
  publicOrigin,
  resolveInstallLink,
} from '../src/modules/package-exporter/install-link';
import { renderDeploymentPromptMarkdown, renderUpgradePromptMarkdown } from '../src/modules/package-exporter/templates';

const sha = (c: string) => crypto.createHash('sha256').update(c).digest('hex');

describe('Prompt en mode lien (paquet téléchargé par l’agent)', () => {
  const files = [
    { relativePath: 'AGENTS.md', content: '# Agents\n\n```bash\nnpm test\n```' },
    { relativePath: '.agents/rules/common-security.md', content: 'x'.repeat(50_000) },
  ];
  const packageSource = {
    url: 'https://ahb.example/api/install/abc',
    expiresAt: new Date('2026-11-08T15:00:00Z'),
    files: files.map((f) => ({ relativePath: f.relativePath, sha256: sha(f.content) })),
  };

  it('le prompt de mise à niveau ne recopie aucun contenu, mais le lien, les empreintes et le nettoyage', () => {
    const prompt = renderUpgradePromptMarkdown({ projectName: 'Felicicar', files, packageSource });
    expect(prompt.length).toBeLessThan(20_000);
    expect(prompt).not.toContain('x'.repeat(100));
    expect(prompt).toContain('curl -fsSL "https://ahb.example/api/install/abc"');
    expect(prompt).toContain(sha(files[1]!.content));
    expect(prompt).toContain('2026-11-08 15:00 UTC');
    expect(prompt).toContain('Supprime le dossier temporaire `.harness-staging/`');
  });

  it('le prompt de déploiement suit le même mode', () => {
    const prompt = renderDeploymentPromptMarkdown({ projectName: 'Felicicar', files, packageSource });
    expect(prompt).not.toContain('x'.repeat(100));
    expect(prompt).toContain('Récupération des fichiers du harnais');
  });

  it('sans lien, le prompt embarque toujours les contenus', () => {
    expect(renderUpgradePromptMarkdown({ projectName: 'Felicicar', files })).toContain('x'.repeat(100));
  });

  it('l’archive contient les fichiers à leur chemin exact, sans dossier racine', () => {
    const zip = unzipSync(buildInstallZip(files.map((f) => ({ ...f, sha256: sha(f.content) }))));
    expect(Object.keys(zip).sort()).toEqual(['.agents/rules/common-security.md', 'AGENTS.md']);
    expect(strFromU8(zip['AGENTS.md']!)).toBe(files[0]!.content);
  });

  it('l’origine publique suit les en-têtes du proxy', () => {
    const h = new Headers({ 'x-forwarded-host': 'ahb.boldr.fr', 'x-forwarded-proto': 'https', host: '10.0.0.5:3000' });
    expect(publicOrigin(h, 'http://0.0.0.0:3000')).toBe('https://ahb.boldr.fr');
    expect(publicOrigin(new Headers(), 'http://localhost:3000')).toBe('http://localhost:3000');
  });
});

describe('Liens d’installation en base', () => {
  const db = getDb();
  const email = `install-link-${crypto.randomUUID()}@test.local`;
  let syncId: string | undefined;

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, email));
    if (syncId) await db.delete(catalogSyncs).where(eq(catalogSyncs.id, syncId));
    await closeDbPool();
  });

  it('crée un jeton, le résout tant qu’il est valide, puis le refuse après expiration', async () => {
    const [user] = await db.insert(users).values({ email, passwordHash: 'x' }).returning();
    const [project] = await db.insert(projects).values({ userId: user!.id, name: 'felicicar' }).returning();
    const [profile] = await db
      .insert(projectProfiles)
      .values({ projectId: project!.id, profileData: {} as never, profileSha256: 'a'.repeat(64) })
      .returning();
    const [sync] = await db.insert(catalogSyncs).values({ commitSha: 'b'.repeat(40), versionTag: 'test' }).returning();
    syncId = sync!.id;
    const [generation] = await db
      .insert(harnessGenerations)
      .values({ projectId: project!.id, projectProfileId: profile!.id, catalogSyncId: sync!.id })
      .returning();
    await db.insert(generatedArtifacts).values({
      generationId: generation!.id,
      relativePath: 'AGENTS.md',
      artifactType: 'AGENTS_MD',
      originStatus: 'project_custom',
      content: '# Agents',
      sizeBytes: 8,
      sha256Hash: sha('# Agents'),
      validationTier: 'AUTO_VALIDATED',
    });

    const now = new Date('2026-11-07T12:00:00Z');
    const { token, expiresAt } = await createInstallLink(db, generation!.id, now);
    expect(expiresAt.getTime() - now.getTime()).toBe(INSTALL_LINK_TTL_MS);
    expect(await resolveInstallLink(db, token, now)).toBe(generation!.id);
    expect(await resolveInstallLink(db, token, new Date(expiresAt.getTime() + 1))).toBeNull();
    expect(await resolveInstallLink(db, 'jeton-invalide', now)).toBeNull();

    const installed = await loadInstallFiles(db, generation!.id);
    expect(installed).toEqual([{ relativePath: 'AGENTS.md', content: '# Agents', sha256: sha('# Agents') }]);
  });
});
