import type { ProjectProfile } from '../project-profile/schema';
import type { EccComponentParsedMeta } from '../../db/schema';
import type { ComponentKind, ExcellencePack } from './schema';
import {
  CURATED_SOURCE_ID,
  CURATED_SOURCE_PRIORITY,
  UNKNOWN_SOURCE_PRIORITY,
  findSourceById,
  findSourceByUrl,
} from '../ecc-catalog/catalog-sources';
import { assessPlatformFit } from '../ecc-catalog/content-safety';

/**
 * Classification fonctionnelle de chaque composant du catalogue multi-sources.
 *
 * Le moteur ne compare plus des scores saturés : il remplit des « slots » (une fonction = un composant).
 * Dans un slot, la source prioritaire l'emporte (curated > spécialiste > méthodologie > bibliothèque de base),
 * puis le composant le plus spécifique à la stack du projet. Un composant d'une source enregistrée sans slot n'est
 * jamais retenu automatiquement (il reste sélectionnable manuellement).
 */

export type SlotTier = 'core' | 'standard' | 'extended';
export type Methodology = 'superpowers' | 'ponytail';

export type Requirement =
  | { kind: 'stack'; anyOf: string[] }
  | { kind: 'ui' }
  | { kind: 'database' }
  | { kind: 'backend' }
  | { kind: 'e2e' }
  | { kind: 'infra' }
  | { kind: 'mobile' }
  | { kind: 'domain'; label: string; pattern: RegExp }
  | { kind: 'pack'; pack: ExcellencePack };

export interface ClassifiableComponent {
  slug: string;
  kind: ComponentKind;
  sourceUrl?: string;
  adaptedContent: string;
  parsedMeta: EccComponentParsedMeta;
}

export interface ComponentClassification {
  sourceId: string;
  sourcePriority: number;
  slot?: string;
  tier: SlotTier;
  /** Départage à priorité égale : composant de framework (3) > de langage (2) > générique (1). */
  specificity: number;
  requires: Requirement[];
  methodology?: Methodology;
  exclusion?: { code: 'META_TOOLING' | 'CLAUDE_SPECIFIC' | 'NOT_SOFTWARE_DOMAIN'; reason: string };
}

// --- Contexte du projet ---------------------------------------------------------------------------

export interface ProjectContext {
  stacks: Set<string>;
  hasUi: boolean;
  hasDatabase: boolean;
  hasBackend: boolean;
  hasE2e: boolean;
  hasInfra: boolean;
  hasMobile: boolean;
  domainText: string;
}

const TECH_ALIASES: Record<string, string> = {
  postgres: 'postgresql', golang: 'go', 'c#': 'csharp', '.net': 'csharp', dotnet: 'csharp', nodejs: 'javascript',
  reactnative: 'react-native', tailwind: 'tailwindcss', drizzleorm: 'drizzle', prismaorm: 'prisma',
  springboot: 'springboot', nuxt4: 'nuxt', sveltekit: 'svelte', rubyonrails: 'rails', mongodb: 'mongodb',
  'html/css': 'html', ios: 'swift', swiftui: 'swiftui',
};

export function normalizeTech(raw: string): string {
  const t = raw
    .toLowerCase()
    .replace(/\s+orm\b/, '')
    .replace(/\.js\b/g, 'js')
    .replace(/[\s._]/g, '')
    .trim();
  return TECH_ALIASES[t] ?? t;
}

const UI_TECH = new Set([
  'react', 'nextjs', 'vue', 'nuxt', 'svelte', 'angular', 'tailwindcss', 'html', 'css', 'swiftui', 'flutter',
  'react-native', 'expo', 'electron', 'tauri',
]);
const BACKEND_TECH = new Set([
  'nextjs', 'express', 'expressjs', 'nestjs', 'fastify', 'fastapi', 'django', 'flask', 'springboot', 'laravel', 'rails',
  'quarkus', 'nuxt',
]);
const MOBILE_TECH = new Set(['swift', 'swiftui', 'kotlin', 'flutter', 'react-native', 'expo', 'dart']);
const E2E_TECH = new Set(['playwright', 'cypress']);

