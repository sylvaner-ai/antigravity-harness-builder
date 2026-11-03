import { ProjectProfile } from '../project-profile/schema';
import { SelectionResult } from '../selection-engine/schema';

export interface GeneratedDocs {
  projectSpec: string;
  designSystem: string;
  architecture: string;
  acceptanceCriteria: string;
  assumptions: string;
  startHere: string;
}

export function generateHarnessDocumentation(
  profile: ProjectProfile,
  selection: SelectionResult
): GeneratedDocs {
  return {
    projectSpec: buildProjectSpecDoc(profile),
    designSystem: buildDesignSystemDoc(profile),
    architecture: buildArchitectureDoc(profile),
    acceptanceCriteria: buildAcceptanceCriteriaDoc(profile),
    assumptions: buildAssumptionsDoc(profile),
    startHere: buildStartHereDoc(profile, selection),
  };
}

function buildProjectSpecDoc(profile: ProjectProfile): string {
  return `# Spécification Fonctionnelle du Projet — ${profile.projectName}

> **Description globale** : ${profile.projectDescription}  
> **Surface cible Antigravity** : ${profile.targetSurface}  
> **Domaine & Objectif** : ${profile.domainAndObjective?.value ?? 'Non spécifié'} (Source : ${profile.domainAndObjective?.epistemicStatus})

---

## 1. Rôles et Personas Cibles

${
  (profile.personasAndRoles ?? []).length > 0
    ? profile.personasAndRoles
        .map(
          (p, i) =>
            `### ${i + 1}. ${p.value}\n- **Statut épistémique** : \`${p.epistemicStatus}\`${p.confidence ? ` (Confiance: ${p.confidence})` : ''}\n- **Justification** : ${p.rationale ?? 'Spécifié dans les documents source'}`
        )
        .join('\n\n')
    : '_Aucun persona défini._'
}

---

## 2. Fonctionnalités Détaillées & Exigences Métier

${
  (profile.features ?? []).length > 0
    ? profile.features
        .map(
          (f, i) => `### 2.${i + 1} ${f.title} (Priorité : \`${f.priority}\`)
- **Description** : ${f.description}
- **Statut épistémique** : \`${f.epistemicStatus}\`
- **Critères d'acceptation initiaux** :
${f.acceptanceCriteria.map((ac) => `  * [ ] ${ac}`).join('\n')}`
        )
        .join('\n\n')
    : '_Aucune fonctionnalité spécifiée._'
}

---

## 3. Notes Complémentaires & Préférences Projet

- **Contraintes de déploiement** : ${profile.supplementaryNotes?.deploymentConstraints ?? 'Standard'}
- **Exigences réglementaires** : ${profile.supplementaryNotes?.regulatoryRequirements ?? 'Standard'}
- **Niveau d'exigence qualité** : ${profile.supplementaryNotes?.qualityLevel ?? 'Élevé'}
`;
}

function buildDesignSystemDoc(profile: ProjectProfile): string {
  const ds = profile.designSystem;
  const colors = ds?.colorTokens ?? {};
  const typography = ds?.typography;
  const fontFamilies = typography?.fontFamilies ?? {};
  const fontSans = fontFamilies['sans'] ?? fontFamilies['body'] ?? 'Inter, system-ui, sans-serif';
  const fontMono = fontFamilies['mono'] ?? fontFamilies['code'] ?? 'ui-monospace, monospace';

  return `# Guide du Design System & Règles Graphiques — ${profile.projectName}

> **Identité de marque** : ${ds?.brandIdentity ?? profile.projectName}  
> **Statut de l'extraction** : ${ds?.epistemicStatus ?? 'explicit'}

---

## 1. Principes Directeurs & Règles UX

${
  (ds?.uxAndAccessibilityRules ?? []).length > 0
    ? ds.uxAndAccessibilityRules.map((p) => `- ${p}`).join('\n')
    : `- Interface utilisateur sobre, prévisible et rapide.\n- Contraste suffisant et navigation clavier complète (WCAG 2.1 AA).`
}

---

## 2. Palette de Couleurs & Tokens

${
  Object.keys(colors).length > 0
    ? Object.entries(colors)
        .map(([name, val]) => `- **${name}** : \`${val}\``)
        .join('\n')
    : '- **Primaire** : `#0f172a`\n- **Secondaire** : `#3b82f6`\n- **Fond** : `#ffffff`'
}

---

## 3. Typographie

