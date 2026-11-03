import { ProjectProfile } from './schema';
import { AntigravitySurface } from '../antigravity-adapter/schema';

/**
 * Extracteur heuristique de profil (mode hors-ligne, sans LLM).
 *
 * Principe : ne rien inventer. Chaque information du profil provient du texte fourni ; ce qui n'est pas trouvé est
 * marqué « À définir » (statut `missing_or_contradictory`) et remonte en incertitude à valider par l'utilisateur à
 * l'étape 2. Aucune technologie, aucun rôle, aucune règle métier ni aucun design token n'est ajouté par défaut.
 */

export interface HeuristicExtractionParams {
  projectId: string;
  projectName: string;
  targetSurface?: AntigravitySurface;
  specText: string;
  designSystemText?: string;
  supplementaryNotes?: Record<string, string>;
}

const TBD = 'À définir';

interface Detector {
  label: string;
  /** Appliqué au texte en minuscules ; toujours avec des frontières de mots pour éviter les faux positifs. */
  pattern: RegExp;
}

const LANGUAGES: Detector[] = [
  { label: 'TypeScript', pattern: /\btypescript\b|\btsx\b/ },
  { label: 'JavaScript', pattern: /\bjavascript\b|\bnode\.?js\b/ },
  { label: 'Python', pattern: /\bpython\b/ },
  { label: 'Go', pattern: /\bgolang\b|\blangage go\b|\bgo 1\.\d+\b/ },
  { label: 'Rust', pattern: /\brust\b/ },
  { label: 'Java', pattern: /\bjava\b/ },
  { label: 'Kotlin', pattern: /\bkotlin\b/ },
  { label: 'Swift', pattern: /\bswift(?:ui)?\b/ },
  { label: 'C#', pattern: /\bcsharp\b|(?:^|\W)c#|(?:^|\W)\.net\b/ },
  { label: 'PHP', pattern: /\bphp\b/ },
  { label: 'Ruby', pattern: /\bruby\b/ },
  { label: 'SQL', pattern: /\bsql\b/ },
  { label: 'HTML/CSS', pattern: /\bhtml\b|\bcss\b|\btailwind/ },
];

const FRAMEWORKS: Detector[] = [
  { label: 'Next.js', pattern: /\bnext\.?js\b/ },
  { label: 'React', pattern: /\breact\b(?!\s*native)/ },
  { label: 'React Native', pattern: /\breact native\b/ },
  { label: 'Expo', pattern: /\bexpo\b/ },
  { label: 'Vue', pattern: /\bvue(?:\.js)?\b/ },
  { label: 'Nuxt', pattern: /\bnuxt\b/ },
  { label: 'Svelte', pattern: /\bsvelte(?:kit)?\b/ },
  { label: 'Angular', pattern: /\bangular\b/ },
  { label: 'Tailwind CSS', pattern: /\btailwind(?:\s?css)?\b/ },
  { label: 'FastAPI', pattern: /\bfastapi\b/ },
  { label: 'Django', pattern: /\bdjango\b/ },
  { label: 'Flask', pattern: /\bflask\b/ },
  { label: 'Pydantic', pattern: /\bpydantic\b/ },
  { label: 'Express', pattern: /\bexpress\.js\b|\bexpressjs\b/ },
  { label: 'NestJS', pattern: /\bnest\.?js\b/ },
  { label: 'Fastify', pattern: /\bfastify\b/ },
  { label: 'Spring Boot', pattern: /\bspring boot\b/ },
  { label: 'Laravel', pattern: /\blaravel\b/ },
  { label: 'Ruby on Rails', pattern: /\bruby on rails\b|\brails\b/ },
  { label: 'SwiftUI', pattern: /\bswiftui\b/ },
  { label: 'Tauri', pattern: /\btauri\b/ },
  { label: 'Electron', pattern: /\belectron\b/ },
  { label: 'Flutter', pattern: /\bflutter\b/ },
  { label: 'pdf-lib', pattern: /\bpdf-lib\b/ },
  { label: 'Zod', pattern: /\bzod\b/ },
];

const DATABASES: Detector[] = [
  { label: 'PostgreSQL', pattern: /\bpostgres(?:ql)?\b/ },
  { label: 'MySQL', pattern: /\bmysql\b/ },
  { label: 'MariaDB', pattern: /\bmariadb\b/ },
  { label: 'SQLite', pattern: /\bsqlite\b/ },
  { label: 'MongoDB', pattern: /\bmongo(?:db)?\b/ },
  { label: 'Redis', pattern: /\bredis\b/ },
  { label: 'SQL Server', pattern: /\bsql server\b|\bmssql\b/ },
];

const ORMS: Detector[] = [
  { label: 'Drizzle ORM', pattern: /\bdrizzle\b/ },
  { label: 'Prisma ORM', pattern: /\bprisma\b/ },
  { label: 'Kysely', pattern: /\bkysely\b/ },
  { label: 'TypeORM', pattern: /\btypeorm\b/ },
  { label: 'Sequelize', pattern: /\bsequelize\b/ },
  { label: 'Mongoose', pattern: /\bmongoose\b/ },
  { label: 'SQLAlchemy', pattern: /\bsqlalchemy\b/ },
  { label: 'SQLModel', pattern: /\bsqlmodel\b/ },
  { label: 'Alembic', pattern: /\balembic\b/ },
  { label: 'Hibernate', pattern: /\bhibernate\b/ },
  { label: 'GORM', pattern: /\bgorm\b/ },
];

const STATE_MANAGEMENT: Detector[] = [
  { label: 'TanStack Query', pattern: /\btanstack\b|\breact[- ]query\b/ },
  { label: 'Zustand', pattern: /\bzustand\b/ },
  { label: 'Redux Toolkit', pattern: /\bredux\b/ },
];

const INFRASTRUCTURE: Detector[] = [
  { label: 'Docker', pattern: /\bdocker\b/ },
  { label: 'Docker Compose', pattern: /\bdocker[- ]compose\b/ },
  { label: 'Coolify', pattern: /\bcoolify\b/ },
  { label: 'Kubernetes', pattern: /\bkubernetes\b|\bk8s\b/ },
  { label: 'Cloudflare R2', pattern: /\bcloudflare r2\b|\br2\b/ },
  { label: 'S3 compatible', pattern: /\bs3\b/ },
  { label: 'AWS', pattern: /\baws\b/ },
  { label: 'Vercel', pattern: /\bvercel\b/ },
  { label: 'Netlify', pattern: /\bnetlify\b/ },
  { label: 'Fly.io', pattern: /\bfly\.io\b/ },
  { label: 'Supabase', pattern: /\bsupabase\b/ },
  { label: 'Firebase', pattern: /\bfirebase\b/ },
  { label: 'Nginx', pattern: /\bnginx\b/ },
  { label: 'GitHub Actions', pattern: /\bgithub actions\b/ },
  { label: 'GitLab CI', pattern: /\bgitlab[- ]ci\b/ },
  { label: 'Documenso', pattern: /\bdocumenso\b/ },
  { label: 'Resend', pattern: /\bresend\b/ },
];

const TESTING: Detector[] = [
  { label: 'Vitest', pattern: /\bvitest\b/ },
  { label: 'Playwright', pattern: /\bplaywright\b/ },
  { label: 'Jest', pattern: /\bjest\b/ },
  { label: 'Cypress', pattern: /\bcypress\b/ },
  { label: 'pytest', pattern: /\bpytest\b/ },
  { label: 'Testing Library', pattern: /\btesting library\b/ },
  { label: 'axe-core', pattern: /\baxe-core\b|\bjest-axe\b|\bvitest-axe\b/ },
  { label: 'MSW', pattern: /\bmsw\b/ },
  { label: 'XCTest', pattern: /\bxctest\b/ },
  { label: 'JUnit', pattern: /\bjunit\b/ },
  { label: 'go test', pattern: /\bgo test\b/ },
  { label: 'cargo test', pattern: /\bcargo test\b/ },
];

const COMPLIANCE: Detector[] = [
  { label: 'RGPD', pattern: /\brgpd\b|\bgdpr\b/ },
  { label: 'HDS', pattern: /\bhds\b/ },
  { label: 'PCI-DSS', pattern: /\bpci[- ]dss\b/ },
  { label: 'ISO 27001', pattern: /\biso[- ]?27001\b/ },
  { label: 'SOC 2', pattern: /\bsoc ?2\b/ },
  { label: 'NIS 2', pattern: /\bnis ?2\b/ },
  { label: 'eIDAS', pattern: /\beidas\b/ },
  { label: 'RGAA', pattern: /\brgaa\b/ },
];

function detect(text: string, table: Detector[]): string[] {
  return table.filter((d) => d.pattern.test(text)).map((d) => d.label);
}

function detectWcag(text: string): string[] {
  const m = text.match(/\bwcag\s*(2\.[0-2])?(?:\s*(?:niveau|level)?\s*(aaa|aa|a)\b)?/);
  if (!m) return [];
  return [['WCAG', m[1], m[2]?.toUpperCase()].filter(Boolean).join(' ')];
}

function detectApiStyle(text: string): string | undefined {
  if (/\btrpc\b/.test(text)) return 'tRPC';
  if (/\bgraphql\b/.test(text)) return 'GraphQL';
  if (/\bgrpc\b/.test(text)) return 'gRPC';
  if (/\bserver actions?\b/.test(text)) return 'Server Actions';
  if (/\brest(?:ful)?\b/.test(text)) return 'REST';
  return undefined;
}

const SPEC_REF = (location: string) => [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location }];

