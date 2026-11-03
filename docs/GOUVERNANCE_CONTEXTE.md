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

## Sous-agents

- Les injonctions amont « MUST BE USED » et « PROACTIVELY » sont retirées des descriptions (`normalizeDelegationDescription`) ; la délégation est réservée aux sous-tâches indépendantes, bornées et volumineuses.
- Les agents de revue et d'audit n'ont pas d'outil d'écriture (`write_to_file`, `replace_file_content`). Ils gardent `run_command` pour lire un diff : cet outil peut techniquement écrire, la lecture seule n'est donc pas garantie par la plateforme.

## Commandes slash

Liste issue de la documentation officielle (https://antigravity.google/docs/slash-commands/, consultée le 3 novembre 2026) : `/plan`, `/goal`, `/teamwork`, `/boost`, `/grill-me`, `/learn`. `/compact` n'y figure pas. `/effort` et `/agents` y sont nommées sans description et ne sont pas recommandées.

## Workflows

Selon la page officielle « workflows to skills » (https://antigravity.google/docs/migration/workflows-to-skills/), les répertoires `.agents/workflows/` ne sont plus indexés ni exécutables depuis le 19 octobre 2026. Le harnais ne génère donc que des skills (`/<nom>` les appelle). La cible `--target antigravity` d'ECC, qui convertit des commandes en workflows, ne doit pas être utilisée telle quelle.
