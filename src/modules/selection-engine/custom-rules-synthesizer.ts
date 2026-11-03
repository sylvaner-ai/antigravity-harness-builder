import { ProjectProfile } from '../project-profile/schema';
import { inferRecommendedModelEffortPair, serializeAntigravityRule } from '../antigravity-adapter/adapter';
import { renderModelEffortGovernanceRuleBody } from '../package-exporter/governance-template';
import { CustomComponentSpec, SelectedComponent } from './schema';

/**
 * Synthétise de manière déterministe les règles sur mesure du projet (§7 FR-05),
 * incluant obligatoirement et automatiquement la règle système non-excluable
 * `model-effort-governance` (`trigger: always_on`) pour 100 % des harnais générés.
 */
export function synthesizeProjectCustomComponents(params: {
  profile: ProjectProfile;
  selectedList: readonly SelectedComponent[];
  projectFrameworks: readonly string[];
  projectDomainText: string;
  initialCustomComponents?: readonly CustomComponentSpec[];
  userExcludes?: readonly string[];
}): CustomComponentSpec[] {
  const {
    profile,
    selectedList,
    projectFrameworks,
    projectDomainText,
    initialCustomComponents = [],
    userExcludes = [],
  } = params;

  const customComponents: CustomComponentSpec[] = initialCustomComponents.filter(
    (c) => c.slug === 'model-effort-governance' || !userExcludes.includes(c.slug)
  );

  // 0. Règle système obligatoire & automatique : Gouvernance Centralisée du Couple Modèle / Niveau d'Effort
  if (!customComponents.some((c) => c.slug === 'model-effort-governance')) {
    const selectedSubagentEntries = selectedList
      .filter((c) => c.kind === 'SUBAGENT')
      .map((sub) => {
        const isReviewer = sub.slug.includes('reviewer') || sub.slug.includes('audit');
        const fallback = inferRecommendedModelEffortPair({
          slug: sub.slug,
          isIndependentReviewer: isReviewer,
        });
        const recommendedModelTier = sub.recommendedModelTier ?? fallback.recommendedModelTier;
        const recommendedEffort = sub.recommendedEffort ?? fallback.recommendedEffort;
        return {
          slug: sub.slug,
          roleTitle: sub.name,
          recommendedModelTier,
          recommendedEffort,
          qualityCostRecommendation: fallback.qualityCostRecommendation,
        };
      });

    const govRuleBody = renderModelEffortGovernanceRuleBody({
      projectName: profile.projectName,
      targetSurface: profile.targetSurface,
      subagents: selectedSubagentEntries,
    });

    customComponents.unshift({
      slug: 'model-effort-governance',
      name: "Gouvernance Centralisée du Couple Modèle / Niveau d'Effort",
      kind: 'RULE',
      description:
        "Arbitrage coût/performance du couple Modèle / Niveau d'effort pour les tâches longues ou critiques (un seul couple préconisé en cas d'écart net) ; aucune intervention sur les tâches courtes.",
      gapReason:
        "Gouvernance système automatique d'Antigravity centralisant le couple Modèle / Effort hors du frontmatter YAML des sous-agents pour un ratio coût/performance optimal.",
      content: serializeAntigravityRule(
        {
          trigger: 'always_on',
          description:
            "Arbitrage coût/performance du couple Modèle / Niveau d'effort pour les tâches longues ou critiques ; aucune intervention sur les tâches courtes.",
        },
        govRuleBody
      ),
    });
  }

  // 1. Règle de Design System spécifique au projet
  const ds = profile.designSystem;
  const hasDesignTokens = Boolean(
    ds &&
      (ds.brandIdentity ||
        Object.keys(ds.colorTokens ?? {}).length > 0 ||
        Object.keys(ds.typography?.fontFamilies ?? {}).length > 0 ||
        (ds.uxAndAccessibilityRules ?? []).length > 0)
  );
  const existingDesignRule = selectedList.find(
    (c) => c.slug.includes('design') || c.slug.includes('tokens')
  );

  if (
    hasDesignTokens &&
    !existingDesignRule &&
    !userExcludes.includes('project-design-system-tokens')
  ) {
    const colors = ds?.colorTokens ?? {};
    const fontFamilies = ds?.typography?.fontFamilies ?? {};
    const primaryColor = colors['primary'] ?? colors['brand-primary'] ?? 'Non spécifiée';
    const secondaryColor = colors['secondary'] ?? colors['brand-secondary'] ?? 'Non spécifiée';
    const fontSans = fontFamilies['sans'] ?? fontFamilies['body'] ?? 'Inter, system-ui, sans-serif';

    customComponents.push({
      slug: 'project-design-system-tokens',
      name: 'Règles et Tokens du Design System Projet',
      kind: 'RULE',
      description:
        'Directives strictes pour l application des tokens, polices et couleurs spécifiques au projet.',
      gapReason:
        'Le catalogue ECC ne fournit que des règles CSS génériques sans les tokens ni la charte graphique de ce projet.',
      content: `---
trigger: glob
globs: "**/*.{tsx,jsx,css,scss,html,vue}"
description: Respect strict des tokens et de l'identité visuelle du projet
---
# Directives du Design System Projet

- Identité : ${ds?.brandIdentity ?? profile.projectName}
- Palette primaire : ${primaryColor}
- Palette secondaire : ${secondaryColor}
- Typographie Sans : ${fontSans}
- Règles UX & Accessibilité :
${(ds?.uxAndAccessibilityRules ?? []).map((p: string) => `  * ${p}`).join('\n') || '  * Interface claire, cohérente et accessible (WCAG 2.1 AA)'}
`,
    });
  }

  // 2. Règle sur mesure pour les contraintes de sécurité ou conformité spécifiques
  const securityConstraints = profile.securityAndCompliance ?? [];
  if (securityConstraints.length > 0) {
    const hasSecurityRule = selectedList.find(
      (c) => c.family === 'security' || c.slug.includes('security')
    );
    if (!hasSecurityRule && !userExcludes.includes('project-security-compliance-guard')) {
      customComponents.push({
        slug: 'project-security-compliance-guard',
        name: 'Garde-fous de Sécurité et Conformité Projet',
        kind: 'RULE',
        description:
          'Règles strictes appliquant les exigences de conformité et de sécurité du projet.',
        gapReason:
          'Exigences de sécurité spécifiques au domaine métier non couvertes par les règles standard ECC.',
        content: `---
trigger: always_on
description: Garde-fous impératifs de sécurité et conformité du projet
---
# Exigences de Sécurité & Conformité Métier

${securityConstraints.map((sc, i) => `## ${i + 1}. ${sc.value}\n- Source : ${sc.epistemicStatus}\n- Justification : ${sc.rationale ?? 'Exigence documentaire'}`).join('\n\n')}
`,
      });
    }
  }

  // 3. Règle sur mesure Drizzle ORM si présent dans la stack
  const hasDrizzle =
    (profile.techStack?.ormAndDataLayer ?? []).some((o) => /drizzle/i.test(o)) ||
    projectFrameworks.some((f) => /drizzle/i.test(f)) ||
    projectDomainText.includes('drizzle');
  const existingDrizzleRule = selectedList.find((c) => c.slug.includes('drizzle'));

  if (
    hasDrizzle &&
    !existingDrizzleRule &&
    !userExcludes.includes('project-drizzle-orm-guidelines')
  ) {
    customComponents.push({
      slug: 'project-drizzle-orm-guidelines',
      name: 'Directives et Bonnes Pratiques Drizzle ORM',
      kind: 'RULE',
      description:
        'Directives pour Drizzle ORM : typage strict des tables, requêtes relationnelles et migrations atomiques.',
      gapReason:
        'Le catalogue standard ne fournit pas de règle dédiée aux conventions de schéma et migrations Drizzle ORM.',
      content: `---
trigger: glob
globs: "**/db/**/*.{ts,js}, **/schema/**/*.{ts,js}, **/migrations/**/*.{ts,js}, src/db/**"
description: Bonnes pratiques Drizzle ORM, transactions et migrations atomiques
---
# Bonnes Pratiques Drizzle ORM & Intégrité des Données

## 1. Définition et Typage Strict du Schéma
- Définir toutes les tables dans \`src/db/schema.ts\` avec les types stricts PostgreSQL/SQLite.
- Exporter les types d'inférence TypeScript (\`$inferSelect\`, \`$inferInsert\`) et validateurs Zod.
- Déclarer explicitement les clés étrangères avec suppression en cascade sécurisée (\`onDelete: 'cascade'\` ou \`'restrict'\`).

## 2. Transactions & Requêtes Préparées
- Encapsuler toute suite d'écritures dépendantes dans \`await db.transaction(async (tx) => { ... })\`.
- Utiliser l'API relationnelle typée \`db.query.<table_name>.findMany(...)\` pour prévenir les jointures N+1.
- Ne jamais exposer l'instance \`db\` directement au client (routes serveur et Server Components uniquement).

## 3. Gestion des Migrations
- Générer les migrations SQL via \`drizzle-kit generate\` et ne jamais altérer manuellement les fichiers appliqués.
- Exécuter les migrations de façon idempotente au démarrage ou via un script dédié.
`,
    });
  }

  // 4. Règle sur mesure de Gestion d'État Client (TanStack Query / Zustand)
  const hasStateMgmt =
    (profile.techStack?.stateManagement ?? []).length > 0 ||
    projectDomainText.includes('zustand') ||
    projectDomainText.includes('tanstack');
  const existingStateRule = selectedList.find(
    (c) => c.slug.includes('state') || c.slug.includes('query')
  );

  if (
    hasStateMgmt &&
    !existingStateRule &&
    !userExcludes.includes('project-state-management-patterns')
  ) {
    customComponents.push({
      slug: 'project-state-management-patterns',
      name: 'Conventions de Gestion d État (TanStack Query & Zustand)',
      kind: 'RULE',
      description:
        'Séparation état serveur vs état UI, invalidation de cache et mutations optimistes.',
      gapReason:
        'Absence de directives précises dans le catalogue ECC pour l architecture conjointe TanStack Query et Zustand.',
      content: `---
trigger: glob
globs: "**/*.{tsx,jsx,ts,js}"
description: Gestion d'état fluide, cache asynchrone TanStack Query et stores Zustand
---
# Conventions de Gestion d'État Côté Client

## 1. Séparation État Serveur vs État UI
- **État Serveur (Remote) :** Géré exclusivement par TanStack Query (\`useQuery\`, \`useMutation\`).
- **État UI Global :** Géré par des stores Zustand atomiques sans surcharge Redux.
- **État Local :** Géré par \`useState\` ou \`useReducer\` pour les états transitoires de composants.

## 2. Invalidation de Cache & Feedback Optimiste
- Définir un \`staleTime\` adapté (ex: 30s à 60s) pour éviter les refetches intempestifs.
- Après chaque mutation réussie, invalider immédiatement les clés correspondantes (\`queryClient.invalidateQueries\`).
- Privilégier les mutations optimistes avec rollback automatique en cas d'échec réseau.
`,
    });
  }

  // 5. Règle Factur-X & Réforme Facturation Électronique 2026/2027
  const hasFacturX =
    projectDomainText.includes('factur') ||
    projectDomainText.includes('invoice') ||
    projectDomainText.includes('pdf-lib') ||
    projectDomainText.includes('felicicar');

  if (hasFacturX && !userExcludes.includes('project-facturx-einvoicing-guard')) {
    customComponents.push({
      slug: 'project-facturx-einvoicing-guard',
      name: 'Directives Factur-X, PDF/A-3 & Réforme Facturation 2026/2027',
      kind: 'RULE',
      description:
        'Conformité Factur-X (EN 16931), intégrité PDF/A-3, numérotation séquentielle sans trou et compatibilité PDP/PPF.',
      gapReason:
        'Exigences légales françaises de facturation électronique non couvertes par le catalogue générique ECC.',
      content: `---
trigger: glob
globs: "**/billing/**/*.{ts,js}, **/invoices/**/*.{ts,js}, **/facturx/**/*.{ts,js}, src/**/billing/**"
description: Conformité Factur-X (EN 16931), intégrité PDF/A-3 et transmission plateforme agréée (PDP/PPF)
---
# Directives Factur-X & Réforme Facturation Électronique (2026/2027)

## 1. Structure Mixte Factur-X (PDF/A-3 + XML CII)
- Toute facture générée doit être un document hybride PDF/A-3 conforme à la norme franco-allemande Factur-X (profil EN 16931).
- Le flux XML \`factur-x.xml\` doit être validé syntaxiquement contre les schémas UN/CEFACT CII avant incorporation dans les métadonnées PDF.
- L'archivage doit garantir la valeur probante et l'inaltérabilité pendant 10 ans (Code de commerce, art. L123-22).

## 2. Numérotation Continue & Séquence Inaltérable
- La numérotation doit être rigoureusement chronologique et continue, sans rupture ni trou de numérotation (CGI, art. 242 nonies A).
- Utiliser une séquence atomique PostgreSQL (\`invoice_sequence\`) pour prévenir les collisions et pertes de séquence en concurrence.

## 3. Anticipation de la Réforme (PDP / PPF & e-reporting)
- Réception obligatoire via une Plateforme de Dématérialisation Partenaire (PDP) ou le Portail Public de Facturation (PPF) depuis le 1er septembre 2026.
- Prévoir une couche d'abstraction (connecteur PDP/PPF) pour émettre les flux et statuts du cycle de vie sans dépendre d'un simple envoi d'email Resend.
`,
    });
  }

  // 6. Règle SEPA ISO 20022 & Rapprochement Bancaire
  const hasSepa =
    projectDomainText.includes('sepa') ||
    projectDomainText.includes('prélèvement') ||
    projectDomainText.includes('pain.008') ||
    projectDomainText.includes('felicicar');

  if (hasSepa && !userExcludes.includes('project-sepa-iso20022-guard')) {
    customComponents.push({
      slug: 'project-sepa-iso20022-guard',
      name: 'Directives SEPA ISO 20022 (pain.008.001.08) & Rapprochement Bancaire',
      kind: 'RULE',
      description:
        'Standard SEPA actuel ISO 20022 pain.008.001.08, contrôle modulo 97 arithmétique et réconciliation des rejets pain.002.',
      gapReason:
        'Spécifications bancaires européennes SEPA et réconciliation des impayés non prises en charge par ECC.',
      content: `---
trigger: glob
globs: "**/sepa/**/*.{ts,js}, **/banking/**/*.{ts,js}, **/payments/**/*.{ts,js}, src/**/sepa/**"
description: Prélèvements SEPA ISO 20022 (pain.008.001.08), contrôle checksum modulo 97 et réconciliation des impayés
---
# Directives Prélèvements SEPA ISO 20022 & Rapprochement Bancaire

## 1. Version Normative ISO 20022 (pain.008.001.08)
- Utiliser impérativement la version actuelle \`pain.008.001.08\` (règlement EPC ISO 20022 release 2019) pour la génération des lots de prélèvement.
- L'ancienne version \`pain.008.001.02\` est obsolète et refusée par la majorité des établissements bancaires.

## 2. Validation de Contrôle Arithmétique Modulo 97 (ISO 7064)
- Valider tout IBAN et compte bancaire via l'algorithme standard de somme de contrôle Modulo 97 (ISO 7064 MOD 97-10).
- Rejeter immédiatement les coordonnées bancaires malformées avant tout enregistrement en base.

## 3. Rapprochement et Traitement des Rejets (pain.002 / camt.054)
- Intégrer la consommation des fichiers de retour bancaire :
  * \`pain.002\` : rejets techniques ou de solde (R-transactions).
  * \`camt.054\` : avis d'opérations et écritures effectives.
- Mettre à jour automatiquement le statut des factures vers \`IMPAYEE\` et alerter le pôle financier dès détection d'un rejet.
`,
    });
  }

  // 7. Règle Sécurisation Documenso & Webhooks
  const hasDocumenso =
    projectDomainText.includes('documenso') ||
    projectDomainText.includes('signature') ||
    projectDomainText.includes('contrat');

  if (hasDocumenso && !userExcludes.includes('project-documenso-signing-guard')) {
    customComponents.push({
      slug: 'project-documenso-signing-guard',
      name: 'Directives Sécurité Documenso & Authentification Webhooks',
      kind: 'RULE',
      description:
        'Vérification cryptographique HMAC des webhooks Documenso et machine à états stricte pour les contrats.',
      gapReason:
        'Gestion sécurisée du cycle de vie des signatures électroniques contractuelles non couverte par ECC.',
      content: `---
trigger: glob
globs: "**/documenso/**/*.{ts,js}, **/contracts/**/*.{ts,js}, **/webhooks/**/*.{ts,js}"
description: Validation HMAC des webhooks Documenso et transition d'état sécurisée des contrats
---
# Directives Documenso & Signature Électronique

## 1. Authentification Cryptographique des Webhooks (HMAC)
- Valider systématiquement l'en-tête de signature HMAC (ex: \`x-documenso-signature\`) avec le secret d'API partagé.
- Rejeter tout webhook sans signature valide avec un code HTTP 401/403 et consigner la tentative dans le journal d'audit.

## 2. Machine à États Stricte des Contrats
- Les transitions d'état doivent être atomiques et unidirectionnelles :
  \`BROUILLON\` -> \`EN_ATTENTE_SIGNATURE\` -> \`SIGNE\` (ou \`REFUSE\` / \`ANNULE\`).
- Ne jamais marquer un contrat comme signé sans confirmation signée du webhook validé.
`,
    });
  }

  // 8. Règle Stockage Objet S3 / Cloudflare R2
  const hasR2 =
    projectDomainText.includes('r2') ||
    projectDomainText.includes('s3') ||
    projectDomainText.includes('cloudflare');

  if (hasR2 && !userExcludes.includes('project-storage-r2-guard')) {
    customComponents.push({
      slug: 'project-storage-r2-guard',
      name: 'Directives Stockage Objet S3 / Cloudflare R2',
      kind: 'RULE',
      description:
        'Isolation privée, URLs pré-signées temporaires à TTL court et zéro accès public direct.',
      gapReason:
        'Sécurisation des uploads et téléchargements de pièces justificatives sensibles.',
      content: `---
trigger: glob
globs: "**/storage/**/*.{ts,js}, **/uploads/**/*.{ts,js}, src/**/storage/**"
description: Stockage objet S3/R2 sécurisé, URLs pré-signées temporaires et zéro bucket public
---
# Directives Stockage Objet Privé Cloudflare R2 / S3

## 1. Accès Privé et URLs Pré-signées
- Tous les buckets de stockage doivent être strictement privés sans accès anonyme ou public direct.
- Utiliser exclusivement des URLs pré-signées temporaires avec un TTL strict (maximum 15 minutes) pour l'upload et le téléchargement.

## 2. Validation Stricte des Fichiers Téléversés
- Vérifier le type MIME réel (Magic Bytes) et la taille maximale autorisée avant d'émettre une URL d'upload.
- Assigner un UUID aléatoire au stockage pour empêcher tout écrasement ou attaque par force brute sur les noms de fichiers.
`,
    });
  }

  return customComponents;
}
