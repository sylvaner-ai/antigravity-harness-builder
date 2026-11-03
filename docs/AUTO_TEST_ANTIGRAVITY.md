# Auto-test Antigravity

Le harnais généré suppose plusieurs comportements d'Antigravity qui n'ont pas été constatés : chargement des règles de chaque type, des skills, des sous-agents de `.agents/agents/`, effet du champ `model`, visibilité du modèle actif, commandes slash. Le pack d'auto-test vérifie ces points sur la version réellement utilisée.

## Principe

Huit petits fichiers de sonde (`selftest-*`) contiennent chacun un jeton secret de la forme `XXXX-OK-<série>`. Si la réponse de l'agent contient le jeton, le fichier a été chargé. Onze tests (T1 à T11) sont proposés, avec pour chacun l'invite à copier, le résultat attendu et la conséquence pour le générateur si le résultat est différent.

| Test | Vérifie |
| :--- | :--- |
| T1 | Règle `always_on` |
| T2 | Règle `glob` |
| T3 | Règle `model_decision` |
| T4 | Skill découvert, appelable par `/nom` |
| T5 | Sous-agent chargé depuis `.agents/agents/` |
| T6 | Champ `model: flash` (facultatif, risqué) |
| T7 | Visibilité du modèle et de l'effort actifs |
| T8 | `/grill-me` et `/learn` existent, `/compact` non |
| T9 | Workflow hérité non exécuté (facultatif) |
| T10, T11 | Règle modèle/effort sur tâche courte puis longue (harnais installé) |

## Utilisation

1. Obtenir le script et le guide d'une même série, avec le même jeton :
   - par l'application : `GET /api/selftest?file=script&nonce=ABC123` et `GET /api/selftest?file=guide&nonce=ABC123` (connexion requise) ;
   - ou en ligne de commande : `npx tsx scripts/selftest-pack.mts <dossier-de-sortie> [jeton]`.
2. Dans un projet de test : `bash selftest.sh install`, puis suivre le guide dans une nouvelle conversation Antigravity.
3. Renvoyer la grille de résultats remplie, puis `bash selftest.sh remove`.

Le guide contient les jetons attendus : ne pas le placer dans le projet testé.

## Garanties du script

- Il ne crée, liste et supprime que les chemins `selftest-*` (liste blanche vérifiée à chaque opération, y compris pour les entrées d'un manifeste altéré).
- Il ne modifie aucun autre fichier ; `remove` ne laisse aucun résidu et conserve les fichiers existants.
- Il est couvert par `tests/selftest-pack.test.ts` (installation, idempotence, suppression, manifeste altéré).

## Limites

- Un agent peut lire un fichier du dépôt au lieu de le « tenir en contexte » : les invites demandent de ne rien ouvrir et le guide indique de noter « ? » si la trajectoire montre une lecture.
- T6 écrit un champ `model` non vérifié dans un sous-agent : un champ non reconnu peut bloquer l'IDE (`bash selftest.sh remove` rétablit la situation).
- Les résultats valent pour la version d'Antigravity utilisée ; à refaire après une mise à jour majeure.

Pour répéter ces sondes automatiquement avec `agy -p` et mesurer leur stabilité, voir `docs/BANC_ESSAI_ANTIGRAVITY.md`.
