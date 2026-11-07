import { ProjectProfile } from '../project-profile/schema';
import { SelectionResult } from '../selection-engine/schema';
import {
  AntigravityRuleFrontmatter,
  AntigravityRuleFrontmatterSchema,
  AntigravitySkillFrontmatter,
  AntigravitySkillFrontmatterSchema,
  AntigravitySubagentFrontmatter,
  AntigravitySubagentFrontmatterSchema,
  AntigravitySubagentTool,
} from '../antigravity-adapter/schema';
import {
  inferRecommendedModelEffortPair,
  splitMarkdownFrontmatter,
} from '../antigravity-adapter/adapter';
import {
  buildDeterministicHarnessPackage,
  BuiltHarnessPackage,
  computeSha256,
} from '../package-exporter/exporter';
import { renderModelEffortGovernanceRuleBody } from '../package-exporter/governance-template';
import { convertGlobRulesToModelDecision, enforceAlwaysOnBudget, isReviewerSlug, normalizeDelegationDescription, restrictReviewerTools } from './context-budget';
import { SyncedSourceSnapshot, authorFromCopyright, resolveComponentProvenance } from '../catalog/catalog-sources';
import {
  DeterministicPackageInput,
  InputDocumentDigest,
  SelectedRuleSpec,
  SelectedSkillSpec,
  SourceProvenance,
  SelectedSubagentSpec,
} from '../package-exporter/schema';
import { sanitizeTextForPromptSafety } from '../documents/extractor';

export interface HarnessBuilderOptions {
  generationId?: string;
  generatedAtIso?: string;
  /** Catalogue en service : étiquette de version et sources réellement synchronisées. */
  catalog?: { versionTag: string; sources: SyncedSourceSnapshot[] };
  inputDocuments?: InputDocumentDigest[];
}

