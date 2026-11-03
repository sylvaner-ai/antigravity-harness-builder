/**
 * Générateurs de prompts et scripts de mise à niveau déterministes et non-destructifs.
 * Extrait de templates.ts pour maintenir la cohésion et respecter le plafond de 800 lignes.
 */

import { renderSafeInstallScript } from './deploy-script';

/**
 * Assainit et valide la commande de smoke test issue de l'audit
 * pour empêcher toute injection de commandes shell hostiles (;, &&, ||, `, $(), etc.)
 */
export function sanitizeOperationalTestCommand(cmd?: string): string | undefined {
  if (!cmd || typeof cmd !== 'string') return undefined;
  const trimmed = cmd.trim();

  // Doit impérativement commencer par un gestionnaire de paquet ou exécuteur de test légitime
  const SAFE_TEST_RUNNERS = /^(npm|pnpm|yarn|bun|cargo|pytest|python3? -m unittest|go test|vitest|jest)\b/;
  if (!SAFE_TEST_RUNNERS.test(trimmed)) {
    return undefined;
  }

  // Interdire formellement tout caractère de chaînage, redirection, substitution ou subshell
  const DANGEROUS_CHARS = /[;&|`$><\\!]/;
  if (DANGEROUS_CHARS.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

/**
 * Identifie les fichiers essentiels d'exécution d'un harnais (incluant la règle
 * `.agents/rules/model-effort-governance.md` et `docs/ORCHESTRATION.md`) pour les modes d'export compacts.
 */
export function isEssentialHarnessFile(relativePath: string): boolean {
  return (
    relativePath === 'AGENTS.md' ||
    relativePath === 'README.md' ||
    relativePath === 'START_HERE.md' ||
    relativePath.startsWith('.agents/rules/') ||
    relativePath.startsWith('.agents/skills/') ||
    relativePath.startsWith('.agents/agents/') ||
    relativePath === 'docs/ORCHESTRATION.md' ||
    relativePath === 'docs/HARNESS_MANIFEST.json'
  );
}

/**
 * 11. Génère le prompt / script de déploiement Markdown autonome pour Google Antigravity.
 * Permet de déployer l'intégralité du harnais directement dans le workspace du projet
 * sans décompresser manuellement un fichier ZIP.
 */
export function renderDeploymentPromptMarkdown(params: {
  projectName: string;
  targetSurface?: string;
  files: Array<{ relativePath: string; content: string }>;
}): string {
  const { projectName, targetSurface = 'IDE', files } = params;

  // Calcul dynamique du nombre de backticks pour isoler les blocs de code imbriqués
  const getSafeFencing = (content: string): string => {
    const matches = content.match(/`+/g);
    const maxBackticks = matches ? Math.max(...matches.map((m) => m.length)) : 0;
    return '`'.repeat(Math.max(4, maxBackticks + 1));
  };

  const fileEntriesMarkdown = files
    .map((file) => {
      const fence = getSafeFencing(file.content);
      const ext = file.relativePath.endsWith('.json') ? 'json' : 'markdown';
      return `### Fichier : \`${file.relativePath}\`
${fence}${ext}
${file.content.trimEnd()}
${fence}`;
    })
    .join('\n\n');

  const filesSummary = files
    .map((f, i) => `${i + 1}. \`${f.relativePath}\``)
    .join('\n');

  return `# 🚀 Déploiement Direct du Harnais Antigravity — ${projectName}

> **Instructions pour l'agent Google Antigravity (${targetSurface})** :
> Ce document contient l'ensemble des règles, compétences, agents et spécifications d'ingénierie générés pour le projet **${projectName}**.
> Tu dois déployer directement et de manière idempotente ces éléments dans le répertoire racine du projet actif.

---

## Directives d'exécution pour Antigravity :

1. **Vérification du dossier cible** :
   - Assure-toi d'opérer à la racine de l'espace de travail du projet **${projectName}**.
   - Ne supprime aucun fichier applicatif existant.

2. **Écriture de l'arborescence et des fichiers** :
   - Crée automatiquement les sous-dossiers requis (\`.agents/rules/\`, \`.agents/skills/\`, \`.agents/agents/\`, \`docs/\`).
   - Écris fidèlement chacun des **${files.length} fichiers** ci-dessous à son chemin relatif exact à l'aide de tes outils de création de fichier.
   - Préserve l'intégralité exacte du contenu (frontmatters YAML, balises de configuration, retours à la ligne).

3. **Validation finale** :
   - Vérifie la présence des fichiers créés.
   - Les règles de \`.agents/rules/\` et compétences de \`.agents/skills/\` sont immédiatement actives.
   - Affiche un rapport de fin de déploiement listant les composants opérationnels.

---

## Sommaire des fichiers (${files.length}) :
${filesSummary}

---

## Fichiers à déployer :

${fileEntriesMarkdown}
`;
}

