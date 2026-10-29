import { ProjectProfile } from '../project-profile/schema';
import { SelectionResult } from '../selection-engine/schema';
import {
  AntigravityRuleFrontmatter,
  AntigravityRuleFrontmatterSchema,
  AntigravitySkillFrontmatter,
  AntigravitySkillFrontmatterSchema,
  AntigravitySubagentFrontmatter,
  AntigravitySubagentFrontmatterSchema,
} from '../antigravity-adapter/schema';
import { splitMarkdownFrontmatter } from '../antigravity-adapter/adapter';
import {
  buildDeterministicHarnessPackage,
  BuiltHarnessPackage,
  computeSha256,
} from '../package-exporter/exporter';
import {
  DeterministicPackageInput,
  InputDocumentDigest,
  SelectedRuleSpec,
  SelectedSkillSpec,
  SelectedSubagentSpec,
} from '../package-exporter/schema';
import { sanitizeTextForPromptSafety } from '../documents/extractor';

export interface HarnessBuilderOptions {
  generationId?: string;
  generatedAtIso?: string;
  eccCommitSha?: string;
  eccVersionTag?: string;
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
    const eccCommitSha = options.eccCommitSha ?? '25278e7d8050e82c5f94d9305ea6a0fceec3ea42';
    const eccVersionTag = options.eccVersionTag ?? 'v2.2.3';

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

    // Documents d'entrée simulés ou fournis
    const inputDocuments: InputDocumentDigest[] =
      options.inputDocuments && options.inputDocuments.length >= 2
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

    // Règles ECC retenues
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
        originStatus: 'ecc_adapted',
        eccProvenance: {
          repositoryUrl: 'https://github.com/affaan-m/ECC',
          commitSha: eccCommitSha,
          versionTag: eccVersionTag,
          sourceRelativePath: comp.sourceRelativePath ?? `rules/${comp.slug}.md`,
          sourceUrl: comp.sourceUrl ?? `https://github.com/affaan-m/ECC/blob/${eccCommitSha}/rules/${comp.slug}.md`,
          license: comp.license ?? 'MIT',
          author: 'Affaan Mustafa',
          adaptationNotes: ['Adapté vers les standards Google Antigravity'],
        },
      });
    }

    // Règles Custom
    for (const custom of selection.customComponents) {
      if (custom.kind !== 'RULE' || ruleSlugsSeen.has(custom.slug)) continue;
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
        resources: [],
        selectionRationale: comp.acceptedRationale,
        originStatus: 'ecc_adapted',
        eccProvenance: {
          repositoryUrl: comp.sourceUrl?.includes('emilkowalski')
            ? 'https://github.com/emilkowalski/skills'
            : 'https://github.com/affaan-m/ECC',
          commitSha: eccCommitSha,
          versionTag: eccVersionTag,
          sourceRelativePath: comp.sourceRelativePath ?? `skills/${comp.slug}/SKILL.md`,
          sourceUrl:
            comp.sourceUrl ??
            `https://github.com/affaan-m/ECC/blob/${eccCommitSha}/skills/${comp.slug}/SKILL.md`,
          license: comp.license ?? 'MIT',
          author: comp.sourceUrl?.includes('emilkowalski') ? 'Emil Kowalski' : 'Affaan Mustafa',
          adaptationNotes: ['Adapté vers les standards de compétences Google Antigravity'],
        },
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
      const frontmatter: AntigravitySubagentFrontmatter = AntigravitySubagentFrontmatterSchema.parse({
        name: comp.slug,
        description: (rawFront.description as string) ?? `Sous-agent ${comp.name} dédié aux tâches spécialisées du projet.`,
        tools: (rawFront.tools as any) ?? (isReviewer ? ['view_file', 'grep_search', 'find_by_name'] : ['view_file', 'write_to_file', 'replace_file_content', 'run_command']),
        model: (rawFront.model as any) ?? (isReviewer ? 'pro' : 'inherit'),
      });

      selectedSubagents.push({
        slug: comp.slug,
        roleTitle: comp.name,
        frontmatter,
        markdownBody: split.body.trim(),
        isIndependentReviewer: isReviewer,
        recommendedEffort: isReviewer ? 'high' : 'medium',
        qualityCostRecommendation: isReviewer ? 'Raisonnement approfondi requis pour l audit critique.' : 'Compromis équilibré entre vitesse et rigueur.',
        selectionRationale: comp.acceptedRationale,
        originStatus: 'ecc_adapted',
        eccProvenance: {
          repositoryUrl: 'https://github.com/affaan-m/ECC',
          commitSha: eccCommitSha,
          versionTag: eccVersionTag,
          sourceRelativePath: comp.sourceRelativePath ?? `agents/${comp.slug}.md`,
          sourceUrl: comp.sourceUrl ?? `https://github.com/affaan-m/ECC/blob/${eccCommitSha}/agents/${comp.slug}.md`,
          license: comp.license ?? 'MIT',
          author: 'Affaan Mustafa',
          adaptationNotes: ['Adapté vers la spécification officielle des sous-agents Antigravity'],
        },
      });
    }

    for (const custom of selection.customComponents) {
      if (custom.kind !== 'SUBAGENT' || agentSlugsSeen.has(custom.slug)) continue;
      agentSlugsSeen.add(custom.slug);

      const split = splitMarkdownFrontmatter(custom.content);
      const rawFront = split.parsedFrontmatter ?? {};
      const frontmatter: AntigravitySubagentFrontmatter = AntigravitySubagentFrontmatterSchema.parse({
        name: custom.slug,
        description: (rawFront.description as string) ?? custom.description,
        tools: (rawFront.tools as any) ?? ['view_file', 'write_to_file', 'replace_file_content'],
        model: (rawFront.model as any) ?? 'inherit',
      });

      selectedSubagents.push({
        slug: custom.slug,
        roleTitle: custom.name,
        frontmatter,
        markdownBody: split.body.trim(),
        isIndependentReviewer: false,
        recommendedEffort: 'medium',
        qualityCostRecommendation: 'Sous-agent sur mesure spécialisé pour le projet.',
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
          model: 'pro',
        },
        markdownBody: `# Mission de l'Architecte\n\nConcevoir l'architecture et vérifier la conformité aux contraintes.`,
        isIndependentReviewer: true,
        recommendedEffort: 'high',
        qualityCostRecommendation: 'Effort élevé requis pour les décisions architecturales fondatrices.',
        selectionRationale: 'Rôle d architecture fondamental par défaut.',
        originStatus: 'project_custom',
      });
    }

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
      eccCommitSha,
      eccVersionTag,
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
