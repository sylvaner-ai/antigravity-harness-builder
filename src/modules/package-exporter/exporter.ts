import crypto from 'node:crypto';
import { zipSync, unzipSync, strToU8, strFromU8, Zippable } from 'fflate';
import {
  ANTIGRAVITY_LIMITS,
  ValidationIssue,
} from '../antigravity-adapter/schema';
import {
  serializeAntigravityRule,
  serializeAntigravitySkill,
  serializeAntigravitySubagent,
} from '../antigravity-adapter/adapter';
import {
  PackageFileEntry,
  resolveFileValidationTier,
  validatePackagePathSafety,
  validateRulesAndContextBudget,
  validateSkills,
  validateSubagents,
} from '../antigravity-adapter/validators';
import {
  DeterministicPackageInput,
  DeterministicPackageInputSchema,
  HarnessManifest,
  HarnessManifestSchema,
} from './schema';
import {
  renderAcceptanceCriteriaMarkdown,
  renderAgentsMarkdown,
  renderArchitectureMarkdown,
  renderAssumptionsMarkdown,
  renderDesignSystemMarkdown,
  renderEccSourcesMarkdown,
  renderOrchestrationMarkdown,
  renderProjectSpecMarkdown,
  renderReadmeMarkdown,
  renderStartHereMarkdown,
  renderDeploymentPromptMarkdown,
  renderUpgradePromptMarkdown,
} from './templates';
import { renderModelEffortGovernanceRuleBody } from './governance-template';

export { renderDeploymentPromptMarkdown, renderUpgradePromptMarkdown };

/**
 * Calcule l'empreinte SHA-256 hexadécimale d'une chaîne ou d'un buffer.
 */
export function computeSha256(data: string | Uint8Array): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Résultat complet produit par le moteur déterministe d'assemblage et d'export (Jalon 1).
 */
export interface BuiltHarnessPackage {
  packageRootName: string;
  startHereContent: string;
  deploymentPromptMarkdown: string;
  upgradePromptMarkdown: string;
  manifest: HarnessManifest;
  files: Array<{
    relativePath: string;
    zipEntryPath: string;
    content: string;
    sizeBytes: number;
    sha256: string;
  }>;
  zipBuffer: Uint8Array;
  zipSha256: string;
}

/**
 * Timestamp fixe canonique pour les métadonnées internes d'entrées ZIP (DOS MTime)
 * afin de garantir que deux générations avec les mêmes entrées produisent un ZIP
 * strictement reproductible octet par octet (§15.1 Jalon 1).
 */
const DETERMINISTIC_ZIP_MTIME = new Date('2026-01-01T00:00:00.000Z');

/**
 * Construit, valide et assemble de manière 100 % déterministe un paquet de harnais
 * Antigravity complet (fichiers Markdown, `.agents/*`, `docs/HARNESS_MANIFEST.json` et archive ZIP).
 *
 * Conformément au §15.2 : tout échec critique de sécurité ou de compatibilité bloque la génération.
 */
