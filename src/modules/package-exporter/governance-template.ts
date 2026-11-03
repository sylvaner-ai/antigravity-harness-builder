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
 *
 * La règle est lue à chaque requête : elle doit rester courte (environ 2,5 Ko). Le détail par sous-agent
 * n'y figure donc pas ; il est publié dans `docs/ORCHESTRATION.md`. Le paramètre `subagents` est conservé
 * pour la compatibilité des appelants et n'est plus rendu ici.
 */
export function renderModelEffortGovernanceRuleBody(params: {
  projectName: string;
  targetSurface: string;
  subagents?: readonly SubagentGovernanceEntry[];
}): string {
  const { projectName, targetSurface } = params;

  return `# Gouvernance Modèle / Effort — ${projectName}

Surface : ${targetSurface}. Le modèle et l'effort se règlent dans l'interface (\`Model Selection\`) : vous ne pouvez pas les modifier vous-même, vous les recommandez à l'utilisateur. Aucun sous-agent ne fige de champ \`model\` ; le couple conseillé par rôle figure dans \`docs/ORCHESTRATION.md\`.

## 1. Quand intervenir (proportionnalité)

1. **Tâche courte** (question, relecture, correction bornée dans un seul fichier, formatage) : exécutez-la directement, sans commentaire sur le modèle.
2. **Tâche longue ou à enjeu** (plusieurs fichiers ou étapes, fonctionnalité complète, débogage prolongé, audit) : **avant d'exécuter la tâche**, une seule fois, comparez le réglage actif à la matrice ci-dessous.
   - Couple identique ou écart sans conséquence : lancez la tâche **automatiquement**.
   - Écart net : écrivez une ligne — « Réglage conseillé pour cette tâche : \`<couple>\`. Je poursuis avec le réglage actuel, dites-moi si vous préférez le changer. » — puis poursuivez. Donnez **un seul couple préconisé**, jamais une liste d'options.
3. **Tâche critique et irréversible** (palier T4 : migration destructive, refonte d'architecture ou de sécurité) : si le réglage actif est inférieur au couple préconisé, **arrêtez-vous** et demandez à l'utilisateur de modifier \`Model Selection\` avant toute modification.
4. **Réglage actif inconnu** : ne le devinez pas. Indiquez le couple conseillé en une ligne et poursuivez (tâche longue), ou demandez confirmation (T4).
5. Ne reposez pas la question pendant un même chantier, sauf si le travail change de palier.

## 2. Matrice coût / performance

| Palier | Tâches | Couple préconisé |
| :--- | :--- | :--- |
| **T1** Léger | Questions, recherche ponctuelle, documentation, formatage | \`Flash — Effort Low\` |
| **T2** Localisé | Modification bornée, exécution de tests existants, vérifications de saisie | \`Flash — Effort Medium\` |
| **T3** Standard | Fonctionnalités, routes API, TDD, corrections de build ou de types | \`Pro — Effort Medium\` |
| **T4** Critique | Architecture, schéma de base de données, sécurité, débogage difficile, revue finale | \`Pro — Effort High\` |

Traduisez Flash / Pro vers le libellé exact du sélecteur lorsqu'il est visible dans la session.

## 3. Délégation à un sous-agent

Déléguez uniquement une sous-tâche **indépendante, bornée et volumineuse** (exploration large, revue indépendante, travail parallèle sans collision de fichiers). Une tâche courte se traite directement. Chaque délégation précise l'objectif, les fichiers concernés et le livrable attendu.
`;
}
