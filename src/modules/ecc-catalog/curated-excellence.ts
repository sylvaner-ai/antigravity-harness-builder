import crypto from 'node:crypto';
import { IndexedEccComponentCandidate } from './indexer';

/**
 * Fournit les composants d'excellence pré-packagés (OWASP Zero-Trust, 5 États UI et TDD rigoureux).
 */
export function getBuiltinCuratedExcellenceComponents(): IndexedEccComponentCandidate[] {
  const sha = (text: string) => crypto.createHash('sha256').update(text).digest('hex');

  const secRuleContent = `---
trigger: glob
globs: "**/api/**/*.{ts,js}, **/routes/**/*.{ts,js}, **/server/**/*.{ts,js}, **/db/**/*.{ts,js}"
description: Validation stricte Zod, requêtes SQL préparées, zéro fuite de secrets et en-têtes sécurisés
---
# Directives de Sécurité API & Zero-Trust (OWASP)

## 1. Validation Stricte à la Frontière
- Valider tout corps (body), paramètre de requête (query) et en-tête avec un schéma Zod ou équivalent typé.
- Rejeter systématiquement les payloads malformés ou contenant des champs inattendus (strip ou strict).
- Ne jamais faire confiance aux données d'origine cliente, même après authentification.

## 2. Protection contre les Injections (SQL, NoSQL, Shell)
- Utiliser exclusivement des requêtes préparées ou l'ORM configuré (Drizzle, Prisma).
- Proscrire absolument toute concaténation ou interpolation de chaînes dans les requêtes de base de données.
- Ne jamais passer de commande shell contenant des arguments utilisateurs non assainis.

## 3. Confidentialité & Zéro Secret
- Ne jamais commiter ou inscrire dans les logs de secrets, mots de passe, jetons API ou données sensibles.
- Masquer les identifiants et tokens dans tous les flux d'erreurs retournés au client.
- Configurer les en-têtes de sécurité (CSP, HSTS, CORS restreint).
`;

  const uiRuleContent = `---
trigger: glob
globs: "**/*.{tsx,jsx,vue,svelte,html}"
description: Règle des 5 états UI, respect des tokens visuels et conformité WCAG AA
---
# Directives Craft UI, Design Tokens & Règle des 5 États

## 1. Règle Obligatoire des 5 États UI
Tout composant ou vue présentant des données asynchrones ou persistées doit explicitement gérer 5 états :
1. **État Normal (Data) :** Rendu fluide avec les données complètes.
2. **État Chargement (Loading Skeleton) :** Skeletons animés reproduisant fidèlement la forme du contenu (bannir le spinner brut au centre).
3. **État Vide (Empty State) :** Illustration sobre, message explicatif clair et bouton d'action pertinent.
4. **État Erreur (Error Boundary) :** Message compréhensible sans jargon technique et bouton de réessai.
5. **État Feedback Optimiste / Toast :** Confirmation immédiate des actions utilisateurs.

## 2. Respect des Tokens Visuels & Anti-Valeurs Magiques
- Utiliser exclusivement les tokens du Design System (spacing, colors, typography).
- Proscrire les valeurs CSS arbitraires non justifiées.
- Maintenir une cohérence totale entre les espacements et les rayons de bordure.

## 3. Accessibilité & Finitions
- Contraste de texte WCAG 2.1 AA (minimum 4.5:1).
- Navigation clavier intégrale avec anneau de focus net (focus-visible).
- Zéro bouton factice : interdiction des gestionnaires d'événements onClick vides ou TODO.
`;

  const tddRuleContent = `---
trigger: always_on
description: Planification préalable obligatoire, workflow TDD strict et checklist de non-régression
---
# Rigueur de Développement & Prévention des Oublis

## 1. Planification Préalable (Plan First)
- Interdiction formelle de modifier des fichiers de code sans avoir préalablement validé une feuille de route d'étapes.
- Identifier les dépendances, les risques d'effets de bord et les cas limites avant d'écrire du code.

## 2. Workflow Test-Driven Development (TDD)
1. **RED :** Écrire le test unitaire ou d'intégration d'abord et vérifier qu'il échoue pour la bonne raison.
2. **GREEN :** Produire l'implémentation la plus simple et ciblée pour faire passer le test au vert.
3. **IMPROVE :** Refactorer pour la lisibilité et la maintenabilité sans changer le comportement.
- Viser au minimum 80% de couverture sur tout nouveau code.

## 3. Checklist Pré-Commit Obligatoire
Avant de marquer une tâche comme terminée :
1. Exécuter la suite de tests : tous les tests doivent être au vert.
2. Exécuter le linter et le vérificateur de types (tsc --noEmit) : zéro avertissement ni erreur.
3. Auditer le diff Git intégral : vérifier qu'aucun fichier temporaire, secret ou modification non sollicitée n'a été introduit.
`;

  const secAuditorContent = `---
name: security-auditor
description: Audit indépendant des failles de sécurité, injections, secrets et conformité OWASP.
tools:
  - view_file
  - grep_search
  - find_by_name
  - run_command
---
# Auditeur de Sécurité & Conformité OWASP

Votre mission est d'auditer le code en lecture seule pour identifier toute vulnérabilité potentielle :
1. **Validation des entrées :** Vérifier que toutes les routes d'API utilisent des validateurs stricts Zod.
2. **Requêtes DB :** Vérifier l'absence d'injections SQL ou d'interpolation de paramètres.
3. **Secrets :** Détecter toute présence de clés API ou tokens en dur dans le code ou l'historique.
4. **Contrôle d'accès :** Valider l'étanchéité des autorisations et l'isolation des données multi-utilisateurs.
`;

  const uiReviewerContent = `---
name: ui-craft-reviewer
description: Revue indépendante de l'ergonomie, des finitions visuelles, des états UI et de l'accessibilité.
tools:
  - view_file
  - grep_search
  - find_by_name
---
# Revue Craft UI & Accessibilité

Votre mission est de vérifier la qualité de l'expérience utilisateur et de l'interface :
1. **5 États UI :** Vérifier que chaque composant gère chargement, vide, erreur et succès.
2. **Design Tokens :** Vérifier l'absence de valeurs CSS magiques ou arbitraires.
3. **Accessibilité :** Vérifier la navigation clavier, les contrastes et les rôles ARIA.
4. **Micro-interactions :** S'assurer que les transitions sont douces (< 250ms) et sans saccades.
`;

  return [
    {
      externalId: 'rule:api-security-guards',
      slug: 'api-security-guards',
      kind: 'RULE',
      name: 'Garde-fous de Sécurité API, OWASP et Zero-Trust',
      description: 'Directives impératives de sécurité : validation stricte Zod à toutes les frontières, requêtes préparées sans interpolation, zéro secret dans les logs et mitigation OWASP.',
      sourceRelativePath: 'rules/security/api-security-guards.md',
      sourceUrl: 'https://github.com/OWASP/CheatSheetSeries',
      license: 'MIT',
      contentSha256: sha(secRuleContent),
      rawContent: secRuleContent,
      adaptedContent: secRuleContent,
      parsedMeta: {
        sourceId: 'curated',
        sourcePriority: 100,
        family: 'security',
        tags: ['security', 'owasp', 'zero-trust', 'api', 'zod', 'validation'],
        languages: ['typescript', 'javascript'],
        frameworks: [],
        dependencies: [],
        hasResources: false,
        resourcesList: [],
        skippedUnsafeFiles: [],
        adaptationNotes: ['Curated excellence rule for Google Antigravity'],
      },
      compatibilityStatus: 'AUTO_VALIDATED',
      compatibilityIssues: [],
      searchText: 'security owasp zero-trust api zod injection protection',
    },
    {
      externalId: 'rule:ui-craft-and-5-states',
      slug: 'ui-craft-and-5-states',
      kind: 'RULE',
      name: 'Craft UI, Micro-interactions et Règle des 5 États',
      description: 'Obligation des 5 états UI pour tout composant, tokens de design Tailwind stricts et conformité accessibilité WCAG 2.1 AA.',
      sourceRelativePath: 'rules/design/ui-craft-and-5-states.md',
      sourceUrl: 'https://github.com/emilkowalski/skills',
      license: 'MIT',
      contentSha256: sha(uiRuleContent),
      rawContent: uiRuleContent,
      adaptedContent: uiRuleContent,
      parsedMeta: {
        sourceId: 'curated',
        sourcePriority: 100,
        family: 'design-engineering',
        tags: ['design-engineering', 'ui-polish', '5-states', 'accessibility', 'craft', 'wcag'],
        languages: ['typescript', 'javascript'],
        frameworks: [],
        dependencies: [],
        hasResources: false,
        resourcesList: [],
        skippedUnsafeFiles: [],
        adaptationNotes: ['Curated excellence rule for Google Antigravity'],
      },
      compatibilityStatus: 'AUTO_VALIDATED',
      compatibilityIssues: [],
      searchText: 'craft ui 5 states design tokens accessibility wcag polish animation',
    },
    {
      externalId: 'rule:plan-first-and-anti-omissions',
      slug: 'plan-first-and-anti-omissions',
      kind: 'RULE',
      name: 'Rigueur d Ingénierie, TDD et Prévention des Oublis',
      description: 'Workflow rigoureux : plan d implémentation avant action, développement guidé par les tests (TDD) et checklist pré-commit.',
      sourceRelativePath: 'rules/quality/plan-first-and-anti-omissions.md',
      sourceUrl: 'https://github.com/affaan-m/ECC',
      license: 'MIT',
      contentSha256: sha(tddRuleContent),
      rawContent: tddRuleContent,
      adaptedContent: tddRuleContent,
      parsedMeta: {
        sourceId: 'curated',
        sourcePriority: 100,
        family: 'testing',
        tags: ['tdd', 'anti-omissions', 'testing', 'verification', 'workflow', 'quality'],
        languages: [],
        frameworks: [],
        dependencies: [],
        hasResources: false,
        resourcesList: [],
        skippedUnsafeFiles: [],
        adaptationNotes: ['Curated excellence rule for Google Antigravity'],
      },
      compatibilityStatus: 'AUTO_VALIDATED',
      compatibilityIssues: [],
      searchText: 'plan first tdd test-driven anti-omissions checklist verification non-regression',
    },
    {
      externalId: 'subagent:security-auditor',
      slug: 'security-auditor',
      kind: 'SUBAGENT',
      name: 'Auditeur de Sécurité & Conformité OWASP',
      description: 'Audit indépendant des failles de sécurité, injections, secrets et conformité OWASP.',
      sourceRelativePath: 'agents/security-auditor.md',
      sourceUrl: 'https://github.com/OWASP/CheatSheetSeries',
      license: 'MIT',
      contentSha256: sha(secAuditorContent),
      rawContent: secAuditorContent,
      adaptedContent: secAuditorContent,
      parsedMeta: {
        sourceId: 'curated',
        sourcePriority: 100,
        family: 'security',
        tags: ['security', 'auditor', 'owasp', 'zero-trust'],
        languages: [],
        frameworks: [],
        dependencies: [],
        hasResources: false,
        resourcesList: [],
        skippedUnsafeFiles: [],
        adaptationNotes: ['Curated excellence subagent for Google Antigravity'],
      },
      compatibilityStatus: 'AUTO_VALIDATED',
      compatibilityIssues: [],
      searchText: 'security auditor owasp audit agent review vulnerabilities',
    },
    {
      externalId: 'subagent:ui-craft-reviewer',
      slug: 'ui-craft-reviewer',
      kind: 'SUBAGENT',
      name: 'Revue Craft UI, Finitions et Accessibilité',
      description: 'Revue indépendante de l ergonomie, des finitions visuelles, des états UI et de l accessibilité.',
      sourceRelativePath: 'agents/ui-craft-reviewer.md',
      sourceUrl: 'https://github.com/emilkowalski/skills',
      license: 'MIT',
      contentSha256: sha(uiReviewerContent),
      rawContent: uiReviewerContent,
      adaptedContent: uiReviewerContent,
      parsedMeta: {
        sourceId: 'curated',
        sourcePriority: 100,
        family: 'design-engineering',
        tags: ['design-engineering', 'ui-polish', 'craft', 'accessibility', 'reviewer'],
        languages: [],
        frameworks: [],
        dependencies: [],
        hasResources: false,
        resourcesList: [],
        skippedUnsafeFiles: [],
        adaptationNotes: ['Curated excellence subagent for Google Antigravity'],
      },
      compatibilityStatus: 'AUTO_VALIDATED',
      compatibilityIssues: [],
      searchText: 'ui craft reviewer accessibility 5 states finish design polish',
    },
  ];
}
