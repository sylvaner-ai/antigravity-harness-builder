/**
 * Sources du catalogue multi-sources.
 *
 * Les sources sont enregistrées en base (table `catalog_sources`) et gérées depuis l'administration : ajout d'un
 * dépôt GitHub, commit figé, analyse puis activation. Chaque source est figée sur un commit précis : une génération
 * est reproductible et une mise à jour amont ne change jamais silencieusement le harnais produit.
 * `DEFAULT_CATALOG_SOURCES` ne sert qu'à amorcer une base vide.
 */

export type CatalogSourceRole =
  /** Bibliothèque large : fournit la base (règles par langage, sous-agents, skills par stack). */
  | 'BASE_LIBRARY'
  /** Source spécialisée : prioritaire sur la bibliothèque de base pour sa fonction (sécurité, UI). */
  | 'SPECIALIST'
  /** Méthodologie cohérente : ses skills se référencent entre eux et sont retenus ensemble ou pas du tout. */
  | 'METHODOLOGY'
  /** Composants écrits pour ce générateur, ciblant directement Antigravity. */
  | 'CURATED';

export type CatalogSourceCategory = 'CORE' | 'DESIGN' | 'SECURITY' | 'QUALITY';

export interface CatalogSourceConfig {
  id: string;
  name: string;
  owner: string;
  repo: string;
  /** Commit figé (SHA complet). `ref` est conservé pour compatibilité et vaut ce même SHA. */
  pinnedCommit: string;
  ref: string;
  /** Licence SPDX vérifiée dans le fichier LICENSE du commit figé. */
  license: string;
  role: CatalogSourceRole;
  /** Plus la valeur est haute, plus la source l'emporte quand deux composants remplissent la même fonction. */
  priority: number;
  category: CatalogSourceCategory;
  tags: string[];
  /** Mention de copyright du fichier LICENSE (à reproduire, licence MIT). */
  copyrightNotice: string;
  /** Installation native proposée par l'auteur, à mentionner dans la documentation du harnais. */
  nativeInstall?: string;
  enabled: boolean;
}

export const CURATED_SOURCE_ID = 'curated';
export const CURATED_SOURCE_PRIORITY = 100;
export const UNKNOWN_SOURCE_PRIORITY = 50;

