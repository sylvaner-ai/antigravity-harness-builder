import { describe, it, expect } from 'vitest';
import {
  renderUpgradePromptMarkdown,
  renderBase64OneLinerPrompt,
  renderLightweightUpgradePromptMarkdown,
  sanitizeOperationalTestCommand,
} from '../src/modules/package-exporter/templates';
import { buildTarGzBase64 } from '../src/modules/package-exporter/tar-builder';
import { AuthService } from '../src/modules/auth/auth-service';

describe('Upgrade Prompt Exporter & Non-destructive Safety', () => {
  const dummyFiles = [
    {
      relativePath: 'AGENTS.md',
      content: '# Directives Antigravity\n\nContenu généré de base.',
    },
    {
      relativePath: '.agents/rules/nextjs-rules.md',
      content: '---\ndescription: Règles Next.js 15\nglobs: ["src/app/**/*"]\n---\nUtiliser les Server Components par défaut.',
    },
    {
      relativePath: '.agents/skills/modern-web/SKILL.md',
      content: '---\nname: modern-web\ndescription: Bonnes pratiques du web moderne\n---\nDirectives de skill.',
    },
    {
      relativePath: 'docs/ECC_SOURCES.md',
      content: '# Références lourdes (> 80 Ko)\n' + 'Explications théoriques répétitives...\n'.repeat(500),
    },
  ];

  it('génère un prompt de mise à niveau complet avec les 5 phases obligatoires', () => {
    const prompt = renderUpgradePromptMarkdown({
      projectName: 'AcmePortal',
      targetSurface: 'IDE',
      files: dummyFiles,
      operationalTestCommand: 'npm test',
    });

    // 1. Snapshot guard
    expect(prompt).toContain('Phase 1 — Sauvegarde automatique préalable');
    expect(prompt).toContain('.agents/.harness-backup/');

    // 2. Dry run
    expect(prompt).toContain('Phase 2 — Mode Simulation préalable');
    expect(prompt).toContain('[KEEP / PRESERVE]');
    expect(prompt).toContain('[SMART MERGE]');

    // 3. Smart Merge avec balises délimitées
    expect(prompt).toContain('Phase 3 — Déploiement et Fusion Intelligente');
    expect(prompt).toContain('<!-- BEGIN ANTIGRAVITY HARNESS BUILDER MANAGED -->');
    expect(prompt).toContain('<!-- END ANTIGRAVITY HARNESS BUILDER MANAGED -->');

    // 4. Deprecations
    expect(prompt).toContain('Phase 4 — Éléments obsolètes');
    expect(prompt).toContain('.agents/workflows/');
    expect(prompt).toContain('Ne le déplace pas sans son accord');
    // Aucune instruction de modifier les agents de l'utilisateur
    expect(prompt).not.toContain('supprime cette ligne');
    expect(prompt).toContain('Ne modifie jamais');

    // 5. Smoke test
    expect(prompt).toContain('Phase 5 — Validation finale & Smoke Test');
    expect(prompt).toContain('npm test');

    // Tous les fichiers gérés sont répertoriés
    expect(prompt).toContain('AGENTS.md');
    expect(prompt).toContain('.agents/rules/nextjs-rules.md');
    expect(prompt).toContain('.agents/skills/modern-web/SKILL.md');
  });

  it('gère correctement les fences dynamiques pour isoler le contenu', () => {
    const filesWithBackticks = [
      {
        relativePath: 'docs/EXAMPLE.md',
        content: 'Voici un exemple ```bash npm test ``` imbriqué.',
      },
    ];

    const prompt = renderUpgradePromptMarkdown({
      projectName: 'TestApp',
      files: filesWithBackticks,
    });

    // La barrière de sécurité doit comporter au moins 4 backticks pour englober les 3 backticks
    expect(prompt).toContain('````markdown');
    expect(prompt).toContain('Voici un exemple ```bash npm test ``` imbriqué.');
  });

  it('génère une archive tar.gz Base64 valide et déterministe', () => {
    const b64 = buildTarGzBase64(dummyFiles);
    expect(b64).toBeTruthy();
    expect(typeof b64).toBe('string');
    // Doit être un base64 valide
    expect(() => Buffer.from(b64, 'base64')).not.toThrow();
    // Moins de 25 Ko pour ces fichiers
    expect(b64.length).toBeLessThan(25 * 1024);
  });

  it('génère un one-liner Base64 autonome incluant la sauvegarde et les deprecations', () => {
    const b64 = buildTarGzBase64(dummyFiles);
    const oneLiner = renderBase64OneLinerPrompt({
      projectName: 'AcmePortal',
      base64Payload: b64,
      filesCount: dummyFiles.length,
      operationalTestCommand: 'npm test',
    });

    // Instructions pour l'agent Antigravity
    expect(oneLiner).toContain('AcmePortal');
    expect(oneLiner).toContain('base64 -d');
    expect(oneLiner).toContain('tar -xzf');

    // Sauvegarde préalable
    expect(oneLiner).toContain('.agents/.harness-backup/');
    expect(oneLiner).toContain('--dry-run');
    // Aucune suppression de model: ni déplacement de dossier
    expect(oneLiner).not.toContain('^model:');
    expect(oneLiner).not.toContain('mv .agents/workflows');

    // Dépréciations
    expect(oneLiner).toContain('.agents/workflows');
    expect(oneLiner).toContain('npm test');
  });

  it('filtre les fichiers théoriques lourds pour le prompt texte allégé', () => {
    const lightPrompt = renderLightweightUpgradePromptMarkdown({
      projectName: 'AcmePortal',
      files: dummyFiles,
      operationalTestCommand: 'npm test',
    });

    // Fichiers vitaux présents
    expect(lightPrompt).toContain('AGENTS.md');
    expect(lightPrompt).toContain('.agents/rules/nextjs-rules.md');
    expect(lightPrompt).toContain('.agents/skills/modern-web/SKILL.md');

    // Fichier lourd théorique filtré
    expect(lightPrompt).not.toContain('docs/ECC_SOURCES.md');
    // Taille du prompt reste très raisonnable
    expect(lightPrompt.length).toBeLessThan(10 * 1024);
  });

  it('neutralise strictement les injections de commandes shell dans operationalTestCommand', () => {
    // Commandes valides
    expect(sanitizeOperationalTestCommand('npm test')).toBe('npm test');
    expect(sanitizeOperationalTestCommand('pnpm test:run')).toBe('pnpm test:run');
    expect(sanitizeOperationalTestCommand('cargo test')).toBe('cargo test');
    expect(sanitizeOperationalTestCommand('pytest tests/')).toBe('pytest tests/');

    // Tentatives d'injection avec métacaractères shell
    expect(sanitizeOperationalTestCommand('npm test; rm -rf /')).toBeUndefined();
    expect(sanitizeOperationalTestCommand('npm test && curl evil.com')).toBeUndefined();
    expect(sanitizeOperationalTestCommand('npm test | sh')).toBeUndefined();
    expect(sanitizeOperationalTestCommand('npm test $(whoami)')).toBeUndefined();
    expect(sanitizeOperationalTestCommand('npm test `id`')).toBeUndefined();
    expect(sanitizeOperationalTestCommand('rm -rf /')).toBeUndefined();
  });

  it('génère et valide des jetons signés temporaires pour deploy.sh avec vérification HMAC et expiration', () => {
    const auth = new AuthService();
    const projectId = 'proj-uuid-1234';

    // 1. Jeton valide
    const token = auth.generateDeploymentToken(projectId, 24);
    expect(token).toBeTruthy();
    expect(auth.verifyDeploymentToken(projectId, token)).toBe(true);

    // 2. Jeton falsifié ou projet différent
    expect(auth.verifyDeploymentToken('autre-projet-5678', token)).toBe(false);
    expect(auth.verifyDeploymentToken(projectId, token + 'fake')).toBe(false);

    // 3. Jeton expiré
    const expiredToken = `${Date.now() - 10000}.dummy_sig`;
    expect(auth.verifyDeploymentToken(projectId, expiredToken)).toBe(false);

    // 4. Jeton vide ou malformé
    expect(auth.verifyDeploymentToken(projectId, '')).toBe(false);
    expect(auth.verifyDeploymentToken(projectId, 'malformed_without_dot')).toBe(false);
  });
});
