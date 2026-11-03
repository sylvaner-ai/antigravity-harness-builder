# Catalogue multi-sources et sélection par fonctions

## Sources et priorités

Le registre `src/modules/ecc-catalog/catalog-sources.ts` déclare chaque bibliothèque, figée sur un commit précis.

| Source | Rôle | Priorité |
| :--- | :--- | :--- |
| Composants `curated` (écrits pour ce générateur) | CURATED | 100 |
| cloudflare/security-audit-skill | SPECIALIST (sécurité) | 90 |
| emilkowalski/skills | SPECIALIST (interface) | 90 |
| obra/superpowers | METHODOLOGY | 80 |
| dietrichgebert/ponytail | METHODOLOGY | 80 |
| affaan-m/ECC | BASE_LIBRARY | 50 |

Monter de version : modifier `pinnedCommit` (et `ref`), ou définir `CATALOG_REF_<ID>` (ex. `CATALOG_REF_OBRA_SUPERPOWERS`), puis relancer la synchronisation. Vérifier ensuite le banc de sélection.

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