/**
 * 12. Génère le prompt de mise à niveau / rétrofit sécurisé pour projet existant.
 * Conçu pour être exécuté par un agent Antigravity avec un protocole strict en 5 phases.
 */
export function renderUpgradePromptMarkdown(params: {
  projectName: string;
  targetSurface?: string;
  files: Array<{ relativePath: string; content: string }>;
  operationalTestCommand?: string;
}): string {
  const { projectName, targetSurface = 'IDE', files, operationalTestCommand } = params;

  // Calcul du fence dynamique le plus long nécessaire
  let maxBackticks = 3;
  for (const file of files) {
    const matches = file.content.match(/`{3,}/g);
    if (matches) {
      for (const m of matches) {
        if (m.length >= maxBackticks) {
          maxBackticks = m.length + 1;
        }
      }
    }
  }
  const fence = '`'.repeat(Math.max(4, maxBackticks));

  const fileEntriesMarkdown = files
    .map((file) => {
      const ext = file.relativePath.endsWith('.json')
        ? 'json'
        : file.relativePath.endsWith('.ts')
          ? 'typescript'
          : file.relativePath.endsWith('.sh')
            ? 'bash'
            : 'markdown';

      return `### Fichier : \`${file.relativePath}\`
${fence}${ext}
${file.content}
${fence}`;
    })
    .join('\n\n');

  const filesSummary = files
    .map((f, i) => `${i + 1}. \`${f.relativePath}\``)
    .join('\n');

  const safeSmokeTest = sanitizeOperationalTestCommand(operationalTestCommand);

  const smokeTestInstructions = safeSmokeTest
    ? `3. **Exécution du Smoke Test de non-régression** :
   - Exécute la commande de vérification du projet : \`${safeSmokeTest}\`.
   - Confirme qu'aucune erreur ou régression n'a été causée par la mise à niveau.`
    : `3. **Vérification du code** :
   - Assure-toi que la configuration et les outils de build existants du projet demeurent intacts.`;

  return `# 🔄 Mise à Niveau Sécurisée du Harnais Antigravity — ${projectName}

> **Instructions pour l'agent Google Antigravity (${targetSurface})** :
> Tu es mandaté pour moderniser et mettre à niveau le harnais de développement du projet **${projectName}**.
> Tu dois opérer avec une **prudence absolue** en suivant scrupuleusement les 5 phases obligatoires ci-dessous afin de ne provoquer **aucune régression** dans la base de code existante.

---

## Protocole de Mise à Niveau en 5 Phases Obligatoires :

### Phase 1 — Sauvegarde automatique préalable (Snapshot Guard)
Avant toute modification ou création :
1. Crée un dossier de sauvegarde horodaté : \`.agents/.harness-backup/<YYYYMMDD-HHMMSS>/\`.
2. Avant de modifier ou de retirer un fichier existant (dont \`AGENTS.md\`), copie-le dans ce dossier en conservant son chemin relatif. Ne sauvegarde que les fichiers que tu vas réellement modifier.
3. Vérifie l'état Git (\`git status --porcelain\`). Si des changements non commités existent, signale-les avant de continuer.

### Phase 2 — Mode Simulation préalable (Dry-Run d'Impact)
Inspecte l'arborescence actuelle et présente un tableau récapitulatif des actions prévues :
- **\`[KEEP / PRESERVE]\`** : Fichiers et règles personnalisées rédigées par l'équipe qui ne font pas partie du catalogue géré — **Ne jamais écraser**.
- **\`[CREATE]\`** : Nouveaux composants inexistants dans le projet — **À créer**.
- **\`[SMART MERGE]\`** : Fichier \`AGENTS.md\` existant — **Fusionner uniquement dans les balises délimitées**.
- **\`[REPORT]\`** : Dossier obsolète \`.agents/workflows/\` si détecté — **Le signaler à l'utilisateur sans le déplacer ni le modifier** (proposer sa migration vers \`.agents/skills/\`).

Demande explicitement confirmation à l'utilisateur avant d'engager les écritures de la Phase 3.

### Phase 3 — Déploiement et Fusion Intelligente (Delimited Managed Sections)

1. **Règle d'or de fusion pour \`AGENTS.md\`** :
   - Si \`AGENTS.md\` n'existe pas : crée-le avec le contenu fourni ci-dessous.
   - Si \`AGENTS.md\` existe déjà :
     - Recherche les balises délimitées :
       \`<!-- BEGIN ANTIGRAVITY HARNESS BUILDER MANAGED -->\`
       et
       \`<!-- END ANTIGRAVITY HARNESS BUILDER MANAGED -->\`
     - Si ces balises sont présentes, remplace **exclusivement** le bloc contenu entre elles, en conservant intact tout le reste du fichier.
     - Si ces balises ne sont pas présentes, préserve les consignes existantes de l'équipe sous une section \`## Directives Spécifiques du Projet (Conservées)\` et insère le bloc géré ci-dessous avec les balises délimitées.

2. **Règles modulaires (\`.agents/rules/\`)** :
   - Écris ou mets à jour les règles répertoriées dans la liste des fichiers gérés.
   - Préserve toute règle tierce ou propre à l'équipe déjà présente dans \`.agents/rules/\`.
   - Si un fichier géré existe déjà avec un contenu différent, **ne l'écrase pas** : présente la différence à l'utilisateur et demande-lui de choisir (conserver, fusionner ou remplacer).

3. **Compétences (\`.agents/skills/\`) & Sous-agents (\`.agents/agents/\`)** :
   - Déploie les nouveaux skills et agents définis ci-dessous.
   - Assure-toi que chaque skill possède son \`SKILL.md\` avec frontmatter YAML valide.
   - **Ne modifie jamais** un sous-agent, une règle ou un skill préexistant du projet qui ne figure pas dans la liste des fichiers gérés (y compris son frontmatter YAML et sa clé \`model\`).

### Phase 4 — Éléments obsolètes
- Si le répertoire obsolète \`.agents/workflows/\` est présent, **signale-le** à l'utilisateur (dépréciation dans Antigravity 2.0) et propose-lui de le migrer vers \`.agents/skills/\`. Ne le déplace pas sans son accord.
- Ne supprime aucun fichier existant sans l'avoir sauvegardé puis signalé.
- Aucun fichier de code applicatif (\`src/\`, \`lib/\`, \`app/\`, \`.env\`) ne doit être touché.

### Phase 5 — Validation finale & Smoke Test
1. Vérifie la syntaxe de tous les fichiers créés ou modifiés.
2. Vérifie la validité des liens de documentation dans \`docs/\`.
${smokeTestInstructions}
4. Affiche un rapport de fin d'intervention récapitulant les composants modernisés, les éléments préservés et le chemin de la sauvegarde (\`.agents/.harness-backup/\`).

---

## Sommaire des ${files.length} fichiers gérés à intégrer :
${filesSummary}

---

## Contenus des fichiers gérés :

${fileEntriesMarkdown}
`;
}

/**
 * 13. Génère un prompt ultra-compact basé sur une archive Base64 auto-extractible.
 * Pèse seulement quelques kilo-octets et peut être collé sans AUCUN risque de "Media upload failed"
 * dans n'importe quel chat web ou IDE d'Antigravity.
 */
export function renderBase64OneLinerPrompt(params: {
  projectName: string;
  targetSurface?: string;
  base64Payload: string;
  filesCount: number;
  operationalTestCommand?: string;
}): string {
  const { projectName, targetSurface = 'IDE', base64Payload, filesCount, operationalTestCommand } = params;

  const installScript = renderSafeInstallScript({
    projectName,
    base64Payload,
    smokeTestCommand: sanitizeOperationalTestCommand(operationalTestCommand),
  });

  return `# 🚀 Déploiement Direct du Harnais Antigravity — ${projectName}

> **Instructions pour l'agent Google Antigravity (${targetSurface})** :
> Installe le harnais de développement (${filesCount} composants : règles, compétences, sous-agents et directives) en exécutant le script bash ci-dessous dans le terminal de ce workspace, **tel quel**.
> Le script n'écrase jamais un fichier modifié ou non géré, ne modifie aucun de vos agents, sauvegarde ce qu'il remplace dans \`.agents/.harness-backup/\` et vérifie l'installation.
> Pour voir le plan sans rien écrire, ajoute \`--dry-run\` (\`bash deploy.sh --dry-run\` après avoir enregistré le script dans un fichier \`deploy.sh\`).
> Après exécution, rends compte à l'utilisateur des conflits signalés (fichiers proposés dans \`.agents/.harness-proposed/\`) sans les résoudre sans son accord.

\`\`\`bash
${installScript}\`\`\`
`;
}

/**
 * 14. Génère un prompt Markdown épuré (< 30 Ko) ne contenant que les fichiers essentiels d'exécution
 * (AGENTS.md, .agents/rules, .agents/skills, .agents/agents) sans les dizaines de Ko de documentation théorique
 * (docs/ECC_SOURCES.md, etc.) pour garantir que le texte soit accepté en texte brut dans le chat web.
 */
export function renderLightweightUpgradePromptMarkdown(params: {
  projectName: string;
  targetSurface?: string;
  files: Array<{ relativePath: string; content: string }>;
  operationalTestCommand?: string;
}): string {
  // Filtrer pour ne conserver que les composants d'action réels (AGENTS.md, .agents/*, docs/ORCHESTRATION.md, docs/HARNESS_MANIFEST.json)
  const essentialFiles = params.files.filter((f) => isEssentialHarnessFile(f.relativePath));

  return renderUpgradePromptMarkdown({
    ...params,
    files: essentialFiles.length > 0 ? essentialFiles : params.files,
  });
}
