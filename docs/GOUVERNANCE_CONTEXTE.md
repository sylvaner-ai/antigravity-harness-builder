# Contexte permanent, modèle/effort et délégation (Lot 3)

## Contexte permanent

Les règles `trigger: always_on` sont relues à chaque requête. `enforceAlwaysOnBudget` (`src/modules/harness-builder/context-budget.ts`) les plafonne par preset :

| Preset | Plafond des règles `always_on` (hors AGENTS.md) |
| :--- | :--- |
| MINIMAL | 6 000 octets |
| BALANCED | 8 000 octets |
| THOROUGH | 10 000 octets |

- Sont toujours conservées : `model-effort-governance` et les règles écrites pour le projet (`project_custom`).
- Les autres sont gardées dans l'ordre sécurité, tests, git/revue, puis le reste, par taille croissante.
- Les règles en excès ne sont pas supprimées : elles passent en `model_decision`, avec une description générée, et sont chargées quand la tâche les concerne.

Mesure sur deux cahiers des charges de test (catalogue réel figé) : 19 Ko → 7 Ko (BALANCED), 24 Ko → 8 Ko (THOROUGH).

## Règle modèle/effort

La règle fait environ 2,5 Ko. Elle ne demande rien pour une tâche courte, compare une seule fois le réglage actif au couple conseillé pour une tâche longue, et s'arrête uniquement pour une tâche critique irréversible (T4). Si le réglage actif n'est pas visible, l'agent ne le devine pas. Le couple par sous-agent est publié dans `docs/ORCHESTRATION.md`.

Aucun champ `model` n'est écrit dans le YAML des sous-agents : le comportement de ce champ dans l'IDE n'est pas vérifié.

## Règles chargées à la demande (option C)

`AGENTS.md`, toujours lu, contient la section « Règles à lire avant certaines tâches », qui liste chaque règle non `always_on` avec son chemin, son sujet et la consigne de l'ouvrir avant la tâche concernée.

- Les règles ne sont pas recopiées dans `AGENTS.md` : cela recréerait le volume de contexte permanent que le plafond évite. Seul un pointeur est ajouté (environ 150 octets par règle).
- Au-delà de 3 500 octets de pointeurs, la liste devient compacte (noms de fichiers seulement) ; `AGENTS.md` reste sous 24 000 octets (tests unitaires et tests sur catalogue réel).
- Mesure (banc d'essai, `gemini-3.8-flash-medium`) : les règles `model_decision` se déclenchent sans le pointeur (15 essais sur 15). Le pointeur est donc une garantie à faible coût, dont le gain n'est pas démontré.

## Règles liées à des fichiers : `glob` converti en `model_decision`

Le déclenchement `glob` n'est pas fiable : 4 essais sur 14 réussis (Flash et Opus), dont 0 sur 6 dans la dernière mesure, alors que la même règle exprimée en `model_decision` réussit 6 essais sur 6 dans le même lot (voir `docs/AUTO_TEST_RESULTATS.md`).

Le générateur convertit donc toute règle `glob` (catalogue ou règle du projet) en `model_decision` : le champ `globs` est retiré et la description devient « À consulter lorsque la tâche concerne des fichiers `<motifs>` — `<sujet d'origine>` » (motifs limités à 100 caractères, sujet à 140). La règle est annoncée dans `AGENTS.md` comme les autres règles à la demande, et ne compte pas dans le plafond du contexte permanent.

Limites de la mesure : un seul modèle pour la comparaison (Flash), une règle de sonde dont les motifs désignent un fichier unique, et non des motifs de langage comme `**/*.tsx`. La conversion de règles réelles reste à mesurer.

## Sous-agents

- Les injonctions amont « MUST BE USED » et « PROACTIVELY » sont retirées des descriptions (`normalizeDelegationDescription`) ; la délégation est réservée aux sous-tâches indépendantes, bornées et volumineuses.
- Les agents de revue et d'audit n'ont pas d'outil d'écriture (`write_to_file`, `replace_file_content`). Ils gardent `run_command` pour lire un diff : cet outil peut techniquement écrire, la lecture seule n'est donc pas garantie par la plateforme.

## Commandes slash

Liste issue de la documentation officielle (https://antigravity.google/docs/slash-commands/, consultée le 3 novembre 2026) : `/plan`, `/goal`, `/teamwork`, `/boost`, `/grill-me`, `/learn`. `/compact` n'y figure pas, mais elle existe dans la version testée (auto-test T8) ; son effet n'étant pas documenté, elle n'est pas recommandée. `/effort` et `/agents` y sont nommées sans description et ne sont pas recommandées.

## Workflows

La page officielle « workflows to skills » (https://antigravity.google/docs/migration/workflows-to-skills/) annonce que les répertoires `.agents/workflows/` ne seront plus indexés ni exécutables à partir du 19 octobre 2026. **L'auto-test du 3 novembre 2026 (T9) montre qu'un workflow s'exécute encore dans la version testée.** Le harnais ne génère que des skills (`/<nom>` les appelle), qui fonctionnent dans les deux cas. La cible `--target antigravity` d'ECC, qui convertit des commandes en workflows, ne doit pas être utilisée telle quelle.
