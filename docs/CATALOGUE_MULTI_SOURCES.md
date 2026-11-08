# Catalogue multi-sources et sélection par fonctions

## Sources et priorités

Les sources sont enregistrées en base (table `catalog_sources`) et gérées depuis la page **Catalogue** (`/admin/catalog`). Chacune est figée sur un commit précis. Une base vide est amorcée avec les sources de référence ci-dessous (`DEFAULT_CATALOG_SOURCES`).

| Source | Rôle | Priorité |
| :--- | :--- | :--- |
| Composants `curated` (écrits pour ce générateur) | CURATED | 100 |
| cloudflare/security-audit-skill | SPECIALIST (sécurité) | 90 |
| emilkowalski/skills | SPECIALIST (interface) | 90 |
| obra/superpowers | METHODOLOGY | 80 |
| dietrichgebert/ponytail | METHODOLOGY | 80 |
| affaan-m/ECC | BASE_LIBRARY | 50 |

Cycle de vie d'une source :

1. **Ajout** d'un dépôt GitHub : le commit est résolu et figé, la source est « en attente » et analysée aussitôt.
2. **Analyse** : licence (refus si non permissive), composants détectables, composants retenables automatiquement (fonction connue du moteur), noms déjà fournis par une autre source, contenus bloqués pour sûreté, composants propres à Claude Code.
3. **Activation**, possible seulement si l'analyse sur le commit figé est favorable.
4. **Reconstruction du catalogue** : les sources actives sont téléchargées et indexées ; le catalogue en service ne change qu'en cas de succès. L'échec d'une source complémentaire est consigné sans bloquer la reconstruction ; celui d'une bibliothèque de base l'annule.

Monter de version : « Changer de commit » sur la source, qui repasse en attente et est réanalysée ; la réactiver puis reconstruire le catalogue. Vérifier ensuite le banc de sélection.

Les composants d'une nouvelle source n'ont une fonction (slot) que si leur nom correspond aux conventions connues du moteur ; les autres restent sélectionnables à la main.

## Construction du catalogue

`catalog-builder.ts` (fonction pure, sans réseau) :

1. Indexe chaque dépôt (règles, skills et leurs fichiers de référence, sous-agents).
2. Détecte la licence réelle du fichier LICENSE ; une licence non permissive rend les composants inutilisables.
3. Rattache chaque composant ECC à son module (`manifests/install-modules.json`).
4. Compte les références propres à Claude Code sur le contenu brut.
5. Contrôle la sûreté : blocage sur texte dissimulé (contrôle bidirectionnel, « tags » Unicode, nombreux caractères de largeur nulle), commentaire HTML caché adressé à l'agent, exfiltration de secrets ; simple avertissement pour un script distant exécuté (`curl … | sh`). Les citations défensives (« ignore previous instructions ») ne sont pas bloquées.
6. Réécrit les références `superpowers:<skill>` en noms de skills Antigravity.

## Sélection

`component-classifier.ts` attribue à chaque composant :

- un **slot** (une fonction, ex. `skill:workflow:tdd`, `agent:security`, `rule:stack:python:testing`) ;
- un **palier** : `core` (MINIMAL), `standard` (BALANCED), `extended` (THOROUGH) ;
- des **conditions** : technologie, interface, base de données, backend, tests de bout en bout, infrastructure, domaine métier, pack d'excellence ;
- ou une **exclusion** motivée (outillage de Claude Code ou d'ECC, module ECC hors développement logiciel).

Le moteur retient un composant par slot : source prioritaire, puis composant le plus spécifique (framework > langage > générique), puis score. Les méthodologies superpowers et ponytail sont retenues comme des ensembles (option `methodologies`, ponytail hors du preset MINIMAL par défaut). Un composant sans slot n'est jamais retenu automatiquement, mais reste sélectionnable manuellement.

Ajouter un composant à la sélection automatique : lui donner une entrée dans les tables de `component-classifier.ts` (slot, palier, conditions) et ajouter un cas dans `tests/multi-source-slots.test.ts`.

Les catalogues ad hoc (composants non indexés par le constructeur, sans `parsedMeta.sourceId`) conservent l'ancien comportement : seuil de score et quotas par type.

## Traçabilité dans le harnais

Chaque reconstruction du catalogue enregistre les sources réellement intégrées (table `catalog_syncs`, colonne `sources` : dépôt, commit, licence, mention de copyright, nombre de composants). Le harnais généré en rend compte :

- `docs/HARNESS_MANIFEST.json` (format 2.0.0) : bloc `catalog` avec l'étiquette de version et, pour chaque source, son dépôt, son commit, sa licence, son auteur et le nombre de composants retenus ;
- `docs/SOURCES.md` (ancien `ECC_SOURCES.md`) : tableau des sources, puis provenance de chaque composant (`source_verbatim`, `source_adapted`, `project_custom`) et attributions de licence.

Un manifeste 1.0.0 (référence ECC unique) reste lisible : `parseHarnessManifest` le convertit au format 2.0.0. Lors d'une mise à niveau, l'ancien `docs/ECC_SOURCES.md` figure dans l'inventaire de la génération précédente : le plan le retire au profit de `docs/SOURCES.md`.

## Pourquoi une source n'apporte aucun composant

L'étape **Composition** affiche la contribution de chaque source : composants au catalogue, composants retenus, motifs d'écart (avec un exemple). Causes possibles :

1. **Source absente du catalogue en service** : elle est active dans le registre mais la dernière reconstruction ne l'a pas intégrée (catalogue antérieur à son activation, ou échec de téléchargement). C'était le cas en production jusqu'au 7 novembre 2026 : le catalogue (`affaan-m/ECC@b38be6a`) ne contenait qu'ECC, l'ancienne synchronisation ignorant en silence l'échec des sources complémentaires. Depuis, les échecs sont consignés et signalés sur les pages Catalogue et Composition.
2. **Méthodologie non activée** : Ponytail n'est pas activé en preset MINIMAL.
3. **Palier hors preset**, **pile technique différente**, **fonction déjà couverte** par un composant de priorité supérieure, ou **aucune fonction connue du moteur** (sélection manuelle possible).

Sur le catalogue figé des tests, Superpowers (13 skills) et Cloudflare (1 skill) sont retenus dans tous les presets, Ponytail (4 skills) en BALANCED et THOROUGH.
