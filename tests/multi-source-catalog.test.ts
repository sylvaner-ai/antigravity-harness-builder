import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CATALOG_SOURCES,
  getBuiltinCuratedExcellenceComponents,
} from '../src/modules/catalog/catalog-service';
import { parseAndQualifyRepositoryEntries } from '../src/modules/catalog/indexer';
import { SelectionEngine } from '../src/modules/selection-engine/engine';
import { SAAS_MULTI_TENANT_PROFILE } from './golden-dataset/archetypes';

describe('Catalogue Multi-Sources & Dépôts de Référence Additionnels', () => {
  it('définit les sources de référence par défaut couvrant le core, le design, la sécurité et la qualité (superpowers, cloudflare, ponytail)', () => {
    expect(DEFAULT_CATALOG_SOURCES).toBeDefined();
    expect(DEFAULT_CATALOG_SOURCES.length).toBeGreaterThanOrEqual(5);

    const sourceIds = DEFAULT_CATALOG_SOURCES.map((s) => s.id);
    expect(sourceIds).toContain('ecc-official');
    expect(sourceIds).toContain('emil-kowalski-skills');
    expect(sourceIds).toContain('obra-superpowers');
    expect(sourceIds).toContain('cloudflare-security-audit');
    expect(sourceIds).toContain('dietrichgebert-ponytail');

    const ecc = DEFAULT_CATALOG_SOURCES.find((s) => s.id === 'ecc-official');
    expect(ecc?.owner).toBe('affaan-m');
    expect(ecc?.repo).toBe('ECC');

    const emil = DEFAULT_CATALOG_SOURCES.find((s) => s.id === 'emil-kowalski-skills');
    expect(emil?.owner).toBe('emilkowalski');
    expect(emil?.repo).toBe('skills');

    const superpowers = DEFAULT_CATALOG_SOURCES.find((s) => s.id === 'obra-superpowers');
    expect(superpowers?.owner).toBe('obra');
    expect(superpowers?.repo).toBe('superpowers');
    expect(superpowers?.category).toBe('QUALITY');
    expect(superpowers?.tags).toContain('sdlc');
    expect(superpowers?.tags).toContain('tdd');

    const cloudflare = DEFAULT_CATALOG_SOURCES.find((s) => s.id === 'cloudflare-security-audit');
    expect(cloudflare?.owner).toBe('cloudflare');
    expect(cloudflare?.repo).toBe('security-audit-skill');
    expect(cloudflare?.category).toBe('SECURITY');
    expect(cloudflare?.tags).toContain('security');
    expect(cloudflare?.tags).toContain('vulnerability');

    const ponytail = DEFAULT_CATALOG_SOURCES.find((s) => s.id === 'dietrichgebert-ponytail');
    expect(ponytail?.owner).toBe('dietrichgebert');
    expect(ponytail?.repo).toBe('ponytail');
    expect(ponytail?.category).toBe('QUALITY');
    expect(ponytail?.tags).toContain('yagni');
    expect(ponytail?.tags).toContain('anti-overengineering');
  });

  it('fournit des composants d excellence pré-packagés avec frontmatter et métadonnées valides', () => {
    const curated = getBuiltinCuratedExcellenceComponents();
    expect(curated.length).toBeGreaterThanOrEqual(3);

    const slugs = curated.map((c) => c.slug);
    expect(slugs).toContain('api-security-guards');
    expect(slugs).toContain('ui-craft-and-5-states');
    expect(slugs).toContain('plan-first-and-anti-omissions');

    for (const comp of curated) {
      expect(comp.compatibilityStatus).toBe('AUTO_VALIDATED');
      expect(comp.adaptedContent).toContain('---');
      expect(comp.parsedMeta.tags.length).toBeGreaterThan(0);
      expect(comp.license).toBe('MIT');
    }
  });

  it('attribue correctement la provenance et les tags de domaine aux composants', () => {
    const curated = getBuiltinCuratedExcellenceComponents();
    const sec = curated.find((c) => c.slug === 'api-security-guards');
    expect(sec?.parsedMeta.family).toBe('security');
    expect(sec?.parsedMeta.tags).toContain('owasp');
    expect(sec?.parsedMeta.tags).toContain('zero-trust');

    const ui = curated.find((c) => c.slug === 'ui-craft-and-5-states');
    expect(ui?.parsedMeta.family).toBe('design-engineering');
    expect(ui?.parsedMeta.tags).toContain('5-states');
    expect(ui?.parsedMeta.tags).toContain('accessibility');

    const tdd = curated.find((c) => c.slug === 'plan-first-and-anti-omissions');
    expect(tdd?.parsedMeta.family).toBe('testing');
    expect(tdd?.parsedMeta.tags).toContain('tdd');
    expect(tdd?.parsedMeta.tags).toContain('anti-omissions');
  });

  it('indexe et qualifie fidèlement les compétences de méthodologie SDLC de obra/superpowers', () => {
    const mockEntries = [
      {
        relativePath: 'skills/test-driven-development/SKILL.md',
        content: `---
name: test-driven-development
description: Strict test-driven development workflow enforcing Red-Green-Refactor with 80%+ coverage before code completion.
---
# Test-Driven Development (TDD)
Enforce write-tests-first discipline across all features.
`,
        sizeBytes: 250,
      },
      {
        relativePath: 'skills/verification-before-completion/SKILL.md',
        content: `---
name: verification-before-completion
description: Formal verification checklist ensuring zero forgotten tasks, clean git diff, and green test suite.
---
# Verification Before Completion
Never finish without concrete evidence.
`,
        sizeBytes: 220,
      },
      {
        relativePath: 'skills/brainstorming/SKILL.md',
        content: `---
name: brainstorming
description: Interactive alignment on user intent and architectural trade-offs before entering implementation.
---
# Brainstorming Skill
Clarify intent first.
`,
        sizeBytes: 200,
      },
    ];

    const result = parseAndQualifyRepositoryEntries(
      mockEntries,
      'commit123',
      'https://github.com/obra/superpowers'
    );

    expect(result.components.length).toBe(3);
    const slugs = result.components.map((c: any) => c.slug);
    expect(slugs).toContain('test-driven-development');
    expect(slugs).toContain('verification-before-completion');
    expect(slugs).toContain('brainstorming');

    const tddComp = result.components.find((c: any) => c.slug === 'test-driven-development');
    expect(tddComp).toBeDefined();
    expect(tddComp!.kind).toBe('SKILL');
    expect(tddComp!.compatibilityStatus).toBe('AUTO_VALIDATED');
    expect(tddComp!.parsedMeta.tags).toContain('tdd');
    expect(tddComp!.sourceUrl).toContain('obra/superpowers');
  });

  it('accorde le bonus d excellence et sélectionne les compétences de Superpowers avec le pack EXTREME_TDD_ANTI_BUG', () => {
    const engine = new SelectionEngine();
    const superpowersCandidate = {
      externalId: 'skill:test-driven-development',
      slug: 'test-driven-development',
      kind: 'SKILL',
      name: 'Test-Driven Development',
      description: 'Strict Red-Green-Refactor workflow with 80%+ test coverage.',
      sourceUrl: 'https://github.com/obra/superpowers',
      license: 'MIT',
      adaptedContent: '# TDD Workflow',
      parsedMeta: {
        family: 'testing',
        tags: ['tdd', 'methodology', 'sdlc', 'superpowers'],
        languages: ['typescript', 'javascript'],
        frameworks: ['react', 'nextjs'],
        dependencies: [],
      },
      compatibilityStatus: 'AUTO_VALIDATED',
    };

    const res = engine.selectComponents(
      SAAS_MULTI_TENANT_PROFILE,
      [superpowersCandidate as any],
      {
        presetMode: 'BALANCED',
        excellencePacks: ['EXTREME_TDD_ANTI_BUG'],
      }
    );

    expect(res.selectedComponents.length).toBe(1);
    const selected = res.selectedComponents[0];
    expect(selected).toBeDefined();
    expect(selected!.slug).toBe('test-driven-development');
    expect(selected!.score.excellenceBonus).toBe(45);
    expect(selected!.score.matchingKeywords).toContain('pack:extreme-tdd-anti-bug');
    expect(selected!.acceptedRationale).toContain("Pack d'Excellence Rigueur TDD");
  });

  it('indexe et qualifie la compétence security-audit de Cloudflare avec ses ressources associées', () => {
    const mockEntries = [
      {
        relativePath: 'skills/security-audit/SKILL.md',
        content: `---
name: security-audit
description: Deep multi-phase code security audit and vulnerability hunting with adversarial sub-agent verification.
---
# Security Audit Skill
Comprehensive security vulnerability detection and zero false-positive validation.
`,
        sizeBytes: 350,
      },
      {
        relativePath: 'skills/security-audit/HUNTING.md',
        content: '# Hunting Techniques\nSystematic coverage-led vulnerability hunting.',
        sizeBytes: 150,
      },
    ];

    const result = parseAndQualifyRepositoryEntries(
      mockEntries,
      'cf12345',
      'https://github.com/cloudflare/security-audit-skill'
    );

    expect(result.components.length).toBe(1);
    const cfComp = result.components[0];
    expect(cfComp).toBeDefined();
    expect(cfComp!.slug).toBe('security-audit');
    expect(cfComp!.kind).toBe('SKILL');
    expect(cfComp!.compatibilityStatus).toBe('AUTO_VALIDATED');
    expect(cfComp!.parsedMeta.hasResources).toBe(true);
    expect(cfComp!.parsedMeta.resourcesList.map((r: any) => r.relativeSubPath)).toContain('HUNTING.md');
    expect(cfComp!.sourceUrl).toContain('cloudflare/security-audit-skill');
  });

  it('accorde le bonus d excellence SECURITY_HARDENED à security-audit de Cloudflare', () => {
    const engine = new SelectionEngine();
    const cloudflareCandidate = {
      externalId: 'skill:security-audit',
      slug: 'security-audit',
      kind: 'SKILL',
      name: 'Security Audit & Vulnerability Hunting',
      description: 'Deep multi-phase security code audit with zero false positives.',
      sourceUrl: 'https://github.com/cloudflare/security-audit-skill',
      license: 'Apache-2.0',
      adaptedContent: '# Security Audit',
      parsedMeta: {
        family: 'security',
        tags: ['security', 'audit', 'vulnerability', 'owasp', 'cloudflare'],
        languages: ['typescript', 'javascript'],
        frameworks: ['react', 'nextjs'],
        dependencies: [],
      },
      compatibilityStatus: 'AUTO_VALIDATED',
    };

    const res = engine.selectComponents(
      SAAS_MULTI_TENANT_PROFILE,
      [cloudflareCandidate as any],
      {
        presetMode: 'BALANCED',
        excellencePacks: ['SECURITY_HARDENED'],
      }
    );

    expect(res.selectedComponents.length).toBe(1);
    const selected = res.selectedComponents[0];
    expect(selected).toBeDefined();
    expect(selected!.slug).toBe('security-audit');
    expect(selected!.score.excellenceBonus).toBe(45);
    expect(selected!.score.matchingKeywords).toContain('pack:security-hardened');
    expect(selected!.acceptedRationale).toContain("Pack d'Excellence Sécurité Renforcée");
  });

  it('accorde le bonus d excellence EXTREME_TDD_ANTI_BUG aux compétences ponytail (anti-suringénierie)', () => {
    const engine = new SelectionEngine();
    const ponytailCandidate = {
      externalId: 'skill:ponytail',
      slug: 'ponytail',
      kind: 'SKILL',
      name: 'Ponytail Pragmatic YAGNI',
      description: 'Pragmatic senior engineering: avoid premature abstractions, write minimal code.',
      sourceUrl: 'https://github.com/dietrichgebert/ponytail',
      license: 'MIT',
      adaptedContent: '# Ponytail',
      parsedMeta: {
        family: 'quality',
        tags: ['yagni', 'anti-overengineering', 'minimalism', 'ponytail', 'quality'],
        languages: ['typescript', 'javascript'],
        frameworks: ['react', 'nextjs'],
        dependencies: [],
      },
      compatibilityStatus: 'AUTO_VALIDATED',
    };

    const res = engine.selectComponents(
      SAAS_MULTI_TENANT_PROFILE,
      [ponytailCandidate as any],
      {
        presetMode: 'BALANCED',
        excellencePacks: ['EXTREME_TDD_ANTI_BUG'],
      }
    );

    expect(res.selectedComponents.length).toBe(1);
    const selected = res.selectedComponents[0];
    expect(selected).toBeDefined();
    expect(selected!.slug).toBe('ponytail');
    expect(selected!.score.excellenceBonus).toBe(45);
    expect(selected!.score.matchingKeywords).toContain('pack:extreme-tdd-anti-bug');
  });
});
