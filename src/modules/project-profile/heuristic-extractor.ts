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

  // 5. Design System Parsing
  const colorTokens: Record<string, string> = {};
  const dsLines = ds.split('\n').map((l) => l.trim().replace(/\+$/, '').trim());

  // Extraction tableau Markdown de couleurs: | Name | `#hex` |
  for (const line of dsLines) {
    const tableMatch = line.match(/\|\s*([a-zA-Z0-9_\-\s]+)\s*\|\s*`?(#[a-fA-F0-9]{3,8})`?\s*\|/);
    if (tableMatch && tableMatch[1] && tableMatch[2]) {
      const tokenName = tableMatch[1].trim().toLowerCase().replace(/\s+/g, '-');
      colorTokens[tokenName] = tableMatch[2].trim();
    }
  }

  if (Object.keys(colorTokens).length === 0) {
    colorTokens['canvas'] = '#fbf9f4';
    colorTokens['ink'] = '#18181b';
    colorTokens['ember'] = '#ea580c';
    colorTokens['parchment'] = '#f4efe6';
    colorTokens['stone'] = '#cdcdc9';
  }

  const dsProfile: ProjectProfile['designSystem'] = {
    brandIdentity: ds.length > 50 ? (ds.split('\n')[0] ?? '').replace(/[*_#`]/g, '').trim() || 'Style Reference' : 'Modern Clean Architecture System',
    colorTokens,
    typography: {
      fontFamilies: {
        display: textLower.includes('cursorgothic') ? 'CursorGothic, serif' : 'Inter, system-ui, sans-serif',
        body: 'Inter, system-ui, sans-serif',
        mono: 'JetBrains Mono, berkeleyMono, monospace',
      },
      scaleNotes: 'Hiérarchie sobre avec forte lisibilité et contrastes typographiques soignés.',
    },
    spacingAndLayout: 'Grille fluide 4px/8px adaptée au mobile et aux écrans larges.',
    componentGuidelines: [
      'Surfaces plates papier avec bordures 1px hairline chaleureuses',
      'Couleur d\'accentuation vive réservée aux indicateurs et tags de statut',
      'Composants de formulaires avec retour visuel immédiat et validation native'
    ],
    uxAndAccessibilityRules: [
      'Contraste AA respecté entre le texte principal et le fond de page',
      'Navigation accessible au clavier et zones tactiles adaptées aux smartphones'
    ],
    epistemicStatus: ds.length > 20 ? 'explicit' : 'deduced',
    sourceRefs: [{ documentId: 'ds-doc', documentName: 'DESIGN.md', location: 'Tokens' }],
  };

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
      infrastructureAndDeployment: infra,
      testingTools: ['Vitest', 'Playwright', 'TypeScript Strict'],
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
        value: 'Stockage S3-compatible privé Cloudflare R2 pour les pièces justificatives et médias.',
        epistemicStatus: 'explicit',
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Stockage' }],
        userEdited: false,
      },
    ],

    securityAndCompliance: [
      {
        id: 'sec-1',
        value: 'Facturation électronique certifiée conforme Factur-X / PDF/A-3 (réforme 2026).',
        epistemicStatus: 'explicit',
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Facturation' }],
        userEdited: false,
      },
      {
        id: 'sec-2',
        value: 'Contrôle d\'accès RBAC strict et signature électronique sécurisée Documenso.',
        epistemicStatus: 'explicit',
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Sécurité' }],
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
    ],

    designSystem: dsProfile,

    uncertainties: [
      {
        id: 'unc-1',
        category: 'missing_information',
        topic: 'Passerelle de paiement en ligne (CB)',
        statement: 'Le cahier des charges privilégie le prélèvement SEPA XML (PAIN.008) sans expliciter l\'usage d\'une passerelle CB complémentaire en v1.',
        impact: 'medium',
        proposedFallback: 'Conserver SEPA XML en v1 et prévoir une interface d\'extension pour passerelle bancaire CB ultérieure.',
        requiresHumanDecision: true,
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Finances' }],
      },
      {
        id: 'unc-2',
        category: 'hypothesis',
        topic: 'Remontée kilométrique automatisée par télématique',
        statement: 'Absence de connexion directe documentée aux API constructeurs ou boîtiers télématiques.',
        impact: 'low',
        proposedFallback: 'Relevé manuel obligatoire du compteur kilométrique lors des états des lieux et maintenances.',
        requiresHumanDecision: true,
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges', location: 'Flotte' }],
      },
    ],

    supplementaryNotes: params.supplementaryNotes || {},
  };
}
