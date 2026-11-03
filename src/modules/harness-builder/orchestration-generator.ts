import { renderSlashCommandTable, SLASH_COMMAND_SUGGESTION_POLICY } from '../package-exporter/slash-commands';
import { ProjectProfile } from '../project-profile/schema';
import { SelectionResult } from '../selection-engine/schema';
import { inferRecommendedModelEffortPair } from '../antigravity-adapter/adapter';
import { formatModelEffortCouple } from '../package-exporter/governance-template';

export interface OrchestrationPlanOptions {
  includeModelEffortGuidance?: boolean;
}

/**
 * Générateur du plan d'orchestration multi-agents conforme au §6.
 * Aucun champ `model` n'est inscrit dans le frontmatter YAML des sous-agents :
 * le couple (Modèle / Niveau d'effort) est piloté de manière centralisée
 * via `.agents/rules/model-effort-governance.md` et ce document.
 */
export function generateOrchestrationPlan(
  profile: ProjectProfile,
  selection: SelectionResult,
  _options: OrchestrationPlanOptions = {}
): string {
  const targetSurface = profile.targetSurface;
  const projectName = profile.projectName;

  const selectedAgents = selection.selectedComponents.filter((c) => c.kind === 'SUBAGENT');
  const customAgents = selection.customComponents.filter((c) => c.kind === 'SUBAGENT');
  const allAgents = [...selectedAgents, ...customAgents];

  const selectedSkills = selection.selectedComponents.filter(
    (c) => c.kind === 'SKILL' || c.kind === 'COMMAND_CONVERTED'
  );

  const hasDb =
    (profile.techStack?.databases ?? []).length > 0 ||
    (profile.techStack?.ormAndDataLayer ?? []).length > 0;
  const hasUi =
    (profile.techStack?.frameworks ?? []).some((f) => /react|next|vue|tailwind/i.test(f)) ||
    Boolean(profile.designSystem?.brandIdentity);
  const hasSecReviewer = allAgents.some((a) => a.slug.includes('security') || a.slug.includes('audit'));
  const hasCodeReviewer = allAgents.some((a) => a.slug.includes('review'));

  const agentsTable =
    allAgents.length > 0
      ? allAgents
          .map((a) => {
            const isReviewer = a.slug.includes('reviewer') || a.slug.includes('security') || a.slug.includes('audit');
            const pair = inferRecommendedModelEffortPair({
              slug: a.slug,
              isIndependentReviewer: isReviewer,
            });
            const tier =
              ('recommendedModelTier' in a && a.recommendedModelTier) || pair.recommendedModelTier;
            const effort =
              ('recommendedEffort' in a && a.recommendedEffort) || pair.recommendedEffort;
            const couple = formatModelEffortCouple(tier, effort);
            const tools = isReviewer ? 'Lecture seule, Analyse' : 'Fichiers, Commandes shell, Analyse';
            return `| **${a.name}** (\`${a.slug}\`) | ${a.description} | **\`${couple}\`** | ${tools} |`;
          })
          .join('\n')
      : `| **Architect** | Architecture globale, schéma de données, respect des contraintes | **\`Pro — Effort High\`** | Lecture, Analyse, Documentation |
| **Frontend Engineer** | Composants UI, accessibilité, intégration du Design System | **\`Pro — Effort Medium\`** | Fichiers, Commandes de test UI |
| **Backend Engineer** | Logique métier, endpoints API, sécurité des données | **\`Pro — Effort Medium\`** | Fichiers, Commandes shell, DB |
| **Security Reviewer** | Audit de sécurité, détection des vulnérabilités | **\`Pro — Effort High\`** | Lecture seule, Analyse statique |
| **QA & Verification** | Exécution des tests unitaires et validation des AC | **\`Flash — Effort Medium\`** | Commandes de test, Lecture |`;

  const skillsByPhase: Record<string, string[]> = {
    'Cadrage & Exploration': [],
    'Conception & API': [],
    'Persistance & Schéma': [],
    'Interface & Finitions': [],
    'Rigueur & Tests TDD': [],
    'Revue & Sécurité': [],
  };

  const addSkillToPhase = (phase: string, slug: string) => {
    const list = skillsByPhase[phase];
    if (list) {
      list.push(`\`${slug}\``);
    }
  };

  for (const s of selectedSkills) {
    const slug = s.slug.toLowerCase();
    if (slug.includes('onboarding') || slug.includes('prompt') || slug.includes('architect') || slug.includes('sort')) {
      addSkillToPhase('Cadrage & Exploration', s.slug);
    } else if (slug.includes('api') || slug.includes('backend')) {
      addSkillToPhase('Conception & API', s.slug);
    } else if (slug.includes('prisma') || slug.includes('drizzle') || slug.includes('sql') || slug.includes('database') || slug.includes('mysql') || slug.includes('mybatis')) {
      addSkillToPhase('Persistance & Schéma', s.slug);
    } else if (slug.includes('frontend') || slug.includes('react') || slug.includes('ui') || slug.includes('web')) {
      addSkillToPhase('Interface & Finitions', s.slug);
    } else if (slug.includes('test') || slug.includes('tdd') || slug.includes('regression')) {
      addSkillToPhase('Rigueur & Tests TDD', s.slug);
    } else if (slug.includes('security') || slug.includes('review') || slug.includes('standards') || slug.includes('git')) {
      addSkillToPhase('Revue & Sécurité', s.slug);
    } else {
      addSkillToPhase('Cadrage & Exploration', s.slug);
    }
  }

  const phaseRoles: Record<string, string> = {
    'Cadrage & Exploration': 'Agent Principal, Architect',
    'Conception & API': 'Backend Engineer, Agent Principal',
    'Persistance & Schéma': 'Backend Engineer',
    'Interface & Finitions': 'Frontend Engineer',
    'Rigueur & Tests TDD': 'QA, Développeur',
    'Revue & Sécurité': 'Security / Code Reviewer',
  };

  const phaseTriggers: Record<string, string> = {
    'Cadrage & Exploration': 'Exploration initiale et formulation de prompts',
    'Conception & API': "Définition des schémas d'API et routes",
    'Persistance & Schéma': 'Écriture de requêtes SQL et migrations',
    'Interface & Finitions': 'Développement des composants et respect du Design System',
    'Rigueur & Tests TDD': 'Avant toute implémentation (Red-Green-Refactor)',
    'Revue & Sécurité': 'Inspection préalable à toute fusion de code',
  };

  const skillsMatrixRows = Object.entries(skillsByPhase)
    .map(([phase, list]) => {
      const skillsStr = list.length > 0 ? list.join(', ') : '*(Règles et outils natifs)*';
      const role = phaseRoles[phase] ?? 'Agent Principal';
      const trigger = phaseTriggers[phase] ?? 'Selon besoins spécifiques';
      return `| **${phase}** | ${skillsStr} | ${role} | ${trigger} |`;
    })
    .join('\n');

  return `# Plan d'Orchestration Multi-Agents — ${projectName}

> **Surface cible** : Google Antigravity (${targetSurface})  
> **Mode de génération** : ${selection.presetMode}  
> **Gouvernance Modèle / Effort** : Centralisée dans \`.agents/rules/model-effort-governance.md\` (zéro \`model\` dans le YAML des sous-agents)

---

## 1. Principes d'Orchestration & Décomposition Atomique (§6)

1. **Atomicité des tâches** : Chaque sous-agent reçoit une tâche unitaire bornée, testable et assortie de critères d'acceptation univoques.
2. **Moindre privilège** : Chaque rôle ne dispose que des outils strictement nécessaires à sa mission (lecture seule pour la revue/sécurité, écriture pour l'implémentation).
3. **Modèle / Niveau d'effort** :
   - Aucun sous-agent ne fige de champ \`model\` dans son frontmatter YAML.
   - Conformément à \`.agents/rules/model-effort-governance.md\` : tâche courte = exécution directe ; tâche longue ou à enjeu = comparaison unique du réglage actif au couple conseillé, avec **un seul couple préconisé** en cas d'écart net ; tâche critique irréversible (T4) = arrêt et demande de modification de \`Model Selection\` si le réglage est insuffisant.
   - Une délégation n'est justifiée que pour une sous-tâche indépendante, bornée et volumineuse ; les agents de revue et d'audit sont en lecture seule.
4. **Non-régression continue** : Tout incrément de code produit par un sous-agent doit être validé par les tests avant d'être validé par l'agent parent.

---

## 2. Catalogue des Rôles Spécialisés

| Rôle | Description & Responsabilité | Couple Unique Préconisé | Outils Autorisés |
| :--- | :--- | :--- | :--- |
${agentsTable}

---

## 3. Plan de Développement en Phases (Séquentiel & Parallèle)

\`\`\`mermaid
flowchart TD
    subgraph Phase1["Phase 1 : Cadrage & Architecture (Série)"]
        P1A["Analyse des Spécifications (Effort High)"] --> P1B["Validation des Interfaces & Contrats Zod"]
        ${hasDb ? 'P1B --> P1C["Validation du Schéma DB & Migrations"]' : ''}
    end

    subgraph Phase2["Phase 2 : Rigueur TDD & Spécification des Tests (Série)"]
        P2A["Écriture des Tests Unitaires & Intégration en Échec (RED)"] --> P2B["Validation des Cas Limites & Mocks"]
    end

    subgraph Phase3["Phase 3 : Implémentation & Passage au Vert (Fork/Join)"]
        P3_Fork((Fork))
        ${hasUi ? 'P3_FE["Frontend : Composants, Design Tokens & 5 États UI"]' : ''}
        P3_BE["Backend : Services Métier, Validation Zod & Endpoints"]
        P3_Join((Join))
        
        ${hasUi ? 'P3_Fork --> P3_FE' : ''}
        P3_Fork --> P3_BE
        ${hasUi ? 'P3_FE --> P3_Join' : ''}
        P3_BE --> P3_Join
        P3_Join --> P3_Green["Tests au Vert (GREEN) & Refactoring (IMPROVE)"]
    end

    subgraph Phase4["Phase 4 : Audit Indépendant & Assurance Qualité (Série)"]
        ${hasSecReviewer ? 'P4A["Audit Sécurité & Injections (Lecture Seule)"] -->' : ''}
        ${hasCodeReviewer ? 'P4B["Revue Critique de Code & Architecture"] -->' : ''}
        P4C["Validation de Couverture Globale (> 80%) & Non-Régression"]
    end

    subgraph Phase5["Phase 5 : Livraison & Recette Finale (Série)"]
        P5A["Validation des Critères d'Acceptation (ACCEPTANCE_CRITERIA.md)"]
    end

    Phase1 --> Phase2
    Phase2 --> P3_Fork
    P3_Green --> Phase4
    Phase4 --> Phase5
\`\`\`

---

## 4. Matrice d'Activation des Compétences (Skills Matrix)

| Phase de Développement | Compétences (Skills) Mobilisables | Rôles Habilités | Déclencheur Opérationnel |
| :--- | :--- | :--- | :--- |
${skillsMatrixRows}

---

## 5. Protocole de Délégation et Handoff Inter-Agents

1. **Stratégie d'Isolation d'Espace de Travail (\`Workspace\`)** :
   - \`inherit\` : Pour les inspections rapides, les revues documentaires et les modifications unitaires.
   - \`share\` : Pour les travaux parallèles sur une même branche sans duplication de stockage.
   - \`branch\` : Pour les refactorisations lourdes ou les expérimentations isolées avec fusion contrôlée.

2. **Fiche de Mission pour Sous-Agent** :
   Toute délégation doit comporter :
   - **Objectif précis** : Le périmètre exact et les critères d'acceptation attendus.
   - **Fichiers concernés** : La liste fermée des chemins modifiables ou consultables.
   - **Contraintes** : Respect strict du Design System, 80% de couverture de tests et zéro console.log.
   - **Livrable de retour** : Résumé des modifications, résultat des tests exécutés et avertissements éventuels.

3. **Validation Préalable par l'Agent Parent** :
   L'agent parent ne valide l'intégration des travaux d'un sous-agent qu'après exécution des vérifications automatisées (\`npm test\`, \`npx tsc --noEmit\`, \`npm run lint\`).

---

## 6. Commandes Slash à Suggérer

${SLASH_COMMAND_SUGGESTION_POLICY}

${renderSlashCommandTable()}`;
}