- **Police Sans-serif (Corps & UI)** : \`${fontSans}\`
- **Police Monospace (Code & Logs)** : \`${fontMono}\`
- **Échelle & Rythme** : ${typography?.scaleNotes || 'Base 16px, échelle modulaire standard'}

---

## 4. Consignes d'Accessibilité & Intégration

- Tout composant interactif (\`button\`, \`a\`, \`input\`) doit être accessible au clavier avec focus visible.
- Ratio de contraste texte / fond minimal conforme à WCAG 2.1 AA (minimum 4.5:1 pour le texte normal).
`;
}

function buildArchitectureDoc(profile: ProjectProfile): string {
  const stack = profile.techStack;

  return `# Architecture Technique — ${profile.projectName}

> **Statut épistémique de la stack** : \`${stack?.epistemicStatus ?? 'explicit'}\`  
> **Niveau de confiance** : \`${stack?.confidence ?? 'high'}\`

---

## 1. Stack Technique Normalisée

- **Langages** : ${(stack?.languages ?? []).join(', ') || 'TypeScript'}
- **Frameworks** : ${(stack?.frameworks ?? []).join(', ') || 'Next.js, React'}
- **Bases de données & Persistance** : ${(stack?.databases ?? []).join(', ') || 'PostgreSQL'}
- **Infrastructure & Conteneurs** : ${(stack?.infrastructureAndDeployment ?? []).join(', ') || 'Docker, Linux'}
- **Outils de test** : ${(stack?.testingTools ?? []).join(', ') || 'Vitest, Playwright'}

---

## 2. Contraintes d'Architecture Déclarées

${
  (profile.architectureConstraints ?? []).length > 0
    ? profile.architectureConstraints
        .map(
          (c, i) =>
            `### 2.${i + 1} ${c.value}\n- **Statut** : \`${c.epistemicStatus}\`\n- **Raison d'être** : ${c.rationale ?? 'Contrainte structurelle déclarée'}`
        )
        .join('\n\n')
    : '_Aucune contrainte architecturale particulière spécifiée._'
}

---

## 3. Sécurité et Conformité

${
  (profile.securityAndCompliance ?? []).length > 0
    ? profile.securityAndCompliance
        .map(
          (s, i) =>
            `### 3.${i + 1} ${s.value}\n- **Statut** : \`${s.epistemicStatus}\`\n- **Exigence** : ${s.rationale ?? 'Politique de sécurité impérative'}`
        )
        .join('\n\n')
    : '_Règles générales de sécurité du web (OWASP Top 10)._'
}

---

## 4. Stratégie de Test et Qualité

${
  (profile.qualityAndTestingStrategy ?? []).length > 0
    ? profile.qualityAndTestingStrategy
        .map((q, i) => `### 4.${i + 1} ${q.value}\n- **Statut** : \`${q.epistemicStatus}\``)
        .join('\n\n')
    : '- Tests unitaires systématiques sur les fonctions métier critiques.\n- Tests d\'intégration sur les flux de données.'
}
`;
}

function buildAcceptanceCriteriaDoc(profile: ProjectProfile): string {
  return `# Matrice des Critères d'Acceptation — ${profile.projectName}

Ce document liste l'ensemble des critères d'acceptation requis pour valider le projet.
Chaque incrément logiciel doit cocher les critères correspondants.

---

${
  (profile.features ?? []).length > 0
    ? profile.features
        .map(
          (f, idx) => `## Feature ${idx + 1} : ${f.title} (\`${f.priority}\`)

${f.acceptanceCriteria.map((ac, cIdx) => `- [ ] **AC-${idx + 1}.${cIdx + 1}** : ${ac}`).join('\n')}
`
        )
        .join('\n')
    : '_Aucune fonctionnalité définie dans le profil._'
}
`;
}

function buildAssumptionsDoc(profile: ProjectProfile): string {
  const uncertainties = profile.uncertainties ?? [];

  return `# Registre des Hypothèses, Manques et Décisions — ${profile.projectName}

> **Règle absolue (§3.3 & §15.1)** : Aucune information manquante ou contradictoire n'est inventée silencieusement par le système.
> Tout point d'incertitude fait l'objet d'un arbitrage consigné dans ce registre.

---

## 1. Tableau des Incertitudes et Points d'Arbitrage

