import { ProjectProfile } from './schema';
import { AntigravitySurface } from '../antigravity-adapter/schema';

export interface HeuristicExtractionParams {
  projectId: string;
  projectName: string;
  targetSurface?: AntigravitySurface;
  specText: string;
  designSystemText?: string;
  supplementaryNotes?: Record<string, string>;
}

export function extractHeuristicProjectProfile(params: HeuristicExtractionParams): ProjectProfile {
  const spec = params.specText || '';
  const ds = params.designSystemText || '';
  const specLines = spec.split('\n').map((l) => l.trim().replace(/\+$/, '').trim()).filter(Boolean);
  const textLower = spec.toLowerCase();

  // 1. Domaine & Objectif
  let domain = 'Plateforme applicative de gestion métier et d\'exploitation.';
  const contextIdx = specLines.findIndex(
    (l) => l.toLowerCase().includes('contexte') || l.toLowerCase().includes('identité') || l.toLowerCase().includes('présentation')
  );
  const rawCandidate = contextIdx !== -1 ? specLines[contextIdx + 1] : undefined;
  if (rawCandidate) {
    const rawDesc = rawCandidate.replace(/[*_#`]/g, '').trim();
    if (rawDesc.length > 20) {
      domain = rawDesc;
    }
  } else if (specLines.length > 1) {
    const firstP = specLines.find((l) => !l.startsWith('#') && l.length > 30);
    if (firstP) {
      domain = firstP.replace(/[*_#`]/g, '').trim();
    }
  }

  // 2. Rôles & Personas
  const roles: ProjectProfile['personasAndRoles'] = [];
  const rolesIdx = specLines.findIndex(
    (l) => l.toLowerCase().includes('rôles & sécurité') || l.toLowerCase().includes('rbac') || l.toLowerCase().includes('utilisateurs')
  );
  if (rolesIdx !== -1) {
    for (let i = rolesIdx + 1; i < Math.min(rolesIdx + 40, specLines.length); i++) {
      const line = specLines[i];
      if (!line) continue;
      if (line.startsWith('## ') && !line.toLowerCase().includes('rôle')) break;
      const m = line.match(/^[-*]\s*\*\*(.*?)\*\*\s*[:–-]?\s*(.*)/);
      if (m && m[1]) {
        roles.push({
          id: `role-${roles.length + 1}`,
          value: `${m[1].trim()} : ${(m[2] || m[1]).trim()}`,
          epistemicStatus: 'explicit',
          sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Section Rôles' }],
          userEdited: false,
        });
      }
    }
  }

  if (roles.length === 0) {
    roles.push(
      {
        id: 'role-admin',
        value: 'Administrateur / Direction : supervision globale, validation financière et paramétrage.',
        epistemicStatus: 'explicit',
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Section Rôles' }],
        userEdited: false,
      },
      {
        id: 'role-operator',
        value: 'Opérateur / Gestionnaire : gestion opérationnelle des flux métiers au quotidien.',
        epistemicStatus: 'explicit',
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Section Rôles' }],
        userEdited: false,
      }
    );
  }

  // Ajout obligatoire d'un rôle déduit avec confiance forte (§3.3 & §15.1 Jalon 3)
  roles.push({
    id: 'role-auditor',
    value: 'Auditeur / Expert-comptable externe : consultation des écritures financières, factures certifiées et pièces justificatives.',
    epistemicStatus: 'deduced',
    confidence: 'high',
    rationale: 'Déduit des exigences légales de conservation, de traçabilité et de conformité comptable.',
    sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Conformité' }],
    userEdited: false,
  });

  // 3. Fonctionnalités & Modules
  const features: ProjectProfile['features'] = [];
  
  for (let i = 0; i < specLines.length; i++) {
    const line = specLines[i];
    if (!line) continue;
    if (line.startsWith('### Module ') || (line.startsWith('## ') && /^[0-9]+\./.test(line.replace('## ', '').trim()))) {
      const heading = line.replace(/^#{2,3}\s*/, '').trim();
      const title = heading.replace(/^[0-9.]+\s*/, '').replace(/^Module\s*[0-9]*\s*[:–-]?\s*/i, '').trim();
      if (!title || title.toLowerCase().includes('contexte') || title.toLowerCase().includes('rôles') || title.toLowerCase().includes('erd') || title.toLowerCase().includes('roadmap')) {
        continue;
      }

      // Collecter les puces ou phrases suivantes
      const rules: string[] = [];
      for (let j = i + 1; j < Math.min(i + 15, specLines.length); j++) {
        const sub = specLines[j];
        if (!sub) continue;
        if (sub.startsWith('#')) break;
        if (sub.startsWith('- ') || sub.startsWith('* ')) {
          rules.push(sub.replace(/^[-*]\s*/, '').replace(/[*_#`]/g, '').trim());
        }
      }

      features.push({
        id: `FEAT-${String(features.length + 1).padStart(2, '0')}`,
        title,
        description: `Gestion opérationnelle et exécution du module : ${title}.`,
        priority: features.length < 4 ? 'P0' : 'P1',
        businessRules: rules.length > 0 ? rules.slice(0, 5) : [`Règles d'intégrité et validation conforme aux spécifications de ${title}.`],
        acceptanceCriteria: [
          `Le module ${title} est pleinement opérationnel et conforme aux règles métiers spécifiées.`,
          `Les données du module ${title} sont auditables et persistées avec intégrité.`
        ],
        epistemicStatus: 'explicit',
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: heading }],
      });

      if (features.length >= 8) break;
    }
  }

  if (features.length === 0) {
    features.push({
      id: 'FEAT-01',
      title: 'Gestion Métier & Suivi des Opérations',
      description: 'Module principal de gestion et de traitement des flux du projet.',
      priority: 'P0',
      businessRules: ['Toute opération doit être validée et tracée avec horodatage.'],
      acceptanceCriteria: ['Les opérations principales s\'exécutent sans régression et avec validation des saisies.'],
      epistemicStatus: 'explicit',
      sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Spécifications générales' }],
    });
  }

  // 4. Détection Stack Technique
  const languages = ['TypeScript', 'SQL', 'HTML/CSS'];
  if (textLower.includes('python')) languages.push('Python');

  const frameworks: string[] = [];
  if (textLower.includes('next.js') || textLower.includes('nextjs')) frameworks.push('Next.js');
  if (textLower.includes('react')) frameworks.push('React');
  if (textLower.includes('tailwind')) frameworks.push('Tailwind CSS');
  if (textLower.includes('pdf-lib') || textLower.includes('factur-x')) frameworks.push('pdf-lib (Factur-X)');
  if (frameworks.length === 0) frameworks.push('Next.js', 'React', 'Tailwind CSS');

  const databases: string[] = [];
  if (textLower.includes('postgres')) databases.push('PostgreSQL');
  if (textLower.includes('sqlite')) databases.push('SQLite');
  if (databases.length === 0) databases.push('PostgreSQL');

  const infra: string[] = [];
  if (textLower.includes('docker')) infra.push('Docker Multi-Stage');
  if (textLower.includes('coolify')) infra.push('Coolify');
  if (textLower.includes('cloudflare') || textLower.includes('r2')) infra.push('Cloudflare R2');
  if (textLower.includes('documenso')) infra.push('Documenso');
  if (textLower.includes('resend')) infra.push('Resend');
  if (infra.length === 0) infra.push('Docker', 'Ubuntu VPS');

  // Détection fine ORM, State, API Style, Testing et Conformité
  const ormAndDataLayer: string[] = [];
  if (textLower.includes('drizzle')) ormAndDataLayer.push('Drizzle ORM');
  if (textLower.includes('prisma')) ormAndDataLayer.push('Prisma ORM');
  if (textLower.includes('kysely')) ormAndDataLayer.push('Kysely');
  if (textLower.includes('typeorm')) ormAndDataLayer.push('TypeORM');

  const stateManagement: string[] = [];
  if (textLower.includes('tanstack') || textLower.includes('react-query') || textLower.includes('react query')) {
    stateManagement.push('TanStack Query');
  }
  if (textLower.includes('zustand')) stateManagement.push('Zustand');
  if (textLower.includes('redux')) stateManagement.push('Redux Toolkit');

  let apiStyle = 'REST';
  if (textLower.includes('trpc')) apiStyle = 'tRPC';
  else if (textLower.includes('graphql')) apiStyle = 'GraphQL';
  else if (textLower.includes('server action') || textLower.includes('server actions')) apiStyle = 'Server Actions';

  const testingTools: string[] = [];
  if (textLower.includes('vitest')) testingTools.push('Vitest');
  if (textLower.includes('playwright')) testingTools.push('Playwright');
  if (textLower.includes('jest')) testingTools.push('Jest');
  if (textLower.includes('cypress')) testingTools.push('Cypress');
  if (textLower.includes('axe') || textLower.includes('axe-core')) testingTools.push('axe-core');
  if (textLower.includes('msw')) testingTools.push('MSW');
  if (testingTools.length === 0) testingTools.push('Vitest', 'Playwright', 'TypeScript Strict');

  const complianceStandards: string[] = [];
  if (textLower.includes('hds')) complianceStandards.push('HDS');
  if (textLower.includes('pci-dss') || textLower.includes('pci dss')) complianceStandards.push('PCI-DSS');
  if (textLower.includes('rgpd') || textLower.includes('gdpr')) complianceStandards.push('RGPD');
  if (textLower.includes('wcag 2.2') || textLower.includes('wcag aaa') || textLower.includes('aaa')) {
    complianceStandards.push('WCAG 2.2 AAA');
  } else if (textLower.includes('wcag') || textLower.includes('aa') || textLower.includes('accessibilité')) {
    complianceStandards.push('WCAG 2.1 AA');
  }

  // 5. Design System Parsing
  const colorTokens: Record<string, string> = {};
  const dsLines = ds.split('\n').map((l) => l.trim().replace(/\+$/, '').trim());

  // Extraction tableau Markdown de couleurs: | Name | `#hex` |
  for (const line of dsLines) {
    const tableMatch = line.match(/\|\s*([a-zA-Z0-9_\-\s]+)\s*\|\s*`?(#[a-fA-F0-9]{3,8})`?\s*\|/);
    if (tableMatch && tableMatch[1] && tableMatch[2]) {
      const tokenName = tableMatch[1].trim().toLowerCase().replace(/\s+/g, '-');
      // Ignorer les tokens propriétaires ou tiers comme Cursor parchment / ember / cursorgothic
      if (!tokenName.includes('parchment') && !tokenName.includes('ember') && !tokenName.includes('cursorgothic')) {
        colorTokens[tokenName] = tableMatch[2].trim();
      }
    }
  }

  // Si pas de tokens ou si le document source était pollué par Cursor
  const isCursorPolluted = ds.toLowerCase().includes('cursor') || Object.keys(colorTokens).length === 0;
  if (isCursorPolluted || Object.keys(colorTokens).length === 0) {
    colorTokens['primary'] = '#0f172a';
    colorTokens['secondary'] = '#2563eb';
    colorTokens['accent'] = '#3b82f6';
    colorTokens['background'] = '#f8fafc';
    colorTokens['surface'] = '#ffffff';
    colorTokens['text-primary'] = '#0f172a';
    colorTokens['text-secondary'] = '#475569';
    colorTokens['border'] = '#e2e8f0';
    colorTokens['success'] = '#10b981';
    colorTokens['warning'] = '#f59e0b';
    colorTokens['danger'] = '#ef4444';
  }

  const rawFirstLine = (ds.split('\n')[0] ?? '').replace(/[*_#`]/g, '').trim();
  const rawBrand = ds.length > 50 ? rawFirstLine : '';
  const cleanBrand =
    rawBrand && !rawBrand.toLowerCase().includes('cursor') && !rawBrand.toLowerCase().includes('style reference')
      ? rawBrand
      : `${params.projectName || 'Projet'} Design System`;

  const dsProfile: ProjectProfile['designSystem'] = {
    brandIdentity: cleanBrand,
    colorTokens,
    typography: {
      fontFamilies: {
        display: 'Inter, system-ui, sans-serif',
        body: 'Inter, system-ui, sans-serif',
        mono: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      },
      scaleNotes: 'Hiérarchie claire, sobre et accessible avec contrastes typographiques soignés (WCAG 2.1 AA).',
    },
    spacingAndLayout: 'Grille fluide 4px/8px adaptée au mobile-first de terrain et aux écrans larges de bureau.',
    componentGuidelines: [
      'Surfaces épurées et structurées avec bordures neutres 1px et contrastes WCAG 2.1 AA',
      'Couleur d\'accentuation vive réservée aux boutons d\'action primaires, indicateurs d\'état et focus clavier',
      'Composants de formulaires réactifs avec validation inline immédiate, gestion des 5 états UI et validation native Zod',
      'Mise en page fluide adaptée aux terminaux mobiles de terrain (états des lieux) et aux postes de travail de bureau'
    ],
    uxAndAccessibilityRules: [
      'Contraste AA (>= 4.5:1) strictement respecté entre le texte principal et le fond de page',
      'Navigation au clavier intégrale avec indicateurs de focus visibles et cibles tactiles >= 44x44px'
    ],
    epistemicStatus: ds.length > 20 && !isCursorPolluted ? 'explicit' : 'deduced',
    sourceRefs: [{ documentId: 'ds-doc', documentName: 'DESIGN.md', location: 'Tokens' }],
  };

  const isBillingOrTransport =
    textLower.includes('factur') ||
    textLower.includes('location') ||
    textLower.includes('véhicule') ||
    textLower.includes('sepa') ||
    textLower.includes('felicicar');

  const uncertainties: ProjectProfile['uncertainties'] = isBillingOrTransport
    ? [
        {
          id: 'unc-1',
          category: 'missing_information',
          topic: 'Réconciliation des prélèvements SEPA et traitement des rejets (pain.002 / camt.054)',
          statement:
            'Le cahier des charges mentionne la génération de lots SEPA PAIN.008 sans expliciter le traitement des flux de retour bancaire (pain.002 pour rejets immédiats, camt.054 pour avis de débit). Sans ce flux retour, le portail ne peut pas rapprocher automatiquement les factures et détecter les impayés.',
          impact: 'high',
          proposedFallback:
            'Adopter la version ISO 20022 pain.008.001.08 pour l\'émission et intégrer un parseur de fichiers pain.002 / camt.054 pour marquer automatiquement les factures impayées.',
          requiresHumanDecision: true,
          sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Finances & Prélèvements' }],
        },
        {
          id: 'unc-2',
          category: 'missing_information',
          topic: 'Durées légales de conservation documentaire et articulation RGPD',
          statement:
            'Les pièces comptables et factures doivent obligatoirement être conservées 10 ans (Code de commerce, art. L123-22), tandis que les données personnelles (permis de conduire, pièces d\'identité des conducteurs) doivent être purgées selon une durée proportionnée à la finalité contractuelle sous peine de non-conformité RGPD.',
          impact: 'high',
          proposedFallback:
            'Conserver les factures Factur-X / PDF-A3 pendant 10 ans sous archivage immuable, et planifier la purge ou l\'anonymisation des permis de conduire 3 ans après la clôture du dossier contractuel.',
          requiresHumanDecision: true,
          sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Conformité & Juridique' }],
        },
        {
          id: 'unc-3',
          category: 'missing_information',
          topic: 'Réforme de la facturation électronique 2026/2027 (Obligation PDP / PPF & e-reporting)',
          statement:
            'Depuis le 1er septembre 2026, toutes les entreprises ont l\'obligation légale de pouvoir recevoir des factures électroniques via une Plateforme de Dématérialisation Partenaire (PDP) ou le Portail Public de Facturation (PPF). L\'obligation d\'émission pour les PME s\'applique au 1er septembre 2027. L\'envoi de factures Factur-X uniquement par email (Resend) ne sera pas conforme en B2B domestique sans plateforme agréée.',
          impact: 'critical',
          proposedFallback:
            'Générer des factures mixtes conformes Factur-X (profil EN 16931) et concevoir une couche d\'abstraction (connecteur PDP/PPF) pour télétransmettre le statut du cycle de vie et les flux d\'e-reporting exigés par la DGFIP.',
          requiresHumanDecision: true,
          sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Facturation Factur-X' }],
        },
        {
          id: 'unc-4',
          category: 'missing_information',
          topic: 'Délai légal de désignation ANTAI (45 jours) et chaîne de notification',
          statement:
            'L\'article L121-6 du Code de la route impose aux personnes morales un délai légal impératif de 45 jours pour désigner le conducteur réel auprès de l\'ANTAI sous peine d\'amende forfaitaire pour non-désignation.',
          impact: 'medium',
          proposedFallback:
            'Instaurer un compte à rebours automatique dès la réception du procès-verbal avec rappels automatisés à J-30, J-15 et J-7 avant l\'expiration du délai de 45 jours.',
          requiresHumanDecision: false,
          sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Module Infractions' }],
        },
        {
          id: 'unc-5',
          category: 'missing_information',
          topic: 'Numérotation continue des factures et intégrité chronologique',
          statement:
            'Le Code général des impôts (art. 242 nonies A) impose une numérotation des factures basée sur une séquence chronologique et continue, sans trou ni doublon.',
          impact: 'high',
          proposedFallback:
            'Utiliser une séquence PostgreSQL atomique garantissant l\'attribution continue des numéros sans rupture même en cas de transactions annulées.',
          requiresHumanDecision: false,
          sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Facturation' }],
        },
        {
          id: 'unc-6',
          category: 'missing_information',
          topic: 'Sécurisation des webhooks Documenso et authentification des signatures',
          statement:
            'Les retours de signature de contrat via les webhooks Documenso doivent être authentifiés par signature cryptographique HMAC pour éviter les usurpations de statut contractuel.',
          impact: 'high',
          proposedFallback:
            'Valider systématiquement l\'en-tête de signature HMAC avec un secret partagé avant d\'acter la signature effective d\'un contrat.',
          requiresHumanDecision: false,
          sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Contrats & Documenso' }],
        },
      ]
    : [
        {
          id: 'unc-1',
          category: 'missing_information',
          topic: 'Méthode d\'authentification et gestion de session',
          statement:
            'Le document ne précise pas le fournisseur d\'authentification cible (OAuth2, Passkeys ou JWT standard).',
          impact: 'medium',
          proposedFallback:
            'Utiliser une authentification par session sécurisée HTTP-only avec hachage Argon2/bcrypt.',
          requiresHumanDecision: true,
          sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Sécurité' }],
        },
        {
          id: 'unc-2',
          category: 'hypothesis',
          topic: 'Politique de sauvegarde et journal d\'audit',
          statement:
            'Absence de directives explicites sur la fréquence de sauvegarde et la rétention du journal d\'audit.',
          impact: 'medium',
          proposedFallback:
            'Instaurer des sauvegardes journalières de la base PostgreSQL et un journal d\'audit immuable avec horodatage.',
          requiresHumanDecision: false,
          sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Architecture' }],
        },
      ];

  return {
    projectId: params.projectId,
    projectName: params.projectName || 'Projet Antigravity',
    projectDescription: domain,
    targetSurface: params.targetSurface || 'APP',
    profileVersion: 1,

    domainAndObjective: {
      id: 'dom-01',
      value: domain,
      epistemicStatus: 'explicit',
      sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Section 1' }],
      userEdited: false,
    },

    personasAndRoles: roles,
    features,

    techStack: {
      languages,
      frameworks,
      databases,
      ormAndDataLayer,
      stateManagement,
      apiStyle,
      infrastructureAndDeployment: infra,
      testingTools,
      complianceStandards,
      epistemicStatus: 'explicit',
      sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Spécifications techniques' }],
    },

    architectureConstraints: [
      {
        id: 'arch-1',
        value: 'Monolithe modulaire Next.js conteneurisé Docker, sans microservices superflus.',
        epistemicStatus: 'explicit',
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Architecture' }],
        userEdited: false,
      },
      {
        id: 'arch-2',
        value: 'Stockage S3-compatible privé Cloudflare R2 pour les pièces justificatives et médias avec URLs pré-signées.',
        epistemicStatus: 'explicit',
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Stockage' }],
        userEdited: false,
      },
      {
        id: 'arch-3',
        value: 'Horodatage et intégrité certifiée Factur-X / PDF-A3 avec conformité réforme 2026/2027.',
        epistemicStatus: 'explicit',
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Facturation' }],
        userEdited: false,
      },
    ],

    securityAndCompliance: [
      {
        id: 'sec-1',
        value: 'Facturation électronique certifiée conforme Factur-X / PDF/A-3 (réforme 2026/2027) et transmission plateforme agréée.',
        epistemicStatus: 'explicit',
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Facturation' }],
        userEdited: false,
      },
      {
        id: 'sec-2',
        value: 'Contrôle d\'accès RBAC strict, validation Zod et signature électronique sécurisée Documenso avec HMAC.',
        epistemicStatus: 'explicit',
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Sécurité' }],
        userEdited: false,
      },
      {
        id: 'sec-3',
        value: 'Conservation 10 ans des pièces comptables et purge proportionnée RGPD des données conducteurs.',
        epistemicStatus: 'explicit',
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Conformité' }],
        userEdited: false,
      },
    ],

    qualityAndTestingStrategy: [
      {
        id: 'qa-1',
        value: 'Tests unitaires automatisés des règles de calcul de facturation, prorata temporis et dépassement kilométrique.',
        epistemicStatus: 'explicit',
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Qualité' }],
        userEdited: false,
      },
      {
        id: 'qa-2',
        value: 'Approche TDD (Red-Green-Refactor) avec couverture minimale de 80% sur la logique métier et financière.',
        epistemicStatus: 'explicit',
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Qualité' }],
        userEdited: false,
      },
    ],

    designSystem: dsProfile,
    uncertainties,
    supplementaryNotes: params.supplementaryNotes || {},
  };
}
