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
