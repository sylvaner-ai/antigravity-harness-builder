# Tests de sélection sur le catalogue réel figé (Lot 4)

`tests/selection-real-catalog.test.ts` vérifie la sélection sur les cinq bibliothèques réelles aux commits figés, **sans réseau**.

## Contenu

| Élément | Rôle |
| :--- | :--- |
| `tests/fixtures/catalog/pinned-catalog.json.gz` | Catalogue construit (635 composants). Contenu intégral pour les 143 composants sélectionnés dans les cas de test ; métadonnées seules pour les autres. |
| `tests/fixtures/projects/` | Quatre projets types : SEPA (TypeScript, React, PostgreSQL), Python (FastAPI), Java (Spring Boot, MySQL, MyBatis), Go (sans interface). |
| `tests/fixtures/golden/<projet>-<preset>.json` | Sélection attendue (12 fichiers), relue à chaque exécution. |
| `tests/support/catalog-fixture.ts` | Chargement de la fixture, extraction du profil, résumé de sélection. |
| `scripts/build-selection-fixtures.mts` | Régénération de la fixture et des sélections attendues. |

## Ce qui est contrôlé

- La fixture correspond aux commits figés de `catalog-sources.ts`.
- Sélection identique à la référence, pour 4 projets × 3 presets.
- Propriétés : un seul composant par fonction, aucun composant propre à Claude Code, composants de langage compatibles avec le projet, presets emboîtés, méthodologies et audit de sécurité présents selon le preset, résultat indépendant de l'ordre du catalogue.
- Pertinence par projet : par exemple, pas d'agent PostgreSQL ni de JPA pour un projet MySQL/MyBatis, pas de composant d'interface pour un projet sans interface.
- Harnais complet : paquet valide, `AGENTS.md` sous 24 000 octets, contexte permanent dans le budget, skills livrés avec leur `SKILL.md`, agents de revue sans écriture, attribution de chaque dépôt contributeur.

## Quand régénérer

Après un changement volontaire du moteur, du classifieur, de l'extracteur ou d'un commit figé :

```bash
CATALOG_TARBALLS=<dossier> CATALOG_SRCS=<dossier> npm run fixtures:selection
```

- `CATALOG_TARBALLS` contient `affaan-m_ECC.tar.gz`, `emilkowalski_skills.tar.gz`, `obra_superpowers.tar.gz`, `cloudflare_security-audit-skill.tar.gz` et `dietrichgebert_ponytail.tar.gz` (archives GitHub des commits figés).
- `CATALOG_SRCS` (facultatif) contient les clones git correspondants ; le script refuse une archive dont le clone n'est pas au commit figé.
- Relire ensuite le diff de `tests/fixtures/golden/` : chaque ligne ajoutée ou retirée est un changement de comportement à valider.

Le script ne peut pas être exécuté sans ces archives (elles pèsent environ 48 Mo et ne sont pas versionnées).

## Limites

- Les projets types sont décrits par des cahiers des charges courts : ils valident la logique de sélection, pas la qualité d'un cahier réel.
- Les sélections attendues figent le comportement actuel ; elles ne prouvent pas que chaque composant retenu est le meilleur possible.
- La fixture pèse environ 1,9 Mo ; chaque régénération l'ajoute à l'historique Git.