export function buildProjectContext(profile: ProjectProfile): ProjectContext {
  const ts = profile.techStack;
  const all = [
    ...(ts?.languages ?? []),
    ...(ts?.frameworks ?? []),
    ...(ts?.databases ?? []),
    ...(ts?.ormAndDataLayer ?? []),
    ...(ts?.stateManagement ?? []),
    ...(ts?.infrastructureAndDeployment ?? []),
    ...(ts?.testingTools ?? []),
  ].filter((v) => v && !/^à définir/i.test(v));
  const stacks = new Set<string>();
  for (const v of all) {
    const n = normalizeTech(v);
    stacks.add(n);
    if (n === 'html') stacks.add('css');
    if (n === 'typescript') stacks.add('javascript');
    if (n === 'nextjs') stacks.add('react');
    if (n === 'nuxt') stacks.add('vue');
    if (n === 'expo') stacks.add('react-native');
    if (n === 'swiftui') stacks.add('swift');
    if (n === 'flutter') stacks.add('dart');
  }
  const hasTokens = Object.keys(profile.designSystem?.colorTokens ?? {}).length > 0;
  const domainText = [
    profile.projectName,
    profile.projectDescription,
    profile.domainAndObjective?.value ?? '',
    ...(profile.features ?? []).map((f) => `${f.title} ${f.description} ${(f.businessRules ?? []).join(' ')}`),
    ...(profile.architectureConstraints ?? []).map((a) => a.value),
    ...(profile.securityAndCompliance ?? []).map((s) => s.value),
    ...(ts?.complianceStandards ?? []),
  ]
    .join(' ')
    .toLowerCase();
  return {
    stacks,
    hasUi: [...stacks].some((s) => UI_TECH.has(s)) || hasTokens,
    hasDatabase: (ts?.databases ?? []).some((d) => !/^à définir/i.test(d)),
    hasBackend:
      [...stacks].some((s) => BACKEND_TECH.has(s)) || Boolean(ts?.apiStyle) || (ts?.databases ?? []).length > 0,
    hasE2e: [...stacks].some((s) => E2E_TECH.has(s)),
    hasInfra: (ts?.infrastructureAndDeployment ?? []).length > 0,
    hasMobile: [...stacks].some((s) => MOBILE_TECH.has(s)),
    domainText,
  };
}

export function unmetRequirement(
  reqs: Requirement[],
  ctx: ProjectContext,
  packs: ReadonlyArray<ExcellencePack>
): string | null {
  for (const r of reqs) {
    switch (r.kind) {
      case 'stack':
        if (!r.anyOf.some((s) => ctx.stacks.has(s))) return `technologie absente du projet (${r.anyOf.join(' / ')})`;
        break;
      case 'ui':
        if (!ctx.hasUi) return 'le projet n’a pas d’interface utilisateur détectée';
        break;
      case 'database':
        if (!ctx.hasDatabase) return 'aucune base de données dans le projet';
        break;
      case 'backend':
        if (!ctx.hasBackend) return 'aucun backend ou API dans le projet';
        break;
      case 'e2e':
        if (!ctx.hasE2e) return 'aucun outil de test de bout en bout (Playwright, Cypress)';
        break;
      case 'infra':
        if (!ctx.hasInfra) return 'aucune infrastructure de déploiement décrite';
        break;
      case 'mobile':
        if (!ctx.hasMobile) return 'le projet ne cible pas le mobile';
        break;
      case 'domain':
        if (!r.pattern.test(ctx.domainText)) return `domaine métier « ${r.label} » absent du cahier des charges`;
        break;
      case 'pack':
        if (!packs.includes(r.pack)) return `pack d’excellence ${r.pack} désactivé`;
        break;
    }
  }
  return null;
}

// --- Tables de classification --------------------------------------------------------------------

const req = {
  ui: { kind: 'ui' } as Requirement,
  db: { kind: 'database' } as Requirement,
  backend: { kind: 'backend' } as Requirement,
  e2e: { kind: 'e2e' } as Requirement,
  infra: { kind: 'infra' } as Requirement,
  mobile: { kind: 'mobile' } as Requirement,
  stack: (...anyOf: string[]): Requirement => ({ kind: 'stack', anyOf }),
  domain: (label: string, pattern: RegExp): Requirement => ({ kind: 'domain', label, pattern }),
  pack: (pack: ExcellencePack): Requirement => ({ kind: 'pack', pack }),
};

