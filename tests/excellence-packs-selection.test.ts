import { describe, it, expect } from 'vitest';
import { SelectionEngine, CatalogCandidateInput } from '../src/modules/selection-engine';
import { ALL_EXCELLENCE_PACKS } from '../src/modules/selection-engine/schema';
import { SAAS_MULTI_TENANT_PROFILE } from './golden-dataset/archetypes';

describe('Packs d Excellence & Garde-fous — Sélection & Justifications', () => {
  const mockCatalog: CatalogCandidateInput[] = [
    {
      slug: 'security-owasp-guidelines',
      name: 'Garde-fous de Sécurité OWASP & Validation',
      kind: 'RULE',
      description: 'Prévention des injections SQL, XSS, SSRF et validation des entrées.',
      adaptedContent: `---
trigger: glob
globs: "**/api/**, **/routes/**, **/db/**, src/**/*.{ts,js}"
description: Sécurité OWASP et validation stricte
---
# Sécurité OWASP\nValidation systématique via schémas stricts Zod.`,
      parsedMeta: {
        family: 'security',
        tags: ['security', 'owasp', 'validation', 'zero-trust'],
        languages: ['typescript', 'javascript'],
        frameworks: ['next.js', 'react'],
        dependencies: [],
        hasResources: false,
        resourcesList: [],
        skippedUnsafeFiles: [],
        adaptationNotes: [],
      },
      compatibilityStatus: 'AUTO_VALIDATED',
    },
    {
      slug: 'ui-craft-and-5-states',
      name: 'Craft UI, Micro-interactions et Règle des 5 États',
      kind: 'RULE',
      description: 'Obligation des 5 états UI, tokens Tailwind stricts et accessibilité WCAG AA.',
      adaptedContent: `---
trigger: glob
globs: "**/*.{tsx,jsx,vue}"
description: Directives d'excellence UI et règle des 5 états
---
# Craft UI & 5 États\nTout composant gérant des données doit implémenter : normal, loading, empty, error, feedback.`,
      parsedMeta: {
        family: 'design-engineering',
        tags: ['design-system', 'ui-polish', 'accessibility', '5-states', 'craft'],
        languages: ['typescript', 'javascript'],
        frameworks: ['react', 'next.js'],
        dependencies: [],
        hasResources: false,
        resourcesList: [],
        skippedUnsafeFiles: [],
        adaptationNotes: [],
      },
      compatibilityStatus: 'AUTO_VALIDATED',
    },
    {
      slug: 'extreme-tdd-anti-omissions',
      name: 'Rigueur TDD, Planification et Zéro Oubli',
      kind: 'RULE',
      description: 'Cycle Red-Green-Refactor, couverture >80% et checklist pré-commit.',
      adaptedContent: `---
trigger: always_on
description: Rigueur de développement TDD et prévention des régressions
---
# Rigueur TDD\nPlan avant toute modification, tests d'abord, build et typecheck verts.`,
      parsedMeta: {
        family: 'testing',
        tags: ['tdd', 'testing', 'anti-omissions', 'verification'],
        languages: ['typescript', 'javascript'],
        frameworks: ['next.js', 'react'],
        dependencies: [],
        hasResources: false,
        resourcesList: [],
        skippedUnsafeFiles: [],
        adaptationNotes: [],
      },
      compatibilityStatus: 'AUTO_VALIDATED',
    },
  ];

  it('active par défaut l intégralité des 3 packs d excellence', () => {
    const engine = new SelectionEngine();
    const result = engine.selectComponents(SAAS_MULTI_TENANT_PROFILE, mockCatalog);

    expect(result.excellencePacks).toBeDefined();
    expect(result.excellencePacks).toEqual(ALL_EXCELLENCE_PACKS);
    expect(result.excellencePacks).toContain('SECURITY_HARDENED');
    expect(result.excellencePacks).toContain('DESIGN_CRAFT_POLISH');
    expect(result.excellencePacks).toContain('EXTREME_TDD_ANTI_BUG');
  });

  it('accorde un bonus d excellence et retient les composants associés aux packs actifs', () => {
    const engine = new SelectionEngine();
    const result = engine.selectComponents(SAAS_MULTI_TENANT_PROFILE, mockCatalog, {
      excellencePacks: ['SECURITY_HARDENED', 'DESIGN_CRAFT_POLISH', 'EXTREME_TDD_ANTI_BUG'],
    });

    const selectedSlugs = result.selectedComponents.map((c) => c.slug);
    expect(selectedSlugs).toContain('security-owasp-guidelines');
    expect(selectedSlugs).toContain('ui-craft-and-5-states');
    expect(selectedSlugs).toContain('extreme-tdd-anti-omissions');

    // Vérification des justifications d'acceptation enrichies
    const secComp = result.selectedComponents.find((c) => c.slug === 'security-owasp-guidelines');
    expect(secComp?.acceptedRationale).toMatch(/Pack d'Excellence Sécurité|Sécurité/i);
    expect(secComp?.score.excellenceBonus).toBeGreaterThan(0);

    const uiComp = result.selectedComponents.find((c) => c.slug === 'ui-craft-and-5-states');
    expect(uiComp?.acceptedRationale).toMatch(/Pack d'Excellence Design|Design/i);
    expect(uiComp?.score.excellenceBonus).toBeGreaterThan(0);
  });

  it('permet de désactiver un pack spécifique sans affecter les autres', () => {
    const engine = new SelectionEngine();
    const result = engine.selectComponents(SAAS_MULTI_TENANT_PROFILE, mockCatalog, {
      excellencePacks: ['DESIGN_CRAFT_POLISH'], // Uniquement Design
    });

    expect(result.excellencePacks).toEqual(['DESIGN_CRAFT_POLISH']);
    const uiComp = result.selectedComponents.find((c) => c.slug === 'ui-craft-and-5-states');
    expect(uiComp?.score.excellenceBonus).toBeGreaterThan(0);

    const secComp = result.selectedComponents.find((c) => c.slug === 'security-owasp-guidelines');
    expect(secComp?.score.excellenceBonus ?? 0).toBe(0);
  });
});