export const DEFAULT_CATALOG_SOURCES: CatalogSourceConfig[] = [
  {
    id: 'ecc-official',
    name: 'Everything Claude Code (ECC)',
    owner: 'affaan-m',
    repo: 'ECC',
    pinnedCommit: 'b38be6a7f6350964d59328b52f0624e1d1d552d1',
    ref: 'b38be6a7f6350964d59328b52f0624e1d1d552d1',
    license: 'MIT',
    copyrightNotice: 'Copyright (c) 2026 Affaan Mustafa',
    role: 'BASE_LIBRARY',
    priority: 50,
    category: 'CORE',
    tags: ['core', 'rules', 'skills', 'agents'],
    nativeInstall: 'npx ecc-universal@2.2.3 install --profile minimal --target antigravity',
    enabled: true,
  },
  {
    id: 'emil-kowalski-skills',
    name: 'Emil Kowalski — Design Engineering',
    owner: 'emilkowalski',
    repo: 'skills',
    pinnedCommit: 'f1090bec277140d02ed202440185ad9d02ac1490',
    ref: 'f1090bec277140d02ed202440185ad9d02ac1490',
    license: 'MIT',
    copyrightNotice: 'Copyright (c) 2026 Emil Kowalski',
    role: 'SPECIALIST',
    priority: 90,
    category: 'DESIGN',
    tags: ['design-engineering', 'ui-polish', 'animation'],
    enabled: true,
  },
  {
    id: 'obra-superpowers',
    name: 'Superpowers — méthodologie de développement (obra)',
    owner: 'obra',
    repo: 'superpowers',
    pinnedCommit: '2ce8aa15d05bd57213e6f746f953aafb7ded7a8b',
    ref: '2ce8aa15d05bd57213e6f746f953aafb7ded7a8b',
    license: 'MIT',
    copyrightNotice: 'Copyright (c) 2025 Jesse Vincent',
    role: 'METHODOLOGY',
    priority: 80,
    category: 'QUALITY',
    tags: ['sdlc', 'tdd', 'planning', 'debugging', 'code-review', 'subagents'],
    nativeInstall: 'agy plugin install https://github.com/obra/superpowers',
    enabled: true,
  },
  {
    id: 'cloudflare-security-audit',
    name: 'Cloudflare — audit de sécurité du code',
    owner: 'cloudflare',
    repo: 'security-audit-skill',
    pinnedCommit: 'c1c8a8c1471069fb0e188eeaff69b8e8db6564a8',
    ref: 'c1c8a8c1471069fb0e188eeaff69b8e8db6564a8',
    license: 'MIT',
    copyrightNotice: 'Copyright (c) 2025-2026 Cloudflare, Inc.',
    role: 'SPECIALIST',
    priority: 90,
    category: 'SECURITY',
    tags: ['security', 'audit', 'vulnerability', 'owasp'],
    enabled: true,
  },
  {
    id: 'dietrichgebert-ponytail',
    name: 'Ponytail — simplicité et anti-sur-ingénierie (Dietrich Gebert)',
    owner: 'dietrichgebert',
    repo: 'ponytail',
    pinnedCommit: '96608e078b2d5ea607c5c3b8b5a54d1c1fba6846',
    ref: '96608e078b2d5ea607c5c3b8b5a54d1c1fba6846',
    license: 'MIT',
    copyrightNotice: 'Copyright (c) 2026 DietrichGebert',
    role: 'METHODOLOGY',
    priority: 80,
    category: 'QUALITY',
    tags: ['yagni', 'anti-overengineering', 'minimalism', 'review'],
    nativeInstall: 'agy plugin install https://github.com/DietrichGebert/ponytail',
    enabled: true,
  },
];

/** Résultat de l'analyse d'une source avant son activation. */
export interface CatalogSourceAnalysis {
  analyzedAt: string;
  commitSha: string;
  license: string;
  redistributable: boolean;
  copyrightNotice: string;
  counts: Record<'RULE' | 'SKILL' | 'SUBAGENT' | 'COMMAND_CONVERTED', number>;
  /** Composants compatibles, ni bloqués ni en doublon : ceux qui pourront entrer dans un harnais. */
  usable: number;
  /** Parmi les utilisables, ceux qui ont une fonction connue du moteur et peuvent être retenus sans choix manuel. */
  autoSelectable: number;
  blockedUnsafe: string[];
  safetyWarnings: number;
  /** Composants dont le nom est déjà fourni par une autre source active (`kind:slug`). */
  duplicates: string[];
  /** Composants écrits surtout pour les mécanismes de Claude Code (peu transposables dans Antigravity). */
  claudeSpecific: number;
  verdict: 'READY' | 'BLOCKED';
  reasons: string[];
}

/** Source telle que synchronisée dans un catalogue : base de l'attribution et du manifeste. */
export interface SyncedSourceSnapshot {
  id: string;
  name: string;
  owner: string;
  repo: string;
  commitSha: string;
  license: string;
  copyrightNotice: string;
  priority: number;
  componentCount: number;
  error?: string;
}

/** Mention de copyright lue dans le fichier LICENSE (première ligne « Copyright … »). */
export function detectCopyrightNotice(licenseText: string | undefined): string {
  return licenseText?.match(/^\s*(Copyright\s+(?:\(c\)|©)[^\n]+)/im)?.[1]?.trim() ?? '';
}

/** Retrouve la source d'un composant à partir de son URL GitHub (`https://github.com/<owner>/<repo>/…`). */
export function findSourceByUrl(url: string | undefined): CatalogSourceConfig | undefined {
  if (!url) return undefined;
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!m) return undefined;
  const owner = m[1]!.toLowerCase();
  const repo = m[2]!.toLowerCase();
  return DEFAULT_CATALOG_SOURCES.find((s) => s.owner.toLowerCase() === owner && s.repo.toLowerCase() === repo);
}