const DOMAINS = {
  health: req.domain('santé', /\bsanté\b|médical|\bpatients?\b|\bhds\b|\bhipaa\b|\bhealth(?:care)?\b|\bdossier médical\b/),
  crypto: req.domain('blockchain / crypto', /\bblockchain\b|\bcrypto(?:monnaie)?s?\b|\bweb3\b|\bdefi\b|\bsolidity\b|\bethereum\b|\bevm\b|\bsolana\b/),
  agentic: req.domain('agents IA / LLM', /\bllm\b|\bagents? (?:ia|ai|conversationnels?)\b|\bagentique\b|\bagentic\b|\brag\b|\bchatbot\b|\bassistant (?:ia|virtuel)\b/),
  ml: req.domain('machine learning', /machine learning|apprentissage automatique|\bpytorch\b|\btensorflow\b|entraînement (?:de|du) modèle/),
  network: req.domain('réseau', /\bréseau(?:x)? (?:informatique|d['’]entreprise)\b|\bvlan\b|\bbgp\b|\bhomelab\b|\bcisco\b|\bwireguard\b/),
  i18n: req.domain('internationalisation', /\bi18n\b|internationali[sz]ation|multilingue|plusieurs langues|traductions? de l['’]interface/),
  seo: req.domain('SEO', /\bseo\b|référencement naturel/),
  mcp: req.domain('serveurs MCP', /\bmcp\b|model context protocol/),
};

/** Préfixes de slug ECC → technologies requises (au moins une). Le plus long préfixe l'emporte. */
const STACK_PREFIXES: Record<string, { anyOf: string[]; level: 2 | 3 }> = {
  typescript: { anyOf: ['typescript'], level: 2 }, javascript: { anyOf: ['javascript'], level: 2 },
  python: { anyOf: ['python'], level: 2 }, golang: { anyOf: ['go'], level: 2 }, go: { anyOf: ['go'], level: 2 },
  rust: { anyOf: ['rust'], level: 2 }, java: { anyOf: ['java'], level: 2 }, kotlin: { anyOf: ['kotlin'], level: 2 },
  swift: { anyOf: ['swift'], level: 2 }, swiftui: { anyOf: ['swiftui'], level: 3 }, csharp: { anyOf: ['csharp'], level: 2 },
  dotnet: { anyOf: ['csharp', 'fsharp'], level: 2 }, fsharp: { anyOf: ['fsharp'], level: 2 }, cpp: { anyOf: ['cpp'], level: 2 },
  php: { anyOf: ['php'], level: 2 }, ruby: { anyOf: ['ruby'], level: 2 }, perl: { anyOf: ['perl'], level: 2 },
  dart: { anyOf: ['dart', 'flutter'], level: 2 }, flutter: { anyOf: ['flutter'], level: 3 }, arkts: { anyOf: ['arkts'], level: 2 },
  harmonyos: { anyOf: ['arkts'], level: 3 }, android: { anyOf: ['android'], level: 3 }, compose: { anyOf: ['android', 'kotlin'], level: 3 },
  react: { anyOf: ['react'], level: 3 }, 'react-native': { anyOf: ['react-native'], level: 3 }, nextjs: { anyOf: ['nextjs'], level: 3 },
  vue: { anyOf: ['vue'], level: 3 }, nuxt: { anyOf: ['nuxt'], level: 3 }, nuxt4: { anyOf: ['nuxt'], level: 3 },
  angular: { anyOf: ['angular'], level: 3 }, nestjs: { anyOf: ['nestjs'], level: 3 }, django: { anyOf: ['django'], level: 3 },
  fastapi: { anyOf: ['fastapi'], level: 3 }, flask: { anyOf: ['flask'], level: 3 }, laravel: { anyOf: ['laravel'], level: 3 },
  rails: { anyOf: ['rails'], level: 3 }, springboot: { anyOf: ['springboot'], level: 3 }, quarkus: { anyOf: ['quarkus'], level: 3 },
  jpa: { anyOf: ['jpa', 'hibernate', 'springboot'], level: 3 }, mybatis: { anyOf: ['mybatis'], level: 3 },
  prisma: { anyOf: ['prisma'], level: 3 }, postgres: { anyOf: ['postgresql'], level: 3 }, mysql: { anyOf: ['mysql', 'mariadb'], level: 3 },
  redis: { anyOf: ['redis'], level: 3 }, clickhouse: { anyOf: ['clickhouse'], level: 3 }, docker: { anyOf: ['docker', 'dockercompose'], level: 3 },
  kubernetes: { anyOf: ['kubernetes'], level: 3 }, bun: { anyOf: ['bun'], level: 3 }, vite: { anyOf: ['vite'], level: 3 },
  pytorch: { anyOf: ['pytorch'], level: 3 }, tinystruct: { anyOf: ['tinystruct'], level: 3 },
};

function matchStackPrefix(slug: string): { key: string; anyOf: string[]; level: 2 | 3; rest: string } | null {
  const parts = slug.split('-');
  for (let n = Math.min(3, parts.length - 1); n >= 1; n--) {
    const key = parts.slice(0, n).join('-');
    const hit = STACK_PREFIXES[key];
    if (hit) return { key, ...hit, rest: parts.slice(n).join('-') };
  }
  return null;
}

/** Modules ECC (manifests/install-modules.json) sans lien avec le développement logiciel. */
const NON_SOFTWARE_ECC_MODULES = new Set([
  'business-content', 'operator-workflows', 'prediction-market-skills', 'operator-desk-patterns', 'ito-compute',
  'nasiko-control-plane', 'social-distribution', 'media-generation', 'research-apis', 'supply-chain-domain',
  'document-processing', 'skill-unified-memory', 'hooks-runtime', 'hermes-hooks', 'orchestration',
]);

type Entry = { slot: string; tier: SlotTier; requires?: Requirement[]; specificity?: number };

const ECC_SKILLS: Record<string, Entry> = {
  'security-review': { slot: 'skill:security:review', tier: 'core' },
  'api-design': { slot: 'skill:backend:api-design', tier: 'standard', requires: [req.backend] },
  'backend-patterns': { slot: 'skill:backend:patterns', tier: 'standard', requires: [req.backend, req.stack('javascript', 'typescript')] },
  'frontend-patterns': { slot: 'skill:frontend:patterns', tier: 'standard', requires: [req.ui, req.stack('react', 'nextjs')] },
  'coding-standards': { slot: 'skill:quality:coding-standards', tier: 'extended' },
  'tdd-workflow': { slot: 'skill:workflow:tdd', tier: 'standard' },
  'verification-loop': { slot: 'skill:workflow:verification', tier: 'standard' },
  'e2e-testing': { slot: 'skill:testing:e2e', tier: 'standard', requires: [req.e2e] },
  'ai-regression-testing': { slot: 'skill:testing:ai-regression', tier: 'extended' },
  'database-migrations': { slot: 'skill:database:migrations', tier: 'standard', requires: [req.db] },
  'deployment-patterns': { slot: 'skill:ops:deployment', tier: 'standard', requires: [req.infra] },
  'git-workflow': { slot: 'skill:workflow:git', tier: 'extended' },
  'error-handling': { slot: 'skill:quality:error-handling', tier: 'extended' },
  accessibility: { slot: 'skill:ui:accessibility', tier: 'standard', requires: [req.ui] },
  'frontend-a11y': { slot: 'skill:ui:accessibility', tier: 'standard', requires: [req.ui] },
  'design-system': { slot: 'skill:ui:design-system', tier: 'standard', requires: [req.ui] },
  'frontend-design-direction': { slot: 'skill:ui:design-engineering', tier: 'standard', requires: [req.ui] },
  'make-interfaces-feel-better': { slot: 'skill:ui:design-engineering', tier: 'standard', requires: [req.ui] },
  'browser-qa': { slot: 'skill:ui:browser-qa', tier: 'extended', requires: [req.ui] },
  'click-path-audit': { slot: 'skill:ui:click-path-audit', tier: 'extended', requires: [req.ui] },
  'architecture-decision-records': { slot: 'skill:architecture:adr', tier: 'extended' },
  'hexagonal-architecture': { slot: 'skill:architecture:hexagonal', tier: 'extended', requires: [req.backend] },
  'contract-first': { slot: 'skill:backend:contract-first', tier: 'extended', requires: [req.backend] },
  'documentation-lookup': { slot: 'skill:docs:lookup', tier: 'extended' },
  'production-audit': { slot: 'skill:ops:production-audit', tier: 'extended' },
  'change-impact': { slot: 'skill:quality:change-impact', tier: 'extended' },
  'code-tour': { slot: 'skill:docs:code-tour', tier: 'extended' },
  'i18n-sync': { slot: 'skill:i18n', tier: 'standard', requires: [DOMAINS.i18n] },
  'healthcare-phi-compliance': { slot: 'skill:domain:health:phi', tier: 'standard', requires: [DOMAINS.health] },
  'hipaa-compliance': { slot: 'skill:domain:health:hipaa', tier: 'standard', requires: [DOMAINS.health] },
  'healthcare-emr-patterns': { slot: 'skill:domain:health:emr', tier: 'extended', requires: [DOMAINS.health] },
  'healthcare-cdss-patterns': { slot: 'skill:domain:health:cdss', tier: 'extended', requires: [DOMAINS.health] },
  'defi-amm-security': { slot: 'skill:domain:crypto:defi', tier: 'standard', requires: [DOMAINS.crypto] },
  'evm-token-decimals': { slot: 'skill:domain:crypto:evm', tier: 'extended', requires: [DOMAINS.crypto] },
  'nodejs-keccak256': { slot: 'skill:domain:crypto:keccak', tier: 'extended', requires: [DOMAINS.crypto] },
  'llm-trading-agent-security': { slot: 'skill:domain:crypto:trading-agent', tier: 'extended', requires: [DOMAINS.crypto, DOMAINS.agentic] },
  'agent-security-hardening': { slot: 'skill:domain:agentic:security', tier: 'standard', requires: [DOMAINS.agentic] },
  'mcp-server-patterns': { slot: 'skill:domain:mcp:server', tier: 'standard', requires: [DOMAINS.mcp] },
  'mle-workflow': { slot: 'skill:domain:ml:workflow', tier: 'standard', requires: [DOMAINS.ml] },
  'pytorch-patterns': { slot: 'skill:stack:pytorch:patterns', tier: 'standard', requires: [req.stack('pytorch')], specificity: 3 },
  'ml-adoption-playbook': { slot: 'skill:domain:ml:adoption', tier: 'extended', requires: [DOMAINS.ml] },
  // Applications à base de LLM : sous-ensemble choisi du module agentic-patterns (le reste outille ECC lui-même)
  'cost-aware-llm-pipeline': { slot: 'skill:domain:agentic:llm-cost', tier: 'standard', requires: [DOMAINS.agentic] },
  'prompt-caching-strategy': { slot: 'skill:domain:agentic:prompt-caching', tier: 'extended', requires: [DOMAINS.agentic] },
  'regex-vs-llm-structured-text': { slot: 'skill:domain:agentic:structured-extraction', tier: 'extended', requires: [DOMAINS.agentic] },
  'agent-architecture-audit': { slot: 'skill:domain:agentic:architecture-audit', tier: 'extended', requires: [DOMAINS.agentic] },
  'iterative-retrieval': { slot: 'skill:domain:agentic:retrieval', tier: 'extended', requires: [DOMAINS.agentic] },
  'eval-harness': { slot: 'skill:domain:agentic:evals', tier: 'extended', requires: [DOMAINS.agentic] },
  seo: { slot: 'skill:domain:seo', tier: 'standard', requires: [DOMAINS.seo, req.ui] },
};

const ECC_AGENTS: Record<string, Entry> = {
  'code-reviewer': { slot: 'agent:review:general', tier: 'core' },
  'security-reviewer': { slot: 'agent:security', tier: 'core' },
  architect: { slot: 'agent:architect', tier: 'standard' },
  'code-architect': { slot: 'agent:architect', tier: 'standard' },
  planner: { slot: 'agent:planner', tier: 'extended' },
  'database-reviewer': { slot: 'agent:database', tier: 'standard', requires: [req.db] },
  'e2e-runner': { slot: 'agent:e2e', tier: 'standard', requires: [req.e2e] },
  'build-error-resolver': { slot: 'agent:build', tier: 'standard', specificity: 1 },
  'tdd-guide': { slot: 'agent:tdd', tier: 'extended' },
  'refactor-cleaner': { slot: 'agent:refactor', tier: 'extended' },
  'doc-updater': { slot: 'agent:docs', tier: 'extended' },
  'performance-optimizer': { slot: 'agent:performance', tier: 'extended' },
  'a11y-architect': { slot: 'agent:a11y', tier: 'extended', requires: [req.ui] },
  'silent-failure-hunter': { slot: 'agent:silent-failures', tier: 'extended' },
  'code-simplifier': { slot: 'agent:simplifier', tier: 'extended' },
  'type-design-analyzer': { slot: 'agent:type-design', tier: 'extended', requires: [req.stack('typescript')] },
  'pr-test-analyzer': { slot: 'agent:test-analysis', tier: 'extended' },
  'healthcare-reviewer': { slot: 'agent:domain:health', tier: 'standard', requires: [DOMAINS.health] },
  'rag-pipeline-reviewer': { slot: 'agent:domain:rag', tier: 'standard', requires: [DOMAINS.agentic] },
  'mle-reviewer': { slot: 'agent:domain:ml', tier: 'standard', requires: [DOMAINS.ml] },
  'network-architect': { slot: 'agent:domain:network', tier: 'standard', requires: [DOMAINS.network] },
  'seo-specialist': { slot: 'agent:domain:seo', tier: 'extended', requires: [DOMAINS.seo] },
};

const COMMON_RULE_TIERS: Record<string, SlotTier> = {
  'coding-style': 'core', security: 'core', testing: 'core',
  'code-review': 'standard', 'development-workflow': 'standard', 'git-workflow': 'standard',
  patterns: 'extended', performance: 'extended',
};
const STACK_RULE_TIERS: Record<string, SlotTier> = {
  'coding-style': 'core', security: 'core', testing: 'core', patterns: 'standard',
};

const EMIL_SKILLS: Record<string, Entry> = {
  'emil-design-eng': { slot: 'skill:ui:design-engineering', tier: 'standard', requires: [req.ui] },
  animate: { slot: 'skill:ui:animation:build', tier: 'standard', requires: [req.ui] },
  'review-animations': { slot: 'skill:ui:animation:review', tier: 'standard', requires: [req.ui] },
  'break-ui': { slot: 'skill:ui:stress-test', tier: 'standard', requires: [req.ui] },
  'improve-animations': { slot: 'skill:ui:animation:audit', tier: 'extended', requires: [req.ui] },
  'animation-performance': { slot: 'skill:ui:animation:performance', tier: 'extended', requires: [req.ui] },
  'animation-vocabulary': { slot: 'skill:ui:animation:vocabulary', tier: 'extended', requires: [req.ui] },
  'find-animation-opportunities': { slot: 'skill:ui:animation:opportunities', tier: 'extended', requires: [req.ui] },
  'remove-animations': { slot: 'skill:ui:animation:removal', tier: 'extended', requires: [req.ui] },
  'apple-design': { slot: 'skill:ui:apple-design', tier: 'extended', requires: [req.ui] },
  'pick-ui-library': { slot: 'skill:ui:library-choice', tier: 'extended', requires: [req.ui, req.stack('react', 'nextjs')] },
  prototype: { slot: 'skill:ui:prototype', tier: 'extended', requires: [req.ui, req.stack('react', 'nextjs')] },
  'mobile-native': { slot: 'skill:ui:mobile-web', tier: 'extended', requires: [req.ui] },
  'ask-sonner': { slot: 'skill:stack:react:toasts', tier: 'extended', requires: [req.stack('react')], specificity: 3 },
  'animate-expo': { slot: 'skill:stack:react-native:animation', tier: 'standard', requires: [req.stack('react-native', 'expo')], specificity: 3 },
  'write-swift': { slot: 'skill:stack:swift:patterns', tier: 'standard', requires: [req.stack('swift')], specificity: 2 },
};

const CLOUDFLARE_SKILLS: Record<string, Entry> = {
  'security-audit': { slot: 'skill:security:audit', tier: 'core' },
};

const SUPERPOWERS_SLOTS: Record<string, string> = {
  'using-superpowers': 'skill:workflow:bootstrap',
  brainstorming: 'skill:workflow:design-exploration',
  'writing-plans': 'skill:workflow:planning',
  'executing-plans': 'skill:workflow:plan-execution',
  'test-driven-development': 'skill:workflow:tdd',
  'systematic-debugging': 'skill:workflow:debugging',
  'verification-before-completion': 'skill:workflow:verification',
  'requesting-code-review': 'skill:workflow:review-request',
  'receiving-code-review': 'skill:workflow:review-reception',
  'subagent-driven-development': 'skill:workflow:subagent-development',
  'dispatching-parallel-agents': 'skill:workflow:parallel-agents',
  'finishing-a-development-branch': 'skill:workflow:branch-finish',
  'using-git-worktrees': 'skill:workflow:worktrees',
};

const PONYTAIL_SLOTS: Record<string, string> = {
  ponytail: 'skill:simplicity:mode',
  'ponytail-review': 'skill:simplicity:review',
  'ponytail-audit': 'skill:simplicity:audit',
  'ponytail-debt': 'skill:simplicity:debt',
};

const CURATED: Record<string, Entry> = {
  'api-security-guards': { slot: 'rule:pack:security', tier: 'core', requires: [req.pack('SECURITY_HARDENED')] },
  'ui-craft-and-5-states': { slot: 'rule:pack:ui-craft', tier: 'core', requires: [req.pack('DESIGN_CRAFT_POLISH'), req.ui] },
  'plan-first-and-anti-omissions': { slot: 'rule:pack:workflow', tier: 'core', requires: [req.pack('EXTREME_TDD_ANTI_BUG')] },
  'security-auditor': { slot: 'agent:security', tier: 'core' },
  'ui-craft-reviewer': { slot: 'agent:review:ui', tier: 'standard', requires: [req.ui] },
};

// --- Classification -------------------------------------------------------------------------------

/**
 * Un composant est « enregistré » s'il a été indexé par le constructeur multi-sources (catalog-builder), qui pose
 * `parsedMeta.sourceId`. Les catalogues ad hoc (jeux d'essai, imports manuels) gardent le comportement historique.
 */
function resolveSource(c: ClassifiableComponent): { id: string; priority: number; registered: boolean } {
  const metaId = c.parsedMeta.sourceId;
  if (metaId === CURATED_SOURCE_ID) return { id: CURATED_SOURCE_ID, priority: CURATED_SOURCE_PRIORITY, registered: true };
  const src = metaId ? findSourceById(metaId) : undefined;
  if (src) return { id: src.id, priority: c.parsedMeta.sourcePriority ?? src.priority, registered: true };
  const byUrl = findSourceByUrl(c.sourceUrl);
  return { id: byUrl?.id ?? metaId ?? 'unknown', priority: c.parsedMeta.sourcePriority ?? UNKNOWN_SOURCE_PRIORITY, registered: false };
}

function fromEntry(base: Omit<ComponentClassification, 'tier' | 'specificity' | 'requires'>, e: Entry): ComponentClassification {
  return { ...base, slot: e.slot, tier: e.tier, specificity: e.specificity ?? 1, requires: e.requires ?? [] };
}

export function classifyComponent(c: ClassifiableComponent): ComponentClassification {
  const src = resolveSource(c);
  const base = { sourceId: src.id, sourcePriority: src.priority };
  const none: ComponentClassification = { ...base, tier: 'extended', specificity: 0, requires: [] };

  if (src.id === CURATED_SOURCE_ID) {
    const e = CURATED[c.slug];
    return e ? fromEntry(base, e) : { ...none, slot: `curated:${c.kind}:${c.slug}`, tier: 'standard', specificity: 1 };
  }

  // Exclusions : outillage interne ou mécanismes propres à Claude Code
  const fit = assessPlatformFit(c.slug, c.parsedMeta.claudeReferences ?? c.adaptedContent);
  if (fit.excluded && (src.registered || fit.code === 'META_TOOLING')) {
    return { ...none, exclusion: { code: fit.code!, reason: fit.reason! } };
  }

  if (!src.registered) {
    const e = c.kind === 'SKILL' ? ECC_SKILLS[c.slug] : c.kind === 'SUBAGENT' ? ECC_AGENTS[c.slug] : undefined;
    const family = c.parsedMeta.family;
    const generic = !family || ['common', 'general', 'agent', 'skill'].includes(family);
    return {
      ...base,
      slot: `legacy:${c.kind}:${generic ? c.slug : family}`,
      tier: 'standard',
      specificity: 1,
      // Seules les conditions de domaine métier sont reprises : la stack reste jugée par les filtres historiques.
      requires: (e?.requires ?? []).filter((r) => r.kind === 'domain'),
    };
  }

  switch (src.id) {
    case 'obra-superpowers': {
      const slot = SUPERPOWERS_SLOTS[c.slug];
      return slot ? { ...base, slot, tier: 'core', specificity: 1, requires: [], methodology: 'superpowers' } : none;
    }
    case 'dietrichgebert-ponytail': {
      const slot = PONYTAIL_SLOTS[c.slug];
      return slot ? { ...base, slot, tier: 'standard', specificity: 1, requires: [], methodology: 'ponytail' } : none;
    }
    case 'emil-kowalski-skills': {
      const e = EMIL_SKILLS[c.slug];
      return e ? fromEntry(base, e) : none;
    }
    case 'cloudflare-security-audit': {
      const e = CLOUDFLARE_SKILLS[c.slug];
      return e ? fromEntry(base, e) : none;
    }
    default:
      return classifyEccLike(c, base);
  }
}

function classifyEccLike(c: ClassifiableComponent, base: { sourceId: string; sourcePriority: number }): ComponentClassification {
  const none: ComponentClassification = { ...base, tier: 'extended', specificity: 0, requires: [] };
  const module = c.parsedMeta.eccModule;

  if (module && NON_SOFTWARE_ECC_MODULES.has(module)) {
    return {
      ...none,
      exclusion: {
        code: 'NOT_SOFTWARE_DOMAIN',
        reason: `Module ECC « ${module} » : usage métier ou opérationnel, hors développement logiciel.`,
      },
    };
  }

  if (c.kind === 'RULE') {
    const family = (c.parsedMeta.family ?? '').toLowerCase();
    const topic = c.slug.startsWith(`${family}-`) ? c.slug.slice(family.length + 1) : c.slug;
    if (family === 'common') {
      return { ...base, slot: `rule:common:${topic}`, tier: COMMON_RULE_TIERS[topic] ?? 'extended', specificity: 1, requires: [] };
    }
    if (family === 'web') {
      return { ...base, slot: `rule:web:${topic}`, tier: STACK_RULE_TIERS[topic] ?? 'extended', specificity: 2, requires: [req.ui] };
    }
    const stack = STACK_PREFIXES[family];
    if (stack) {
      return {
        ...base,
        slot: `rule:stack:${family}:${topic}`,
        tier: STACK_RULE_TIERS[topic] ?? 'extended',
        specificity: stack.level,
        requires: [req.stack(...stack.anyOf)],
      };
    }
  }

  if (c.kind === 'SUBAGENT') {
    const e = ECC_AGENTS[c.slug];
    if (e) return fromEntry(base, e);
    const reviewer = c.slug.match(/^(.+)-reviewer$/);
    const resolver = c.slug.match(/^(.+)-build-resolver$/);
    const prefix = reviewer?.[1] ?? resolver?.[1];
    const stack = prefix ? STACK_PREFIXES[prefix] : undefined;
    if (stack) {
      return {
        ...base,
        slot: reviewer ? 'agent:review:stack' : 'agent:build',
        tier: 'standard',
        specificity: stack.level,
        requires: [req.stack(...stack.anyOf)],
      };
    }
  }

  if (c.kind === 'SKILL') {
    const e = ECC_SKILLS[c.slug];
    if (e) return fromEntry(base, e);
    // Modules sans slot générique : seuls les composants listés dans ECC_SKILLS sont retenus
    if (module === 'machine-learning' || module === 'agentic-patterns') return none;
    const stack = matchStackPrefix(c.slug);
    if (stack && stack.rest) {
      const topic = stack.rest;
      const tier: SlotTier = /^(patterns|testing|security|coding-standards|developer)$/.test(topic) ? 'standard' : 'extended';
      return {
        ...base,
        slot: `skill:stack:${stack.key}:${topic}`,
        tier,
        specificity: stack.level,
        requires: [req.stack(...stack.anyOf)],
      };
    }
  }

  return none;
}