export class HarnessBuilderService {
  /**
   * Construit et valide le harnais de développement complet en s'appuyant
   * sur le moteur déterministe validé au Jalon 1 (§6, §7 FR-06).
   */
  async buildHarness(
    profile: ProjectProfile,
    selection: SelectionResult,
    options: HarnessBuilderOptions = {}
  ): Promise<BuiltHarnessPackage> {
    const generationId = options.generationId ?? 'canonical-generation-01';
    const generatedAtIso = options.generatedAtIso ?? '2026-01-01T00:00:00.000Z';
    const catalog = options.catalog ?? { versionTag: 'catalogue-local', sources: [] };
    const provenanceOf = (comp: SelectionResult['selectedComponents'][number], defaultPath: string, note: string): SourceProvenance => {
      const p = resolveComponentProvenance(comp, catalog.sources);
      return {
        repositoryUrl: p.repositoryUrl,
        commitSha: p.commitSha,
        sourceRelativePath: comp.sourceRelativePath ?? defaultPath,
        sourceUrl: comp.sourceUrl ?? (p.commitSha ? `${p.repositoryUrl}/blob/${p.commitSha}/${defaultPath}` : p.repositoryUrl),
        license: p.license,
        author: p.author,
        adaptationNotes: [note],
      };
    };

    // Normalisation du nom de package en kebab-case
    const packageRootName =
      profile.projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'project-harness';

    // Neutralisation des injections de prompt potentielles dans les notes complémentaires (R-02)
    const rawNotes = profile.supplementaryNotes ?? {};
    const sanitizedNotes: typeof rawNotes = {};
    for (const [k, v] of Object.entries(rawNotes)) {
      if (typeof v === 'string') {
        const { sanitized } = sanitizeTextForPromptSafety(v);
        (sanitizedNotes as Record<string, string>)[k] = sanitized;
      }
    }
    const safeProfile: ProjectProfile = {
      ...profile,
      supplementaryNotes: sanitizedNotes,
    };

    // Documents d'entrée fournis par l'appelant ; sans eux (tests, appels directs), des documents factices sont déclarés
    const inputDocuments: InputDocumentDigest[] =
      options.inputDocuments && options.inputDocuments.length >= 1
        ? options.inputDocuments
        : [
            {
              documentId: 'doc-spec-01',
              role: 'SPECIFICATION',
              fileName: 'cahier_des_charges.md',
              mimeType: 'text/markdown',
              sizeBytes: 15420,
              sha256: computeSha256(profile.projectDescription + profile.projectName),
            },
            {
              documentId: 'doc-ds-01',
              role: 'DESIGN_SYSTEM',
              fileName: 'design_system.md',
              mimeType: 'text/markdown',
              sizeBytes: 8320,
              sha256: computeSha256(JSON.stringify(profile.designSystem ?? {})),
            },
          ];

    // --- 1. RÈGLES ---
    const selectedRules: SelectedRuleSpec[] = [];
    const ruleSlugsSeen = new Set<string>();

    // Règles retenues dans le catalogue
    for (const comp of selection.selectedComponents) {
      if (comp.kind !== 'RULE' || ruleSlugsSeen.has(comp.slug)) continue;
      ruleSlugsSeen.add(comp.slug);

      const split = splitMarkdownFrontmatter(comp.adaptedContent);
      const rawFront = split.parsedFrontmatter ?? {};
      const frontmatter: AntigravityRuleFrontmatter = AntigravityRuleFrontmatterSchema.parse({
        trigger: rawFront.trigger ?? (rawFront.globs ? 'glob' : 'always_on'),
        description: (rawFront.description as string) ?? `Règle ${comp.name} pour le projet`,
        globs: (rawFront.globs as string) ?? undefined,
        glob: (rawFront.glob as string) ?? undefined,
      });

      selectedRules.push({
        slug: comp.slug,
        title: comp.name,
        frontmatter,
        markdownBody: split.body.trim(),
        selectionRationale: comp.acceptedRationale,
        originStatus: 'source_adapted',
        provenance: provenanceOf(comp, `rules/${comp.slug}.md`, 'Adapté vers les standards Google Antigravity'),
      });
    }

    // Règles Custom (hors model-effort-governance qui est générée après finalisation de tous les sous-agents)
    for (const custom of selection.customComponents) {
      if (
        custom.kind !== 'RULE' ||
        custom.slug === 'model-effort-governance' ||
        ruleSlugsSeen.has(custom.slug)
      ) {
        continue;
      }
      ruleSlugsSeen.add(custom.slug);

      const split = splitMarkdownFrontmatter(custom.content);
      const rawFront = split.parsedFrontmatter ?? {};
      const frontmatter: AntigravityRuleFrontmatter = AntigravityRuleFrontmatterSchema.parse({
        trigger: rawFront.trigger ?? (rawFront.globs ? 'glob' : 'always_on'),
        description: (rawFront.description as string) ?? custom.description,
        globs: (rawFront.globs as string) ?? undefined,
      });

      selectedRules.push({
        slug: custom.slug,
        title: custom.name,
        frontmatter,
        markdownBody: split.body.trim(),
        selectionRationale: custom.gapReason,
        originStatus: 'project_custom',
      });
    }

    // Si aucune règle n'a été sélectionnée, ajout d'une règle minimale de qualité
    if (selectedRules.length === 0) {
      selectedRules.push({
        slug: 'core-clean-code',
        title: 'Principes de Code Propre et Rigueur',
        frontmatter: {
          trigger: 'always_on',
          description: 'Règles fondamentales de clarté, modularité et absence de dette technique.',
        },
        markdownBody: `# Principes de Rigueur Logicielle\n\n- Pas de duplication inutile.\n- Typage strict TypeScript.\n- Tests unitaires systématiques.`,
        selectionRationale: 'Règle transverse fondamentale par défaut.',
        originStatus: 'project_custom',
      });
    }

    // --- 2. SKILLS ---
    const selectedSkills: SelectedSkillSpec[] = [];
    const skillSlugsSeen = new Set<string>();

    for (const comp of selection.selectedComponents) {
      if ((comp.kind !== 'SKILL' && comp.kind !== 'COMMAND_CONVERTED') || skillSlugsSeen.has(comp.slug)) continue;
      skillSlugsSeen.add(comp.slug);

      const split = splitMarkdownFrontmatter(comp.adaptedContent);
      const rawFront = split.parsedFrontmatter ?? {};
      const frontmatter: AntigravitySkillFrontmatter = AntigravitySkillFrontmatterSchema.parse({
        name: comp.slug,
        description: (rawFront.description as string) ?? `Compétence ${comp.name} pour le projet ${profile.projectName}.`,
        license: comp.license ?? 'MIT',
      });

      selectedSkills.push({
        slug: comp.slug,
        frontmatter,
        markdownBody: split.body.trim(),
        resources: (comp.resources ?? []).filter(
          (r) => r.content.trim().length > 0 && /^(?:(?:references|resources|examples)\/)?[a-zA-Z0-9._-]+\.(?:md|json|yaml|yml|txt|css)$/.test(r.relativeSubPath)
        ),
        selectionRationale: comp.acceptedRationale,
        originStatus: 'source_adapted',
        provenance: provenanceOf(comp, `skills/${comp.slug}/SKILL.md`, 'Adapté vers les standards de compétences Google Antigravity'),
      });
    }

    for (const custom of selection.customComponents) {
      if ((custom.kind !== 'SKILL' && custom.kind !== 'COMMAND_CONVERTED') || skillSlugsSeen.has(custom.slug)) continue;
      skillSlugsSeen.add(custom.slug);

      const split = splitMarkdownFrontmatter(custom.content);
      const rawFront = split.parsedFrontmatter ?? {};
      const frontmatter: AntigravitySkillFrontmatter = AntigravitySkillFrontmatterSchema.parse({
        name: custom.slug,
        description: (rawFront.description as string) ?? custom.description,
      });

      selectedSkills.push({
        slug: custom.slug,
        frontmatter,
        markdownBody: split.body.trim(),
        resources: [],
        selectionRationale: custom.gapReason,
        originStatus: 'project_custom',
      });
    }

    if (selectedSkills.length === 0) {
      selectedSkills.push({
        slug: 'project-testing-workflows',
        frontmatter: {
          name: 'project-testing-workflows',
          description: 'Procédures de test et vérification automatique pour le projet.',
        },
        markdownBody: `# Procédures de Vérification\n\nExécutez systématiquement la suite de tests avant toute livraison.`,
        resources: [],
        selectionRationale: 'Compétence de test essentielle par défaut.',
        originStatus: 'project_custom',
      });
    }

    // --- 3. SOUS-AGENTS ---
    const selectedSubagents: SelectedSubagentSpec[] = [];
    const agentSlugsSeen = new Set<string>();

    for (const comp of selection.selectedComponents) {
      if (comp.kind !== 'SUBAGENT' || agentSlugsSeen.has(comp.slug)) continue;
      agentSlugsSeen.add(comp.slug);

      const split = splitMarkdownFrontmatter(comp.adaptedContent);
      const rawFront = split.parsedFrontmatter ?? {};
      const isReviewer = comp.slug.includes('reviewer') || comp.slug.includes('audit');
      const sourceTools =
        (rawFront.tools as unknown as AntigravitySubagentTool[]) ??
        (isReviewer ? ['view_file', 'grep_search', 'find_by_name'] : ['view_file', 'write_to_file', 'replace_file_content', 'run_command']);
      const frontmatter: AntigravitySubagentFrontmatter = AntigravitySubagentFrontmatterSchema.parse({
        name: comp.slug,
        description: normalizeDelegationDescription(
          (rawFront.description as string) ?? `Sous-agent ${comp.name} dédié aux tâches spécialisées du projet.`
        ),
        tools: isReviewer || isReviewerSlug(comp.slug) ? restrictReviewerTools(sourceTools) : sourceTools,
      });

      const inferredPair = inferRecommendedModelEffortPair({
        slug: comp.slug,
        rawModel: typeof rawFront.model === 'string' ? rawFront.model : undefined,
        isIndependentReviewer: isReviewer,
      });
      const recommendedModelTier =
        comp.recommendedModelTier ?? inferredPair.recommendedModelTier;
      const recommendedEffort = comp.recommendedEffort ?? inferredPair.recommendedEffort;
      const qualityCostRecommendation =
        comp.recommendedModelTier || comp.recommendedEffort
          ? recommendedModelTier === 'flash' && recommendedEffort === 'low'
            ? 'Couple Standard — Effort Low : latence minimale et coût très réduit pour les tâches légères et documentaires.'
            : recommendedModelTier === 'flash'
              ? 'Couple Standard — Effort Medium : exécution rapide et économique pour la vérification automatisée et les tâches bornées.'
              : recommendedEffort === 'high'
                ? 'Couple Flagship — Effort High : raisonnement approfondi requis pour l’architecture, la performance critique, la sécurité et la revue indépendante.'
                : 'Couple Flagship — Effort Medium : ratio coût/performance optimal pour l’ingénierie standard, le TDD et la résolution chirurgicale d’erreurs.'
          : inferredPair.qualityCostRecommendation;

      selectedSubagents.push({
        slug: comp.slug,
        roleTitle: comp.name,
        frontmatter,
        markdownBody: split.body.trim(),
        isIndependentReviewer: isReviewer,
        recommendedModelTier,
        recommendedEffort,
        qualityCostRecommendation,
        selectionRationale: comp.acceptedRationale,
        originStatus: 'source_adapted',
        provenance: provenanceOf(
          comp,
          `agents/${comp.slug}.md`,
          'Adapté vers la spécification officielle des sous-agents Antigravity (sans champ model dans le frontmatter YAML)'
        ),
      });
    }

    for (const custom of selection.customComponents) {
      if (custom.kind !== 'SUBAGENT' || agentSlugsSeen.has(custom.slug)) continue;
      agentSlugsSeen.add(custom.slug);

      const split = splitMarkdownFrontmatter(custom.content);
      const rawFront = split.parsedFrontmatter ?? {};
      const customIsReviewer = isReviewerSlug(custom.slug);
      const customTools =
        (rawFront.tools as unknown as AntigravitySubagentTool[]) ?? ['view_file', 'write_to_file', 'replace_file_content'];
      const frontmatter: AntigravitySubagentFrontmatter = AntigravitySubagentFrontmatterSchema.parse({
        name: custom.slug,
        description: normalizeDelegationDescription((rawFront.description as string) ?? custom.description),
        tools: customIsReviewer ? restrictReviewerTools(customTools) : customTools,
      });

      const customPair = inferRecommendedModelEffortPair({
        slug: custom.slug,
        rawModel: typeof rawFront.model === 'string' ? rawFront.model : undefined,
        isIndependentReviewer: false,
      });

      selectedSubagents.push({
        slug: custom.slug,
        roleTitle: custom.name,
        frontmatter,
        markdownBody: split.body.trim(),
        isIndependentReviewer: customIsReviewer,
        recommendedModelTier: customPair.recommendedModelTier,
        recommendedEffort: customPair.recommendedEffort,
        qualityCostRecommendation: customPair.qualityCostRecommendation,
        selectionRationale: custom.gapReason,
        originStatus: 'project_custom',
      });
    }

    if (selectedSubagents.length === 0) {
      selectedSubagents.push({
        slug: 'project-architect',
        roleTitle: 'Architecte Logiciel Senior',
        frontmatter: {
          name: 'project-architect',
          description: "Sous-agent responsable du cadrage technique, de l'architecture logicielle et du schéma DB.",
          tools: ['view_file', 'grep_search', 'find_by_name'],
        },
        markdownBody: `# Mission de l'Architecte\n\nConcevoir l'architecture et vérifier la conformité aux contraintes.`,
        isIndependentReviewer: true,
        recommendedModelTier: 'pro',
        recommendedEffort: 'high',
        qualityCostRecommendation: 'Effort élevé requis pour les décisions architecturales fondatrices.',
        selectionRationale: 'Rôle d architecture fondamental par défaut.',
        originStatus: 'project_custom',
      });
    }

    // Injection systématique de la règle active de gouvernance du couple Modèle / Niveau d'Effort
    if (!ruleSlugsSeen.has('model-effort-governance')) {
      ruleSlugsSeen.add('model-effort-governance');
      selectedRules.unshift({
        slug: 'model-effort-governance',
        title: "Gouvernance Centralisée du Couple Modèle / Niveau d'Effort (Coût / Performance)",
        frontmatter: {
          trigger: 'always_on',
          description:
            "Arbitrage coût/performance du couple Modèle / Niveau d'effort pour les tâches longues ou critiques ; aucune intervention sur les tâches courtes.",
        },
        markdownBody: renderModelEffortGovernanceRuleBody({
          projectName: safeProfile.projectName,
          targetSurface: safeProfile.targetSurface,
          subagents: selectedSubagents,
        }),
        selectionRationale:
          "Gouvernance centralisée du couple Modèle / Niveau d'effort (remplace toute référence au modèle dans le frontmatter YAML des agents).",
        originStatus: 'project_custom',
      });
    }

    // Règles de fichiers : `glob` non fiable à l'auto-test, converties en `model_decision` ; puis plafonnement du contexte permanent
    selectedRules.splice(0, selectedRules.length, ...convertGlobRulesToModelDecision(selectedRules));
    const budgeted = enforceAlwaysOnBudget(selectedRules, selection.presetMode);
    selectedRules.splice(0, selectedRules.length, ...budgeted.rules);

    // --- 4. RÉSUMÉ DES CANDIDATS ÉCARTÉS ---
    const discardedCandidatesSummary = selection.rejectedComponents.map((r) => ({
      componentId: r.slug,
      reason: r.rejectedRationale,
    }));

    // --- 5. ASSEMBLAGE DÉTERMINISTE DU PAQUET ---
    const deterministicInput: DeterministicPackageInput = {
      generationId,
      generatedAtIso,
      packageRootName,
      catalog: {
        versionTag: catalog.versionTag,
        sources: catalog.sources
          .filter((src) => !src.error)
          .map((src) => ({
            id: src.id,
            name: src.name,
            repositoryUrl: `https://github.com/${src.owner}/${src.repo}`,
            commitSha: src.commitSha,
            license: src.license,
            author: authorFromCopyright(src.copyrightNotice) || `${src.owner}/${src.repo}`,
            selectedComponents: selection.selectedComponents.filter((c) => c.sourceId === src.id).length,
          })),
      },
      excellencePacks: selection.excellencePacks ?? [],
      inputDocuments,
      profile: safeProfile,
      selectedRules,
      selectedSkills,
      selectedSubagents,
      discardedCandidatesSummary,
    };

    return buildDeterministicHarnessPackage(deterministicInput);
  }
}
