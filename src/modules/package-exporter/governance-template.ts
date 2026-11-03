import { ReasoningEffortTier, RecommendedModelTier } from '../antigravity-adapter/schema';

export interface SubagentGovernanceEntry {
  slug: string;
  roleTitle: string;
  recommendedModelTier: RecommendedModelTier;
  recommendedEffort: ReasoningEffortTier;
  qualityCostRecommendation: string;
}

/**
 * Formate de manière canonique un couple unique (Modèle — Effort).
 */
export function formatModelEffortCouple(
  modelTier: RecommendedModelTier,
  effort: ReasoningEffortTier
): string {
  const modelLabel = modelTier === 'flash' ? 'Flash' : 'Pro';
  const effortLabel = effort.charAt(0).toUpperCase() + effort.slice(1);
  return `${modelLabel} — Effort ${effortLabel}`;
}

/**
 * Génère le corps Markdown de la règle active `.agents/rules/model-effort-governance.md` (`trigger: always_on`).
 * Cette règle centralise le choix du couple (Modèle / Niveau d'effort) hors du frontmatter YAML des agents
 * et impose à l'agent principal une vérification coût/performance systématique avant chaque tâche.
 */
export function renderModelEffortGovernanceRuleBody(params: {
  projectName: string;
  targetSurface: string;
  subagents: readonly SubagentGovernanceEntry[];
}): string {
  const { projectName, targetSurface, subagents } = params;

  const subagentsRows =
    subagents.length > 0
      ? subagents
          .map(
            (a) =>
              `| \`${a.slug}\` | ${a.roleTitle} | **\`${formatModelEffortCouple(a.recommendedModelTier, a.recommendedEffort)}\`** | ${a.qualityCostRecommendation} |`
          )
          .join('\n')
      : `| *(Agent principal)* | Exécution directe sans sous-agent dédié | **Selon palier T1–T4** | Appliquer le palier correspondant à la tâche courante. |`;

  return `# Gouvernance Centralisée du Couple Modèle / Niveau d'Effort — ${projectName}

Aucun sous-agent (\`.agents/agents/*.md\`) ne contient de champ \`model\` dans son frontmatter YAML. Le choix du couple **Modèle / Niveau d'effort** est intégralement centralisé dans cette règle active (et détaillé dans \`docs/ORCHESTRATION.md\`) pour la surface **${targetSurface}**.

## 1. Gouvernance et Recommandation Pré-Tâche (Ratio Coût / Performance)

**Avant d'exécuter chaque tâche**, l'agent principal évalue le couple \`(Modèle / Niveau d'effort)\` optimal permettant d'obtenir le meilleur ratio coût / performance :

1. **Tâches courantes (Paliers T1, T2, T3) — Recommandation consultative non-bloquante :**
   - Identifier le réglage actif dans la session (\`Model Selection\` ou \`<USER_SETTINGS_CHANGE>\`).
   - Si le couple optimal est **identique** (ou le même que celui qui est paramétré), lancer la tâche **automatiquement** et immédiatement.
   - En cas d'écart sur une tâche standard (T1 à T3), l'agent formule **un seul couple préconisé** à titre indicatif et poursuit la tâche sans bloquer ni interrompre l'utilisateur.
2. **Tâches critiques (Palier T4) — Validation explicite :**
   - Pour les opérations critiques (architecture structurelle, refonte de sécurité, migrations de schéma destructives), l'agent s'arrête et demande à l'utilisateur de modifier ses paramètres (\`Model Selection\`) avec **un seul couple préconisé** (\`Pro — Effort High\`) avant d'engager des modifications irréversibles.

## 2. Matrice Décisionnelle par Palier de Tâche

| Palier | Typologie de Tâche | Couple Unique Préconisé | Justification Coût / Performance |
| :--- | :--- | :--- | :--- |
| **T1 — Léger & Documentaire** | Questions simples, recherche ponctuelle, formatage, mise à jour de README / codemaps | **\`Flash — Effort Low\`** | Latence minimale et coût très réduit ; un modèle lourd gaspillerait des tokens sans gain de qualité. |
| **T2 — Localisé & Vérification** | Modification bornée (1 fichier sans impact d'architecture), exécution de tests existants, calculs de validation et sommes de contrôle (ex: Modulo 97 SEPA) | **\`Flash — Effort Medium\`** | Équilibre rapidité/fiabilité idéal pour les opérations courantes et bien balisées. |
| **T3 — Ingénierie Standard & TDD** | Développement de fonctionnalités (UI, routes API + Zod, requêtes ORM), cycle TDD Red-Green-Refactor, nettoyage de code mort, corrections d'erreurs de build/types | **\`Pro — Effort Medium\`** | Haute précision multi-fichiers et typage sûr sans payer le surcoût maximal de réflexion profonde à chaque itération. |
| **T4 — Architecture, Sécurité & Critique** | Planification \`/plan\` multi-modules, schéma DB/migrations destructives, algorithmes ardus, debugging complexe, optimisation critique, revue de code et audit de sécurité OWASP | **\`Pro — Effort High\`** | Raisonnement approfondi indispensable pour prévenir les failles de sécurité, angles morts et régressions structurelles. |

> **Précision importante :** Les contrôles arithmétiques de saisie (comme le Modulo 97 ISO 7064 pour les IBAN/RIB SEPA) sont des algorithmes de validation simples (Palier T2) et ne doivent pas être confondus avec des opérations cryptographiques lourdes (Palier T4).

> **Adaptation au sélecteur Antigravity (\`Model Selection\`) :** Traduire le palier (\`Flash\` ou \`Pro\`) vers le libellé exact de la génération active dans Antigravity lorsqu'il est connu dans la session, en formulant toujours **un seul couple préconisé**.

## 3. Couples Préconisés pour les Sous-Agents (\`.agents/agents/\`)

Lors d'une délégation (\`invoke_subagent\`), les sous-agents héritent par défaut du modèle actif validé pour la tâche selon cette table :

| Sous-Agent | Rôle | Couple Unique Préconisé | Justification Coût / Performance |
| :--- | :--- | :--- | :--- |
${subagentsRows}
`;
}
