import { ProjectProfile } from '../project-profile/schema';
import { SelectionResult } from '../selection-engine/schema';

export interface OrchestrationPlanOptions {
  includeModelEffortGuidance?: boolean;
}

/**
 * Générateur du plan d'orchestration multi-agents conforme au §6 et à l'ADR-02.
 * Respecte strictement la distinction entre `model` (paramètre YAML officiel)
 * et `effort` (directive textuelle indicative en prompt).
 */
export function generateOrchestrationPlan(
  profile: ProjectProfile,
  selection: SelectionResult,
  _options: OrchestrationPlanOptions = {}
): string {
  const targetSurface = profile.targetSurface;
  const projectName = profile.projectName;

  // Extraction des rôles pertinents en fonction des fonctionnalités et sous-agents sélectionnés
  const selectedAgents = selection.selectedComponents.filter((c) => c.kind === 'SUBAGENT');

  return `# Plan d'Orchestration Multi-Agents — ${projectName}

> **Surface cible** : Google Antigravity (${targetSurface})  
> **Mode de génération** : ${selection.presetMode}  
> **Conformité technique** : Modèle natif Antigravity (ADR-02 : dissociation 'model' YAML vs 'effort' indicatif)

---

## 1. Principes d'Orchestration & Décomposition Atomique (§6)

1. **Atomicité des tâches** : Chaque sous-agent reçoit une tâche unitaire bornée, testable et assortie de critères d'acceptation univoques.
2. **Moindre privilège** : Chaque rôle ne dispose que des outils strictement nécessaires à sa mission (lecture seule pour la revue/sécurité, écriture pour l'implémentation).
3. **Indépendance des modèles et effort** :
   - Le paramètre \`model\` dans les sous-agents Antigravity est strictement typé (\`inherit\`, \`flash\`, \`pro\`).
   - Le niveau de réflexion (\`effort\`: *low*, *medium*, *high*) est transmis comme **directive consultative** dans les prompts et la documentation opérationnelle, sans dépendance vis-à-vis d'une API propriétaire.
4. **Non-régression continue** : Tout incrément de code produit par un sous-agent doit être validé par les tests avant d'être validé par l'agent parent.

---

## 2. Catalogue des Rôles Spécialisés

| Rôle | Description & Responsabilité | Modèle YAML | Effort Recommandé | Outils Autorisés |
| :--- | :--- | :--- | :--- | :--- |
| **Architect** | Architecture globale, schéma de données, respect des contraintes | \`pro\` | **High** (réflexion approfondie) | Lecture, Analyse, Documentation |
| **Frontend Engineer** | Composants UI, accessibilité, intégration du Design System | \`inherit\` | **Medium** | Fichiers, Commandes de test UI |
| **Backend Engineer** | Logique métier, endpoints API, sécurité des données, requêtes DB | \`inherit\` | **Medium** | Fichiers, Commandes shell, DB |
| **Security Reviewer** | Audit de sécurité, détection des vulnérabilités (OWASP, injections) | \`pro\` | **High** | Lecture seule, Analyse statique |
| **QA & Verification** | Exécution des tests unitaires, d'intégration et validation des AC | \`flash\` | **Low** (rapide & déterministe) | Commandes de test, Lecture |

${
  selectedAgents.length > 0
    ? `\n### Rôles Complémentaires Issus du Catalogue :\n` +
      selectedAgents
        .map(
          (a) =>
            `- **${a.name}** (\`${a.slug}\`) : ${a.acceptedRationale}`
        )
        .join('\n')
    : ''
}

---

## 3. Plan de Développement en Phases (Séquentiel & Parallèle)

\`\`\`mermaid
flowchart TD
    subgraph Phase1["Phase 1 : Cadrage & Architecture (Série)"]
        P1A["Analyse des Spécifications (Architect - Effort High)"] --> P1B["Validation du Schéma DB & API Contracts"]
    end

    subgraph Phase2["Phase 2 : Fondations (Série)"]
        P2A["Initialisation du Workspace & Configuration"] --> P2B["Mise en place de la CI & Suite de Tests"]
    end

    subgraph Phase3["Phase 3 : Développement Parallèle (Fork/Join)"]
        P3_Fork((Fork))
        P3_FE["Frontend : Composants & Pages UI (Frontend Engineer)"]
        P3_BE["Backend : Modèles, Services & API (Backend Engineer)"]
        P3_Join((Join))
        
        P3_Fork --> P3_FE
        P3_Fork --> P3_BE
        P3_FE --> P3_Join
        P3_BE --> P3_Join
    end

    subgraph Phase4["Phase 4 : Audit de Sécurité & Tests Croisés (Série)"]
        P4A["Audit Sécurité & Injections (Security Reviewer)"] --> P4B["Tests E2E & Vérification des AC (QA)"]
    end

    subgraph Phase5["Phase 5 : Packaging & Recette Finale (Série)"]
        P5A["Validation de la documentation & Déploiement"]
    end

    Phase1 --> Phase2
    Phase2 --> P3_Fork
    P3_Join --> Phase4
    Phase4 --> Phase5
\`\`\`

---

## 4. Matrice de Passage de Relais (Handoff Matrix)

1. **De l'Architecte aux Développeurs** :
   - Livrables : Contrats d'API (\`openapi.json\` ou interfaces TypeScript) et schémas relationnels validés.
   - Condition de passage : Aucune incertitude critique résiduelle dans \`docs/ASSUMPTIONS.md\`.
2. **Du Développement à la Sécurité** :
   - Livrables : Code source complet et couverture de tests unitaires passante.
   - Condition de passage : Zéro échec aux tests statiques de linter et vérification de type.
3. **De la Sécurité à la QA** :
   - Livrables : Rapport d'audit de sécurité sans vulnérabilité bloquante.
4. **De la QA à la Livraison** :
   - Livrables : Rapport de recette attestant du respect des critères d'acceptation du fichier \`ACCEPTANCE_CRITERIA.md\`.
`;
}
