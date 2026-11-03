import { describe, it, expect } from 'vitest';
import { extractHeuristicProjectProfile } from '../src/modules/project-profile/heuristic-extractor';
import { ProjectProfileSchema } from '../src/modules/project-profile/schema';

const PYTHON_SPEC = `
# Service de rapprochement bancaire

## 1. Contexte
Service interne qui rapproche automatiquement les relevés bancaires et les écritures comptables.

## 2. Rôles
- **Comptable** : valide les rapprochements proposés.
- **Administrateur** : gère les règles de rapprochement.

### Module 1 : Import des relevés
Import de fichiers CSV et OFX par lot.
- Rejet des fichiers dont l'encodage n'est pas UTF-8.

## Spécifications techniques
API REST en Python 3.12 avec FastAPI et Pydantic. Base PostgreSQL avec SQLAlchemy et Alembic.
Tests avec pytest. Déploiement via Docker.
`;

describe('Extracteur heuristique : aucun contenu inventé', () => {
  it('détecte une pile Python / FastAPI sans y ajouter Next.js ni TypeScript', () => {
    const p = extractHeuristicProjectProfile({ projectId: 'p', projectName: 'Rapprochement', specText: PYTHON_SPEC });
    expect(p.techStack.languages).toContain('Python');
    expect(p.techStack.languages).not.toContain('TypeScript');
    expect(p.techStack.frameworks).toContain('FastAPI');
    expect(p.techStack.frameworks).toContain('Pydantic');
    expect(p.techStack.frameworks).not.toContain('Next.js');
    expect(p.techStack.ormAndDataLayer).toEqual(expect.arrayContaining(['SQLAlchemy', 'Alembic']));
    expect(p.techStack.databases).toContain('PostgreSQL');
    expect(p.techStack.testingTools).toContain('pytest');
    expect(p.techStack.testingTools).not.toContain('Vitest');
    expect(p.techStack.apiStyle).toBe('REST');
    expect(() => ProjectProfileSchema.parse(p)).not.toThrow();
  });

  it("ne reprend que les rôles décrits dans le document (pas de rôle auditeur par défaut)", () => {
    const p = extractHeuristicProjectProfile({ projectId: 'p', projectName: 'R', specText: PYTHON_SPEC });
    const values = p.personasAndRoles.map((r) => r.value.toLowerCase()).join(' ');
    expect(values).toContain('comptable');
    expect(values).not.toContain('auditeur');
    expect(p.personasAndRoles.every((r) => r.epistemicStatus === 'explicit')).toBe(true);
  });

  it("n'injecte aucun contenu propre à un autre projet (Félicicar, Factur-X, R2, Documenso)", () => {
    const p = extractHeuristicProjectProfile({ projectId: 'p', projectName: 'R', specText: PYTHON_SPEC });
    const dump = JSON.stringify(p).toLowerCase();
    for (const forbidden of ['félicicar', 'felicicar', 'factur-x', 'documenso', 'cloudflare r2']) {
      expect(dump).not.toContain(forbidden);
    }
  });

  it("marque « À définir » ce qui manque, avec le statut missing_or_contradictory", () => {
    const p = extractHeuristicProjectProfile({ projectId: 'p', projectName: 'Vide', specText: 'Texte court.' });
    expect(p.techStack.languages).toEqual(['À définir']);
    expect(p.techStack.epistemicStatus).toBe('missing_or_contradictory');
    expect(p.personasAndRoles[0]?.epistemicStatus).toBe('missing_or_contradictory');
    expect(p.features[0]?.epistemicStatus).toBe('missing_or_contradictory');
    expect(p.domainAndObjective.epistemicStatus).toBe('missing_or_contradictory');
    expect(p.uncertainties.length).toBeGreaterThan(0);
    expect(() => ProjectProfileSchema.parse(p)).not.toThrow();
  });

  it("n'invente aucun token de design system quand aucun n'est fourni", () => {
    const p = extractHeuristicProjectProfile({ projectId: 'p', projectName: 'R', specText: PYTHON_SPEC });
    expect(Object.keys(p.designSystem.colorTokens)).toHaveLength(0);
    expect(p.designSystem.epistemicStatus).toBe('missing_or_contradictory');
  });

  it('lit les tokens de couleur réellement présents dans DESIGN.md', () => {
    const p = extractHeuristicProjectProfile({
      projectId: 'p',
      projectName: 'R',
      specText: PYTHON_SPEC,
      designSystemText: '# Charte\n\n| Primaire | `#0A66C2` |\n| Fond | #FFFFFF |\n\n:root { --font-sans: Inter, sans-serif; }',
    });
    expect(p.designSystem.colorTokens['primaire']).toBe('#0A66C2');
    expect(p.designSystem.colorTokens['fond']).toBe('#FFFFFF');
    expect(p.designSystem.typography.fontFamilies['sans']).toContain('Inter');
    expect(p.designSystem.epistemicStatus).toBe('explicit');
  });

  it('utilise des frontières de mots (« go » ou « r2 » dans un autre mot ne déclenche rien)', () => {
    const p = extractHeuristicProjectProfile({
      projectId: 'p',
      projectName: 'R',
      specText: '# Projet\n\nNous voulons un outil pour gérer les mongolfières et le cargo de la région r2d2.',
    });
    expect(p.techStack.languages).not.toContain('Go');
    expect(p.techStack.databases).not.toContain('MongoDB');
    expect(p.techStack.infrastructureAndDeployment).not.toContain('Cloudflare R2');
  });
});