/**
 * Détection de licence depuis le texte du fichier LICENSE. Retourne `UNKNOWN` plutôt qu'une supposition :
 * un composant sous licence inconnue est signalé et n'est pas redistribué automatiquement.
 */
export function detectLicense(licenseText: string | undefined): string {
  if (!licenseText) return 'UNKNOWN';
  const t = licenseText.slice(0, 4000);
  if (/\bMIT License\b|Permission is hereby granted, free of charge/i.test(t)) return 'MIT';
  if (/Apache License,?\s+Version 2\.0/i.test(t)) return 'Apache-2.0';
  if (/BSD 3-Clause|Redistributions of source code must retain[\s\S]*Neither the name/i.test(t)) return 'BSD-3-Clause';
  if (/BSD 2-Clause/i.test(t)) return 'BSD-2-Clause';
  if (/Mozilla Public License,?\s+(?:Version\s+)?2\.0/i.test(t)) return 'MPL-2.0';
  if (/GNU AFFERO GENERAL PUBLIC LICENSE/i.test(t)) return 'AGPL-3.0';
  if (/GNU GENERAL PUBLIC LICENSE/i.test(t)) return 'GPL';
  if (/Creative Commons Attribution 4\.0|CC BY 4\.0/i.test(t)) return 'CC-BY-4.0';
  if (/This is free and unencumbered software released into the public domain/i.test(t)) return 'Unlicense';
  return 'UNKNOWN';
}

/** Licences permissives autorisant la copie des composants dans un harnais généré, avec attribution. */
export const REDISTRIBUTABLE_LICENSES = new Set(['MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 'CC-BY-4.0', 'Unlicense']);

/** Dépôt de ce générateur : provenance des composants « curated ». */
export const GENERATOR_REPOSITORY_URL = 'https://github.com/sylvaner-ai/antigravity-harness-builder';

export interface ComponentProvenance {
  repositoryUrl: string;
  commitSha: string;
  author: string;
  license: string;
  curated: boolean;
}

/**
 * Provenance réelle d'un composant, déduite de son URL source (`https://github.com/<owner>/<repo>/blob/<sha>/…`).
 * Les composants « curated » sont écrits pour ce générateur : leur URL n'est qu'une source d'inspiration.
 */
export function resolveComponentProvenance(
  comp: { sourceUrl?: string; license?: string; sourceId?: string; sourceAuthor?: string },
  fallback: { repositoryUrl: string; commitSha: string }
): ComponentProvenance {
  if (comp.sourceId === CURATED_SOURCE_ID) {
    return {
      repositoryUrl: GENERATOR_REPOSITORY_URL,
      commitSha: fallback.commitSha,
      author: 'Antigravity Harness Builder (composant curated)',
      license: comp.license ?? 'MIT',
      curated: true,
    };
  }
  const sha = comp.sourceUrl?.match(/\/blob\/([0-9a-f]{40})\//i)?.[1];
  const repoMatch = comp.sourceUrl?.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)/i);
  // Composant indexé par le catalogue en base : l'auteur et le dépôt sont portés par le composant lui-même.
  if (comp.sourceAuthor && repoMatch) {
    return {
      repositoryUrl: `https://github.com/${repoMatch[1]}/${repoMatch[2]}`,
      commitSha: sha ?? fallback.commitSha,
      author: comp.sourceAuthor,
      license: comp.license ?? 'UNKNOWN',
      curated: false,
    };
  }
  const src = findSourceByUrl(comp.sourceUrl);
  if (src) {
    return {
      repositoryUrl: `https://github.com/${src.owner}/${src.repo}`,
      commitSha: sha ?? src.pinnedCommit,
      author: src.copyrightNotice.replace(/^Copyright \(c\) [0-9-]+ /, ''),
      license: comp.license ?? src.license,
      curated: false,
    };
  }
  return { ...fallback, author: 'Inconnu', license: comp.license ?? 'UNKNOWN', curated: false };
}