export function buildDeterministicHarnessPackage(
  rawInput: DeterministicPackageInput
): BuiltHarnessPackage {
  const parsedInput = DeterministicPackageInputSchema.parse(rawInput);

  // 1. Vérification d'absence de doublons dans les slugs sélectionnés
  const ruleSlugs = new Set<string>();
  for (const r of parsedInput.selectedRules) {
    if (ruleSlugs.has(r.slug)) {
      throw new Error(`Doublon de règle détecté : '${r.slug}'.`);
    }
    ruleSlugs.add(r.slug);
  }

  // Garantie d'auto-cohérence : injecte la règle centralisée de gouvernance Modèle / Effort
  // si l'appelant direct ne l'a pas déjà incluse dans selectedRules (ex: appel bas niveau hors HarnessBuilderService).
  const input: DeterministicPackageInput = ruleSlugs.has('model-effort-governance')
    ? parsedInput
    : {
        ...parsedInput,
        selectedRules: [
          ...parsedInput.selectedRules,
          {
            slug: 'model-effort-governance',
            title: "Gouvernance Centralisée du Couple Modèle / Niveau d'Effort",
            frontmatter: {
              trigger: 'always_on',
            },
            markdownBody: renderModelEffortGovernanceRuleBody({
              projectName: parsedInput.profile.projectName,
              targetSurface: parsedInput.profile.targetSurface,
              subagents: parsedInput.selectedSubagents.map((sub) => ({
                slug: sub.slug,
                roleTitle: sub.roleTitle,
                recommendedModelTier: sub.recommendedModelTier,
                recommendedEffort: sub.recommendedEffort,
                qualityCostRecommendation: sub.qualityCostRecommendation,
              })),
            }),
            selectionRationale:
              "Règle système obligatoire centralisant l'évaluation pré-tâche du couple Modèle / Niveau d'effort optimal (ratio coût/performance) hors des frontmatters YAML des sous-agents.",
            originStatus: 'project_custom',
          },
        ],
      };

  const skillSlugs = new Set<string>();
  for (const s of input.selectedSkills) {
    if (skillSlugs.has(s.slug)) {
      throw new Error(`Doublon de skill détecté : '${s.slug}'.`);
    }
    skillSlugs.add(s.slug);
  }

  const agentSlugs = new Set<string>();
  for (const a of input.selectedSubagents) {
    if (agentSlugs.has(a.slug)) {
      throw new Error(`Doublon de sous-agent détecté : '${a.slug}'.`);
    }
    agentSlugs.add(a.slug);
  }

  // 2. Génération déterministe des fichiers du paquet (hors HARNESS_MANIFEST.json)
  const candidateFiles: PackageFileEntry[] = [];

  const startHereContent = renderStartHereMarkdown(input);
  candidateFiles.push({ relativePath: 'START_HERE.md', content: startHereContent });
  candidateFiles.push({ relativePath: 'README.md', content: renderReadmeMarkdown(input) });
  candidateFiles.push({ relativePath: 'AGENTS.md', content: renderAgentsMarkdown(input) });

  candidateFiles.push({
    relativePath: 'docs/PROJECT_SPEC.md',
    content: renderProjectSpecMarkdown(input),
  });
  candidateFiles.push({
    relativePath: 'docs/DESIGN_SYSTEM.md',
    content: renderDesignSystemMarkdown(input),
  });
  candidateFiles.push({
    relativePath: 'docs/ARCHITECTURE.md',
    content: renderArchitectureMarkdown(input),
  });
  candidateFiles.push({
    relativePath: 'docs/ORCHESTRATION.md',
    content: renderOrchestrationMarkdown(input),
  });
  candidateFiles.push({
    relativePath: 'docs/ACCEPTANCE_CRITERIA.md',
    content: renderAcceptanceCriteriaMarkdown(input),
  });
  candidateFiles.push({
    relativePath: 'docs/ASSUMPTIONS.md',
    content: renderAssumptionsMarkdown(input),
  });
  candidateFiles.push({
    relativePath: 'docs/ECC_SOURCES.md',
    content: renderEccSourcesMarkdown(input),
  });

  // Règles (.agents/rules/<slug>.md)
  for (const rule of [...input.selectedRules].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const content = serializeAntigravityRule(rule.frontmatter, rule.markdownBody);
    candidateFiles.push({
      relativePath: `.agents/rules/${rule.slug}.md`,
      content,
    });
  }

  // Skills (.agents/skills/<slug>/SKILL.md + ressources optionnelles)
  for (const skill of [...input.selectedSkills].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const skillMdContent = serializeAntigravitySkill(skill.frontmatter, skill.markdownBody);
    candidateFiles.push({
      relativePath: `.agents/skills/${skill.slug}/SKILL.md`,
      content: skillMdContent,
    });

    for (const res of [...skill.resources].sort((a, b) =>
      a.relativeSubPath.localeCompare(b.relativeSubPath)
    )) {
      candidateFiles.push({
        relativePath: `.agents/skills/${skill.slug}/${res.relativeSubPath}`,
        content: res.content,
      });
    }
  }

  // Sous-agents (.agents/agents/<slug>.md)
  for (const agent of [...input.selectedSubagents].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const agentContent = serializeAntigravitySubagent(agent.frontmatter, agent.markdownBody);
    candidateFiles.push({
      relativePath: `.agents/agents/${agent.slug}.md`,
      content: agentContent,
      isReviewerAgent: agent.isIndependentReviewer,
    });
  }

  // 3. Exécution complète des validateurs de sécurité et de compatibilité Antigravity (FR-09)
  const allIssues: ValidationIssue[] = [];

  const seenPaths = new Set<string>();
  for (const file of candidateFiles) {
    if (seenPaths.has(file.relativePath)) {
      allIssues.push({
        severity: 'error',
        code: 'PACKAGE_FILE_COLLISION',
        message: `Collision de chemin détectée dans le paquet : '${file.relativePath}'.`,
        filePath: file.relativePath,
        validationKind: 'SYNTACTIC',
        validationTier: 'AUTO_VALIDATED',
      });
    }
    seenPaths.add(file.relativePath);
    allIssues.push(...validatePackagePathSafety(file.relativePath));
  }

  const rulesValidation = validateRulesAndContextBudget(candidateFiles);
  allIssues.push(...rulesValidation.issues);
  allIssues.push(...validateSkills(candidateFiles));
  allIssues.push(...validateSubagents(candidateFiles));

  const blockingErrors = allIssues.filter((i) => i.severity === 'error');
  if (blockingErrors.length > 0) {
    const summary = blockingErrors.map((e) => `[${e.code}] ${e.filePath ?? ''}: ${e.message}`).join(' | ');
    throw new Error(
      `Échec bloquant des contrôles de sécurité/compatibilité Antigravity (${blockingErrors.length} erreur(s)) : ${summary}`
    );
  }

  // 4. Construction déterministe du manifeste `docs/HARNESS_MANIFEST.json` (§5.2)
  const profileSha256 = computeSha256(JSON.stringify(input.profile));

  const sortedCandidateFiles = [...candidateFiles].sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath)
  );

  const preliminaryInventory = sortedCandidateFiles.map((f) => {
    const resolved = resolveFileValidationTier(f.relativePath, allIssues);
    return {
      relativePath: f.relativePath,
      sizeBytes: Buffer.byteLength(f.content, 'utf8'),
      sha256: computeSha256(f.content),
      validationTier: resolved.tier,
    };
  });

  const componentsList: HarnessManifest['components'] = [
    ...input.selectedRules.map((r) => {
      const dest = `.agents/rules/${r.slug}.md`;
      return {
        id: `rule:${r.slug}`,
        kind: 'RULE' as const,
        destinationPath: dest,
        originStatus: r.originStatus,
        selectionRationale: r.selectionRationale,
        sourceCommitSha: r.eccProvenance?.commitSha,
        sourceUrl: r.eccProvenance?.sourceUrl,
        adaptationNotes: r.eccProvenance?.adaptationNotes ?? [],
        validationTier: resolveFileValidationTier(dest, allIssues).tier,
      };
    }),
    ...input.selectedSkills.map((s) => {
      const dest = `.agents/skills/${s.slug}/SKILL.md`;
      return {
        id: `skill:${s.slug}`,
        kind: 'SKILL' as const,
        destinationPath: dest,
        originStatus: s.originStatus,
        selectionRationale: s.selectionRationale,
        sourceCommitSha: s.eccProvenance?.commitSha,
        sourceUrl: s.eccProvenance?.sourceUrl,
        adaptationNotes: s.eccProvenance?.adaptationNotes ?? [],
        validationTier: resolveFileValidationTier(dest, allIssues).tier,
      };
    }),
    ...input.selectedSubagents.map((a) => {
      const dest = `.agents/agents/${a.slug}.md`;
      return {
        id: `subagent:${a.slug}`,
        kind: 'SUBAGENT' as const,
        destinationPath: dest,
        originStatus: a.originStatus,
        selectionRationale: a.selectionRationale,
        sourceCommitSha: a.eccProvenance?.commitSha,
        sourceUrl: a.eccProvenance?.sourceUrl,
        adaptationNotes: a.eccProvenance?.adaptationNotes ?? [],
        modelPolicy: {
          recommendedModelTier: a.recommendedModelTier,
          modelConfigurability: 'seulement indicatif' as const,
          recommendedEffort: a.recommendedEffort,
          effortConfigurability: 'seulement indicatif' as const,
          qualityCostRecommendation: a.qualityCostRecommendation,
        },
        validationTier: resolveFileValidationTier(dest, allIssues).tier,
      };
    }),
  ];

  const manifestObject: HarnessManifest = HarnessManifestSchema.parse({
    manifestSchemaVersion: '1.0.0',
    generationId: input.generationId,
    generatedAt: input.generatedAtIso,
    packageRootName: input.packageRootName,
    targetSurface: input.profile.targetSurface,
    eccReference: {
      repositoryUrl: 'https://github.com/affaan-m/ECC',
      commitSha: input.eccCommitSha,
      versionTag: input.eccVersionTag,
      license: 'MIT',
    },
    inputDocuments: input.inputDocuments,
    profileDigest: {
      projectId: input.profile.projectId,
      projectName: input.profile.projectName,
      profileVersion: input.profile.profileVersion,
      profileSha256,
    },
    components: componentsList,
    assumptionsAndWarnings: {
      uncertaintiesCount: input.profile.uncertainties.length,
      uncertainties: input.profile.uncertainties.map((u) => ({
        id: u.id,
        category: u.category,
        topic: u.topic,
        statement: u.statement,
        impact: u.impact,
      })),
      compatibilityWarnings: allIssues.filter((i) => i.severity !== 'error'),
    },
    filesInventory: preliminaryInventory,
    validationSummary: {
      valid: true,
      totalFilesCount: preliminaryInventory.length + 1, // +1 pour HARNESS_MANIFEST.json lui-même
      estimatedAlwaysOnRulesTokens: rulesValidation.estimatedAlwaysOnTokens,
      alwaysOnRulesTokenLimit: ANTIGRAVITY_LIMITS.SAFE_ALWAYS_ON_RULES_TOKEN_LIMIT,
      syntacticChecksPassed: true,
      documentaryChecksCount: allIssues.filter((i) => i.validationKind === 'DOCUMENTARY').length,
      unverifiedChecksCount: allIssues.filter((i) => i.validationTier === 'UNVERIFIED').length,
      errorsCount: 0,
      warningsCount: allIssues.filter((i) => i.severity === 'warning').length,
      issues: allIssues,
    },
  });

  const manifestJsonContent = `${JSON.stringify(manifestObject, null, 2)}\n`;

  const finalFilesWithManifest = [
    ...sortedCandidateFiles,
    {
      relativePath: 'docs/HARNESS_MANIFEST.json',
      content: manifestJsonContent,
    },
  ].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  // 5. Assemblage de l'archive ZIP déterministe avec fflate
  const zipEntries: Zippable = {};
  const builtFiles: BuiltHarnessPackage['files'] = [];

  for (const file of finalFilesWithManifest) {
    const zipEntryPath = `${input.packageRootName}/${file.relativePath}`;
    const bytes = strToU8(file.content);
    zipEntries[zipEntryPath] = [
      bytes,
      {
        level: 6,
        mtime: DETERMINISTIC_ZIP_MTIME,
      },
    ];
    builtFiles.push({
      relativePath: file.relativePath,
      zipEntryPath,
      content: file.content,
      sizeBytes: bytes.byteLength,
      sha256: computeSha256(file.content),
    });
  }

  const zipBuffer = zipSync(zipEntries);
  const zipSha256 = computeSha256(zipBuffer);

  const deploymentPromptMarkdown = renderDeploymentPromptMarkdown({
    projectName: input.profile.projectName,
    targetSurface: input.profile.targetSurface,
    files: builtFiles,
  });

  const testCmdItem = input.profile.qualityAndTestingStrategy?.find((q) => q.id === 'quality-commands')?.value;
  const matchCmd = testCmdItem ? testCmdItem.match(/`([^`]+)`/) : null;
  const operationalTestCommand = matchCmd ? matchCmd[1] : undefined;

  const upgradePromptMarkdown = renderUpgradePromptMarkdown({
    projectName: input.profile.projectName,
    targetSurface: input.profile.targetSurface,
    files: builtFiles,
    operationalTestCommand,
  });

  return {
    packageRootName: input.packageRootName,
    startHereContent,
    deploymentPromptMarkdown,
    upgradePromptMarkdown,
    manifest: manifestObject,
    files: builtFiles,
    zipBuffer,
    zipSha256,
  };
}

/**
 * Inspecte et vérifie l'intégrité d'une archive ZIP générée :
 * - Décompression standard
 * - Absence de répertoires vides, de chemins absolus ou de '..'
 * - Correspondance bijective exacte entre `docs/HARNESS_MANIFEST.json` et les fichiers présents dans le ZIP
 */
export function verifyGeneratedZipIntegrity(
  zipBuffer: Uint8Array,
  expectedPackageRootName: string
): {
  valid: boolean;
  extractedPaths: string[];
  manifest: HarnessManifest;
} {
  const unzipped = unzipSync(zipBuffer);
  const extractedPaths = Object.keys(unzipped).sort();

  if (extractedPaths.length === 0) {
    throw new Error('Archive ZIP vide.');
  }

  for (const entryPath of extractedPaths) {
    if (entryPath.endsWith('/')) {
      throw new Error(`Répertoire vide interdit détecté dans le ZIP : '${entryPath}' (§5 CDC).`);
    }
    if (!entryPath.startsWith(`${expectedPackageRootName}/`)) {
      throw new Error(
        `Entrée ZIP hors de la racine attendue '${expectedPackageRootName}/' : '${entryPath}'.`
      );
    }
    const relPath = entryPath.slice(`${expectedPackageRootName}/`.length);
    const pathIssues = validatePackagePathSafety(relPath);
    if (pathIssues.length > 0) {
      throw new Error(
        `Entrée ZIP non sûre '${entryPath}' : ${pathIssues.map((i) => i.message).join(', ')}`
      );
    }
  }

  const manifestEntryPath = `${expectedPackageRootName}/docs/HARNESS_MANIFEST.json`;
  const manifestBytes = unzipped[manifestEntryPath];
  if (!manifestBytes) {
    throw new Error(`Manifeste introuvable dans le ZIP à '${manifestEntryPath}'.`);
  }

  const parsedManifest = HarnessManifestSchema.parse(JSON.parse(strFromU8(manifestBytes)));

  // Vérifier que chaque fichier listé dans filesInventory existe dans le ZIP avec le même SHA-256 et la même taille
  for (const invItem of parsedManifest.filesInventory) {
    const zipKey = `${expectedPackageRootName}/${invItem.relativePath}`;
    const fileBytes = unzipped[zipKey];
    if (!fileBytes) {
      throw new Error(
        `Incohérence du manifeste : le fichier '${invItem.relativePath}' déclaré dans HARNESS_MANIFEST.json est absent du ZIP.`
      );
    }
    if (fileBytes.byteLength !== invItem.sizeBytes) {
      throw new Error(
        `Taille incohérente pour '${invItem.relativePath}' : manifeste=${invItem.sizeBytes}, zip=${fileBytes.byteLength}.`
      );
    }
    const actualSha256 = computeSha256(fileBytes);
    if (actualSha256 !== invItem.sha256) {
      throw new Error(
        `Hash SHA-256 incohérent pour '${invItem.relativePath}' : manifeste=${invItem.sha256}, zip=${actualSha256}.`
      );
    }
  }

  // Vérifier qu'aucun fichier fantôme non déclaré n'existe dans le ZIP (hors HARNESS_MANIFEST.json lui-même)
  const expectedZipKeys = new Set([
    ...parsedManifest.filesInventory.map((i) => `${expectedPackageRootName}/${i.relativePath}`),
    manifestEntryPath,
  ]);

  for (const actualKey of extractedPaths) {
    if (!expectedZipKeys.has(actualKey)) {
      throw new Error(
        `Fichier non déclaré dans le manifeste trouvé dans le ZIP : '${actualKey}'.`
      );
    }
  }

  return {
    valid: true,
    extractedPaths,
    manifest: parsedManifest,
  };
}
