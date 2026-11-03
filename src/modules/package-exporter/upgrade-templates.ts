/**
 * Générateurs de prompts et scripts de mise à niveau déterministes et non-destructifs.
 * Extrait de templates.ts pour maintenir la cohésion et respecter le plafond de 800 lignes.
 */

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
1. Crée un dossier de sauvegarde horodaté à la racine : \`.agents.backup-<YYYYMMDD-HHMMSS>/\`.
2. Si un fichier \`AGENTS.md\` existe à la racine, copie-le également vers \`AGENTS.md.backup-<YYYYMMDD-HHMMSS>\`.
3. Si le dossier \`.agents/\` existe, copie son contenu complet dans le dossier de sauvegarde.
4. Vérifie l'état Git (\`git status --porcelain\`). Si des changements non commités existent, signale-les avant de continuer.

### Phase 2 — Mode Simulation préalable (Dry-Run d'Impact)
Inspecte l'arborescence actuelle et présente un tableau récapitulatif des actions prévues :
- **\`[KEEP / PRESERVE]\`** : Fichiers et règles personnalisées rédigées par l'équipe qui ne font pas partie du catalogue géré — **Ne jamais écraser**.
- **\`[CREATE]\`** : Nouveaux composants inexistants dans le projet — **À créer**.
- **\`[SMART MERGE]\`** : Fichier \`AGENTS.md\` existant — **Fusionner uniquement dans les balises délimitées**.
- **\`[ARCHIVE / DEPRECATE]\`** : Dossier obsolète \`.agents/workflows/\` si détecté — **Déplacer vers \`.agents/deprecated/workflows/\`**.

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

3. **Compétences (\`.agents/skills/\`) & Sous-agents (\`.agents/agents/\`)** :
   - Déploie les nouveaux skills et agents définis ci-dessous.
   - Assure-toi que chaque skill possède son \`SKILL.md\` avec frontmatter YAML valide.
   - Vérifie qu'aucun sous-agent dans \`.agents/agents/*.md\` (y compris les agents personnalisés préexistants du projet) ne conserve de clé \`model\` dans son frontmatter YAML : le choix du couple Modèle / Niveau d'effort est désormais piloté automatiquement par \`.agents/rules/model-effort-governance.md\` (\`trigger: always_on\`).

### Phase 4 — Gestion et Archivage des Éléments Obsolètes
- Si des fichiers \`.agents/agents/*.md\` préexistants contenaient encore une ligne \`model: ...\` dans leur frontmatter YAML, supprime cette ligne afin de déléguer le choix coût/performance à \`.agents/rules/model-effort-governance.md\`.
- Si le répertoire obsolète \`.agents/workflows/\` est présent, déplace-le vers \`.agents/deprecated/workflows/\` en informant l'utilisateur de sa dépréciation dans Antigravity 2.0.
- Aucun fichier de code applicatif (\`src/\`, \`lib/\`, \`app/\`, \`.env\`) ne doit être touché.

### Phase 5 — Validation finale & Smoke Test
1. Vérifie la syntaxe de tous les fichiers créés ou modifiés.
2. Vérifie la validité des liens de documentation dans \`docs/\`.
${smokeTestInstructions}
4. Affiche un rapport de fin d'intervention récapitulant les composants modernisés, les éléments préservés et le chemin de la sauvegarde de sécurité.

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

  const safeSmokeTest = sanitizeOperationalTestCommand(operationalTestCommand);
  const smokeTestCmd = safeSmokeTest
    ? `\n# 4. Smoke test de non-régression\necho "🧪 Exécution du test de validation..."\n${safeSmokeTest}`
    : '';

  return `# 🚀 Déploiement Direct du Harnais Antigravity — ${projectName}

> **Instructions pour l'agent Google Antigravity (${targetSurface})** :
> Déploie et active l'intégralité du harnais de développement (${filesCount} composants : règles, compétences, sous-agents et directives) en exécutant la commande bash ci-dessous dans le terminal de ce workspace.

\`\`\`bash
# 1. Sauvegarde automatique préalable (Snapshot Guard)
TS=$(date +%Y%m%d-%H%M%S)
if [ -d ".agents" ]; then
  cp -r .agents ".agents.backup-$TS"
  echo "✓ Sauvegarde créée dans .agents.backup-$TS"
fi
if [ -f "AGENTS.md" ]; then
  cp AGENTS.md "AGENTS.md.backup-$TS"
  echo "✓ Sauvegarde créée dans AGENTS.md.backup-$TS"
fi

# 2. Décompression directe du harnais complet
echo "${base64Payload}" | base64 -d | tar -xz
echo "✓ Composants déployés avec succès"

# 3. Alignement des sous-agents préexistants (suppression de tout model: résiduel dans le frontmatter YAML) & nettoyage des workflows obsolètes
if [ -d ".agents/agents" ]; then
  for ag_file in .agents/agents/*.md; do
    [ -f "$ag_file" ] || continue
    awk 'NR==1 && /^---[[:space:]]*$/ {in_fm=1; print; next} in_fm && /^---[[:space:]]*$/ {in_fm=0; print; next} in_fm && /^model:[[:space:]]*/ {next} {print}' "$ag_file" > "$ag_file.tmp" && mv "$ag_file.tmp" "$ag_file"
  done
  echo "✓ Sous-agents alignés sur .agents/rules/model-effort-governance.md (zéro model: YAML)"
fi
if [ -d ".agents/workflows" ]; then
  mkdir -p .agents/deprecated
  mv .agents/workflows .agents/deprecated/workflows
  echo "✓ Anciens workflows archivés dans .agents/deprecated/workflows"
fi${smokeTestCmd}

echo "✅ Harnais Antigravity 100% opérationnel !"
\`\`\`
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