| ID | Catégorie | Sujet / Composant | Constat ou Hypothèse | Impact | Décision / Fallback Proposé | Arbitrage Humain Requis |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${
  uncertainties.length > 0
    ? uncertainties
        .map((u, idx) => {
          const decisionCol = u.isResolved
            ? `**VALIDÉ :** ${(u.userResolution || u.proposedFallback).replace(/\|/g, '-')}`
            : u.proposedFallback.replace(/\|/g, '-');
          const reqCol = u.isResolved ? 'RÉSOLU' : (u.requiresHumanDecision ? '**OUI**' : 'Non');
          return `| **UNC-${idx + 1}** | \`${u.category}\` | ${u.topic} | ${u.statement.replace(/\|/g, '-')} | \`${u.impact}\` | ${decisionCol} | ${reqCol} |`;
        })
        .join('\n')
    : '| - | - | _Aucune incertitude critique détectée._ | - | - | - | - |'
}

---

## 2. Procédure de Levée des Hypothèses

1. Tout élément marqué avec \`requiresHumanDecision: OUI\` doit être confirmé par le responsable technique avant la mise en production du module concerné.
2. Lorsqu'une décision est arrêtée, son statut dans ce document doit être mis à jour avec la date et le nom de l'arbitre.
`;
}

function buildStartHereDoc(profile: ProjectProfile, selection: SelectionResult): string {
  return `# Guide de Démarrage Rapide (Harnais Antigravity) — ${profile.projectName}

Félicitations ! Votre harnais de développement pour **Google Antigravity** a été généré avec succès.

- **Surface cible** : Google Antigravity (\`${profile.targetSurface}\`)
- **Composants inclus** : ${selection.selectedComponents.length} composants ECC adaptés + ${selection.customComponents.length} sur mesure.
- **Budget de règles** : ${selection.budgetCompliance.rulesBudgetTokens} / 20 000 tokens (${selection.budgetCompliance.rulesBudgetPercent}% du quota \`always_on\`).

---

## 1. Installation du Harnais dans Antigravity

1. **Extraction de l'archive** :
   Décompressez l'archive \`harness.zip\` à la racine de votre workspace :
   \`\`\`bash
   unzip -o harness.zip -d /votre/projet/
   \`\`\`

2. **Vérification de l'arborescence** :
   \`\`\`text
   .agents/
     ├── rules/           # Règles d'ingénierie et conventions
     ├── skills/          # Compétences et workflows outillés
     ├── subagents/       # Sous-agents spécialisés
     └── system.md        # Prompt système racine
   docs/
     ├── ORCHESTRATION.md # Plan multi-agents complet (Phases & Rôles)
     ├── PROJECT_SPEC.md  # Spécifications métier
     ├── DESIGN_SYSTEM.md # Charte graphique et tokens
     ├── ARCHITECTURE.md  # Architecture logicielle
     └── ASSUMPTIONS.md   # Hypothèses & arbitrages
   harness.manifest.json  # Manifeste d'intégrité déterministe
   \`\`\`

---

## 2. Lancement de l'Orchestration

Selon la surface Antigravity ciblée (\`${profile.targetSurface}\`) :

### A. Dans Google Antigravity (App / IDE)
- Ouvrez le projet dans Antigravity.
- **Fonctionnement naturel** : Dialoguez simplement avec l'agent principal. Il applique automatiquement vos règles transverses et invoque de lui-même les sous-agents spécialisés (architecte, base de données, revue de code) via ses outils internes.
- **Commandes utilisateur optionnelles (slash commands)** :
  * \`/plan\` : Pour explorer le code, poser les questions utiles et valider un plan avant le codage.
  * \`/goal\` : Pour mener un jalon à son terme sans interruption une fois le plan validé.
  * \`/teamwork\` : Pour un chantier de grande ampleur confié à une équipe d'agents.
  * \`/boost\` : Pour un bogue ou un algorithme difficile.
  * \`/learn\` : Pour transformer vos corrections de session en règles ou skills persistants.

### B. En ligne de commande (Antigravity CLI \`agy\`)
\`\`\`bash
# Vérification des compétences disponibles
agy skills list

# Lancement de la première phase (Architecture)
agy prompt "Mission 1 : Initialisation des fondations selon docs/ORCHESTRATION.md"
\`\`\`

---

## 3. Bonnes Pratiques

- **Préservation des conventions** : Ne modifiez pas manuellement les fichiers de \`.agents/\` sans mettre à jour le manifeste.
- **Hypothèses ouvertes** : Consultez \`docs/ASSUMPTIONS.md\` avant de démarrer pour vérifier les choix techniques par défaut.
`;
}
