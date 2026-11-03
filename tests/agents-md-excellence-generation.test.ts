import { describe, it, expect } from 'vitest';
import { renderAgentsMarkdown } from '../src/modules/package-exporter/templates';
import { createSampleDeterministicInput } from './fixtures';

describe('Génération de AGENTS.md avec Piliers d Excellence', () => {
  it('injecte les garde-fous de sécurité, design 5 états et rigueur TDD lorsque les packs sont actifs', () => {
    const input = createSampleDeterministicInput();
    input.excellencePacks = ['SECURITY_HARDENED', 'DESIGN_CRAFT_POLISH', 'EXTREME_TDD_ANTI_BUG'];

    const md = renderAgentsMarkdown(input);

    // Section des piliers d'excellence
    expect(md).toContain("Piliers d'Excellence et Garde-fous Non Négociables");

    // 1. Sécurité OWASP & Zero-Trust
    expect(md).toContain('Sécurité Renforcée & Zero-Trust');
    expect(md).toMatch(/validation.*Zod|Zod/i);
    expect(md).toMatch(/requêtes paramétrées|injections SQL/i);
    expect(md).toMatch(/zéro secret|fuite de secret/i);

    // 2. Design Craft & 5 États UI
    expect(md).toContain('Design System, Craft UI & 5 États');
    expect(md).toContain('5 états UI');
    expect(md).toMatch(/WCAG|accessibilité/i);
    expect(md).toMatch(/placeholder|bouton factice|TODO/i);

    // 3. Rigueur TDD & Anti-Oublis
    expect(md).toContain('Rigueur de Développement & Anti-Oublis');
    expect(md).toMatch(/Plan avant action|planification/i);
    expect(md).toMatch(/TDD|Red-Green-Refactor/i);
    expect(md).toMatch(/git diff|vérification pré-commit/i);
  });
});
