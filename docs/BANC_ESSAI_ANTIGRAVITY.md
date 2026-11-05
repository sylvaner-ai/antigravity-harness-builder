# Banc d'essai Antigravity (mode non interactif)

Le banc d'essai lance les sondes de l'auto-test et deux scénarios de gouvernance avec `agy -p`, plusieurs fois chacun, et produit un tableau de taux de réussite, de durée et de consommation. Il remplace la saisie manuelle des tests et répond à la question que l'auto-test ne tranche pas : un résultat est-il stable ou aléatoire ?

Sources des options de `agy` : https://antigravity.google/docs/cli/headless/ et https://antigravity.google/docs/cli/reference/ (consultées le 3 novembre 2026). Seules les options documentées sont utilisées : `-p`, `--output-format json`, `--print-timeout`, `--model`, `--effort`.

## Prérequis

- `agy` installé et **connecté une fois** par une session `agy` interactive (le mode non interactif utilise les identifiants en cache).
- Node et les dépendances du dépôt (`npm install`) ; le banc se lance depuis la racine du dépôt de l'application.
- Le projet à mesurer porte son harnais (`.agents/` ou `AGENTS.md`).

## Lancement

```
npx tsx scripts/bench-antigravity.mts --project /chemin/du/projet --dry-run
npx tsx scripts/bench-antigravity.mts --project /chemin/du/projet --runs 3
```

`--dry-run` annonce le nombre d'appels sans rien lancer. Chaque appel consomme votre quota : 14 scénarios × 3 répétitions = 42 appels pour une configuration.

Options :

| Option | Rôle | Défaut |
| :--- | :--- | :--- |
| `--project` | Dossier du projet portant le harnais (jamais modifié : chaque essai travaille dans une copie jetable, sans `node_modules` ni `.git`) | obligatoire |
| `--runs` | Répétitions par scénario (1 à 20) | 3 |
| `--config modèle[:effort]` | Configuration à mesurer ; répétable pour comparer plusieurs couples (`agy models` liste les modèles ; effort `low`, `medium` ou `high`) | réglage par défaut de la CLI |
| `--scenarios` | Liste d'identifiants séparés par des virgules | tous |
| `--timeout` | Délai d'une réponse (`90s`, `10m`, `1h`) | `10m` |
| `--agy` | Chemin de l'exécutable | `agy` |
| `--out` | Dossier des résultats | `./bench-results` |
| `--summarize fichier.jsonl` | Reconstruit la synthèse d'une exécution interrompue | |

Sorties : `bench-results/<date>/runs.jsonl` (une ligne par essai : verdict, réponse tronquée à 4 000 caractères, statut, durée, tours, `usage`, fichiers modifiés) et `summary.md`.

Comparer le rapport coût/performance : `--config <modèle A>:low --config <modèle B>:high`. Le tableau donne un bloc par configuration.

## Scénarios

| Identifiant | Ce qu'il vérifie | Critère |
| :--- | :--- | :--- |
| `C1-always-on` | Règle `always_on` chargée | jeton `ALWAYS-OK-<série>` |
| `C2-glob` | Règle `glob` appliquée à la lecture d'un fichier | jeton `GLOB-OK-<série>` |
| `C3-decision` | Règle `model_decision` sans pointeur dans `AGENTS.md` | jeton `MD-OK-<série>` |
| `C2b-glob-pointeur` | Même règle `glob`, annoncée par `AGENTS.md` | jeton `GLOB-OK-<série>` |
| `C2m-glob-en-decision` | Même règle exprimée en `model_decision` dont la description cite le fichier (alternative au `glob`) | jeton `GLOB-OK-<série>` |
| `C3n-decision-sans-lecture` | Règle `model_decision` avec la consigne « n'ouvre aucun fichier » (ancienne sonde T3) | jeton `MD-OK-<série>` |
| `C3b-decision-pointeur` | Même règle, annoncée par la section « Règles à lire avant certaines tâches » (texte produit par le générateur) | jeton `MD-OK-<série>` |
| `C4-skill` | Skill découvert | jeton `SKILL-OK-<série>` |
| `C4b-skill-slash` | Skill appelé par `/selftest-skill` | jeton `SKILL-OK-<série>` |
| `C5-subagent` | Sous-agent de `.agents/agents/` appelé | jeton `AGENT-OK-<série>` |
| `C6-model-flash` | Sous-agent avec `model: flash` appelé | jeton `FLASH-OK-<série>` (l'effet du champ n'est pas vérifiable ici) |
| `W1-workflow` | Workflow hérité encore exécuté (informatif) | jeton `WF-RAN-<série>` |
| `G1-tache-courte` | Titre fautif corrigé, aucun commentaire sur le modèle | fichier corrigé et absence de formules sur le réglage |
| `G2-tache-longue` | Plan livré (1 200 caractères au moins), sans attente de l'utilisateur ni modification de fichier | heuristique |

Les erreurs du service (indisponibilité 503, quota épuisé, délai dépassé) sont classées « indéterminées » : elles sont exclues des taux et listées à part, car elles ne disent rien du harnais.

La différence entre `C3-decision` et `C3b-decision-pointeur` mesure directement l'effet de l'option C.

## Limites à connaître

- Les critères G1 et G2 reposent sur des formulations typiques : lisez les réponses de `runs.jsonl` avant de conclure.
- Les noms des champs de `usage` ne sont pas documentés : la synthèse moyenne tous les champs numériques qu'elle y trouve, sans les interpréter.
- Le répertoire de travail n'est pas documenté : le banc lance `agy` depuis la copie jetable (`cwd`). Si les jetons `C1` à `C5` sont tous absents alors que le contrôle préalable passe, c'est le premier point à vérifier.
- Le délai par défaut de `--print-timeout` diffère entre les deux pages de la documentation (5 minutes et 0 seconde) : le banc le fixe toujours explicitement.
- Le mode non interactif refuse par défaut les commandes shell ; le banc n'utilise jamais `--dangerously-skip-permissions`, et aucun scénario n'a besoin de commande shell.
- Avec 3 répétitions, un taux de 2/3 ou 3/3 reste un indice, pas une garantie. Un échec isolé sur 3 ne prouve rien ; 0/3 ou 3/3 est plus parlant.
- Ce banc mesure la surface CLI (`agy`), pas l'IDE.