const cleanInline = (s: string) => s.replace(/[*_#`]/g, '').trim();

/** Puces d'une section dont le titre (ligne commençant par #) correspond au motif. */
function collectSectionBullets(
  lines: string[],
  headingPattern: RegExp,
  max = 6
): { items: string[]; heading: string } | null {
  const idx = lines.findIndex((l) => l.startsWith('#') && headingPattern.test(l.toLowerCase()));
  if (idx === -1) return null;
  const items: string[] = [];
  for (let i = idx + 1; i < lines.length && items.length < max; i++) {
    const line = lines[i];
    if (!line) continue;
    if (line.startsWith('#')) break;
    if (/^[-*]\s+/.test(line)) items.push(cleanInline(line.replace(/^[-*]\s+/, '')));
  }
  const heading = (lines[idx] ?? '').replace(/^#+\s*/, '').trim();
  return items.length > 0 ? { items, heading } : null;
}

export function extractHeuristicProjectProfile(params: HeuristicExtractionParams): ProjectProfile {
  const spec = params.specText || '';
  const ds = params.designSystemText || '';
  const specLines = spec.split('\n').map((l) => l.trim().replace(/\+$/, '').trim()).filter(Boolean);
  const textLower = spec.toLowerCase();

  // 1. Domaine et objectif : texte du cahier des charges, sinon « À définir »
  let domain: string | undefined;
  const contextIdx = specLines.findIndex((l) => {
    const low = l.toLowerCase();
    return low.includes('contexte') || low.includes('identité') || low.includes('présentation');
  });
  const rawCandidate = contextIdx !== -1 ? specLines[contextIdx + 1] : undefined;
  if (rawCandidate && !rawCandidate.startsWith('#')) {
    const rawDesc = cleanInline(rawCandidate);
    if (rawDesc.length > 20) domain = rawDesc;
  }
  if (!domain) {
    const firstParagraph = specLines.find((l) => !l.startsWith('#') && !/^[-*|]/.test(l) && l.length > 30);
    if (firstParagraph) domain = cleanInline(firstParagraph);
  }
  const domainFound = Boolean(domain);
  const domainText = domain ?? `${TBD} : l'objectif du projet n'est pas identifiable dans le cahier des charges fourni.`;

  // 2. Rôles et personas : uniquement ceux décrits dans le document
  const roles: ProjectProfile['personasAndRoles'] = [];
  const rolesIdx = specLines.findIndex(
    (l) => l.startsWith('#') && /\brôles?\b|\broles?\b|\brbac\b|\bprofils?\b|\bacteurs\b|\bpersonas?\b|\butilisateurs\b/.test(l.toLowerCase())
  );
  if (rolesIdx !== -1) {
    for (let i = rolesIdx + 1; i < Math.min(rolesIdx + 40, specLines.length); i++) {
      const line = specLines[i];
      if (!line) continue;
      if (line.startsWith('#')) break;
      const m = line.match(/^[-*]\s*\*\*(.*?)\*\*\s*[:–-]?\s*(.*)/);
      if (m && m[1]) {
        roles.push({
          id: `role-${roles.length + 1}`,
          value: `${m[1].trim()} : ${(m[2] || m[1]).trim()}`,
          epistemicStatus: 'explicit',
          sourceRefs: SPEC_REF('Section Rôles'),
          userEdited: false,
        });
      }
    }
  }
  const rolesFound = roles.length > 0;
  if (!rolesFound) {
    roles.push({
      id: 'role-tbd',
      value: `${TBD} : les rôles et profils d'utilisateurs ne sont pas précisés dans le cahier des charges.`,
      epistemicStatus: 'missing_or_contradictory',
      sourceRefs: [],
      userEdited: false,
    });
  }

  // 3. Fonctionnalités : modules décrits dans le document, rien d'ajouté
  const features: ProjectProfile['features'] = [];
  for (let i = 0; i < specLines.length; i++) {
    const line = specLines[i];
    if (!line) continue;
    const isModuleHeading =
      line.startsWith('### Module ') || (line.startsWith('## ') && /^[0-9]+\./.test(line.replace('## ', '').trim()));
    if (!isModuleHeading) continue;

    const heading = line.replace(/^#{2,3}\s*/, '').trim();
    const title = heading.replace(/^[0-9.]+\s*/, '').replace(/^Module\s*[0-9]*\s*[:–-]?\s*/i, '').trim();
    const lowTitle = title.toLowerCase();
    if (!title || lowTitle.includes('contexte') || lowTitle.includes('rôles') || lowTitle.includes('erd') || lowTitle.includes('roadmap')) {
      continue;
    }

    const rules: string[] = [];
    let summary: string | undefined;
    for (let j = i + 1; j < Math.min(i + 15, specLines.length); j++) {
      const sub = specLines[j];
      if (!sub) continue;
      if (sub.startsWith('#')) break;
      if (sub.startsWith('- ') || sub.startsWith('* ')) {
        rules.push(cleanInline(sub.replace(/^[-*]\s*/, '')));
      } else if (!summary && !sub.startsWith('|') && sub.length > 20) {
        summary = cleanInline(sub);
      }
    }

    features.push({
      id: `FEAT-${String(features.length + 1).padStart(2, '0')}`,
      title,
      description: summary ?? `Module « ${title} » décrit dans le cahier des charges.`,
      priority: features.length < 4 ? 'P0' : 'P1',
      businessRules: rules.slice(0, 5),
      acceptanceCriteria: [`${TBD} : critères d'acceptation du module « ${title} » non fournis dans le cahier des charges.`],
      epistemicStatus: 'explicit',
      sourceRefs: SPEC_REF(heading),
    });
    if (features.length >= 8) break;
  }
  const featuresFound = features.length > 0;
  if (!featuresFound) {
    features.push({
      id: 'FEAT-01',
      title: `${TBD} : fonctionnalités`,
      description: "Aucune fonctionnalité structurée (module ou section numérotée) n'a été détectée dans le cahier des charges.",
      priority: 'P0',
      businessRules: [],
      acceptanceCriteria: [`${TBD} avec l'utilisateur à l'étape 2.`],
      epistemicStatus: 'missing_or_contradictory',
      sourceRefs: [],
    });
  }

  // 4. Pile technique : uniquement ce qui est écrit dans le document
  const languages = detect(textLower, LANGUAGES);
  const frameworks = detect(textLower, FRAMEWORKS);
  const databases = detect(textLower, DATABASES);
  const infra = detect(textLower, INFRASTRUCTURE);
  const ormAndDataLayer = detect(textLower, ORMS);
  const stateManagement = detect(textLower, STATE_MANAGEMENT);
  const testingTools = detect(textLower, TESTING);
  const complianceStandards = [...detect(textLower, COMPLIANCE), ...detectWcag(textLower)];
  const apiStyle = detectApiStyle(textLower);
  const stackFound = languages.length > 0;

  // 5. Design system : tokens lus dans le document, jamais inventés
  const colorTokens: Record<string, string> = {};
  const dsLines = ds.split('\n').map((l) => l.trim().replace(/\+$/, '').trim());
  for (const line of dsLines) {
    const tableMatch = line.match(/\|\s*([a-zA-Z0-9_\-\s]+)\s*\|\s*`?(#[a-fA-F0-9]{3,8})`?\s*\|/);
    if (tableMatch && tableMatch[1] && tableMatch[2]) {
      colorTokens[tableMatch[1].trim().toLowerCase().replace(/\s+/g, '-')] = tableMatch[2].trim();
    }
  }
  const fontFamilies: Record<string, string> = {};
  for (const line of dsLines) {
    const cssVar = line.match(/--font-([a-z0-9-]+)\s*:\s*([^;]+);?/i);
    if (cssVar && cssVar[1] && cssVar[2]) fontFamilies[cssVar[1].toLowerCase()] = cssVar[2].trim();
  }
  const tokensFound = Object.keys(colorTokens).length > 0;

  const rawFirstLine = cleanInline(ds.split('\n')[0] ?? '');
  const brandIdentity =
    ds.length > 50 && rawFirstLine ? rawFirstLine : `${params.projectName || 'Projet'} Design System (${TBD.toLowerCase()})`;

  const wcag = complianceStandards.find((c) => c.startsWith('WCAG'));
  const dsProfile: ProjectProfile['designSystem'] = {
    brandIdentity,
    colorTokens,
    typography: { fontFamilies, scaleNotes: '' },
    spacingAndLayout: '',
    componentGuidelines: [],
    uxAndAccessibilityRules: wcag ? [`Conformité ${wcag} exigée par le cahier des charges.`] : [],
    epistemicStatus: tokensFound ? 'explicit' : 'missing_or_contradictory',
    sourceRefs: ds.trim() ? [{ documentId: 'ds-doc', documentName: 'DESIGN.md', location: 'Tokens' }] : [],
  };

  // 6. Contraintes tirées des sections du document (rien d'ajouté en dehors)
  const toTraceable = (
    prefix: string,
    section: { items: string[]; heading: string } | null
  ): ProjectProfile['architectureConstraints'] =>
    (section?.items ?? []).map((value, index) => ({
      id: `${prefix}-${index + 1}`,
      value,
      epistemicStatus: 'explicit' as const,
      sourceRefs: SPEC_REF(section?.heading ?? ''),
      userEdited: false,
    }));
  const architectureConstraints = toTraceable('arch', collectSectionBullets(specLines, /architecture/));
  const securityAndCompliance = toTraceable('sec', collectSectionBullets(specLines, /sécurité|securite|security|conformité/));
  const qualityAndTestingStrategy = toTraceable('qa', collectSectionBullets(specLines, /qualité|qualite|tests?\b/));

  // 7. Incertitudes : uniquement ce qui manque réellement dans le document
  const uncertainties: ProjectProfile['uncertainties'] = [];
  const addUncertainty = (u: Omit<ProjectProfile['uncertainties'][number], 'id' | 'sourceRefs'>) => {
    uncertainties.push({ ...u, id: `unc-${uncertainties.length + 1}`, sourceRefs: SPEC_REF('Absent du document') });
  };

  if (!domainFound) {
    addUncertainty({
      category: 'missing_information',
      topic: "Objectif du projet",
      statement: "Le cahier des charges ne permet pas d'identifier l'objectif du projet.",
      impact: 'high',
      proposedFallback: "Demander à l'utilisateur de décrire en quelques lignes l'objectif, les utilisateurs et le périmètre.",
      requiresHumanDecision: true,
    });
  }
  if (!stackFound) {
    addUncertainty({
      category: 'missing_information',
      topic: 'Pile technique non précisée',
      statement: "Aucun langage de programmation n'est mentionné dans le cahier des charges.",
      impact: 'high',
      proposedFallback: "Demander à l'utilisateur le langage, le framework, la base de données et leurs versions exactes.",
      requiresHumanDecision: true,
    });
  }
  if (!rolesFound) {
    addUncertainty({
      category: 'missing_information',
      topic: "Rôles et profils d'utilisateurs",
      statement: "Aucun rôle d'utilisateur n'est décrit dans le cahier des charges.",
      impact: 'medium',
      proposedFallback: "Demander la liste des rôles et leurs droits, ou confirmer qu'il n'y a qu'un seul profil.",
      requiresHumanDecision: true,
    });
  }
  if (infra.length === 0) {
    addUncertainty({
      category: 'missing_information',
      topic: 'Hébergement et déploiement',
      statement: "Le cahier des charges ne précise ni l'hébergement ni le mode de déploiement.",
      impact: 'medium',
      proposedFallback: "Demander l'environnement de production visé (conteneurs, hébergeur, intégration continue).",
      requiresHumanDecision: true,
    });
  }
  if (testingTools.length === 0) {
    addUncertainty({
      category: 'missing_information',
      topic: 'Outils de test',
      statement: "Aucun outil de test n'est mentionné dans le cahier des charges.",
      impact: 'medium',
      proposedFallback: "Demander l'outil de test et la commande de vérification du projet.",
      requiresHumanDecision: true,
    });
  }
  if (!/authentifi|oauth|\bjwt\b|\bsso\b|passkey|mot de passe|\bsession\b|\blogin\b|connexion/.test(textLower)) {
    addUncertainty({
      category: 'missing_information',
      topic: "Méthode d'authentification et gestion de session",
      statement: "Le document ne précise pas le mode d'authentification (OAuth2, passkeys, JWT, session…).",
      impact: 'medium',
      proposedFallback: "À confirmer avec l'utilisateur ; à défaut, session sécurisée HTTP-only avec hachage Argon2 ou bcrypt.",
      requiresHumanDecision: true,
    });
  }
  if (!/sauvegarde|backup|audit|journal|traçabilité|tracabilite/.test(textLower)) {
    addUncertainty({
      category: 'hypothesis',
      topic: "Politique de sauvegarde et journal d'audit",
      statement: "Aucune directive explicite sur la fréquence de sauvegarde ni sur la rétention du journal d'audit.",
      impact: 'medium',
      proposedFallback: 'Sauvegardes journalières de la base de données et journal d\'audit horodaté, à valider.',
      requiresHumanDecision: false,
    });
  }
  if (!tokensFound) {
    addUncertainty({
      category: 'missing_information',
      topic: 'Design system',
      statement: ds.trim()
        ? "Aucun token de couleur n'a pu être lu dans le design system fourni (tableau Markdown « nom | #couleur »)."
        : 'Aucun design system fourni.',
      impact: 'medium',
      proposedFallback: "Fournir un DESIGN.md avec un tableau de tokens, ou confirmer qu'il n'y a pas de design system imposé.",
      requiresHumanDecision: true,
    });
  }

  return {
    projectId: params.projectId,
    projectName: params.projectName || 'Projet Antigravity',
    projectDescription: domainText,
    targetSurface: params.targetSurface || 'APP',
    profileVersion: 1,

    domainAndObjective: {
      id: 'dom-01',
      value: domainText,
      epistemicStatus: domainFound ? 'explicit' : 'missing_or_contradictory',
      sourceRefs: domainFound ? SPEC_REF('Section 1') : [],
      userEdited: false,
    },

    personasAndRoles: roles,
    features,

    techStack: {
      languages: stackFound ? languages : [TBD],
      frameworks,
      databases,
      ormAndDataLayer,
      stateManagement,
      apiStyle,
      infrastructureAndDeployment: infra,
      testingTools,
      complianceStandards,
      epistemicStatus: stackFound ? 'explicit' : 'missing_or_contradictory',
      sourceRefs: SPEC_REF('Spécifications techniques'),
    },

    architectureConstraints,
    securityAndCompliance,
    qualityAndTestingStrategy,

    designSystem: dsProfile,
    uncertainties,
    supplementaryNotes: params.supplementaryNotes || {},
  };
}
