# Résultats de l'auto-test Antigravity (série KG2TW6, 3 novembre 2026)

Version d'Antigravity et surface (IDE ou CLI) : non relevées. Modèle actif pendant les tests : Gemini 3.8 Flash, effort Medium (réponse de l'agent à T7, source non citée).

| Test | Résultat | Lecture |
| :--- | :--- | :--- |
| T1 règle toujours active | Jeton produit | Chargée (sous réserve de lecture de fichier, non vérifiée) |
| T2 règle par fichier | Jeton produit | Idem |
| T3 règle à la décision du modèle | Jeton produit | Idem : les règles rétrogradées au Lot 3 sont lisibles |
| T4 skill | Jeton produit | Découvert |
| T5 sous-agent | Jeton produit | `.agents/agents/` est chargé |
| T6 `model: flash` | Jeton produit, aucun blocage | Champ accepté ; **effet non établi** car le modèle actif était déjà Flash |
| T7 modèle actif | « Gemini 3.8 Flash, effort Medium » | Visible pour l'agent ; source exacte non relevée |
| T8 commandes | `/grill-me`, `/learn` **et `/compact`** existent | `/compact` absente de la documentation mais présente |
| T9 workflow hérité | Jeton produit | **Les workflows s'exécutent encore** malgré l'arrêt annoncé au 19 octobre 2026 |
| T10 tâche courte | Aucun commentaire sur le modèle | Conforme |
| T11 tâche longue | Paragraphe de justification, puis arrêt en attente de confirmation | **Non conforme** : la règle demande une phrase puis la poursuite |

## Décisions prises

1. **T11** : la règle classait la planification au palier T4 et s'arrêtait. Elle est corrigée : une seule phrase, poursuite immédiate, arrêt uniquement pour une action difficilement réversible avec un réglage insuffisant ; planifier ou analyser n'est jamais une raison de s'arrêter.
2. **T9** : les formulations « workflows non exécutables depuis le 19 octobre 2026 » sont remplacées par « arrêt annoncé, encore exécutés par certaines versions ». Le choix « skills uniquement » est conservé : les skills fonctionnent dans les deux cas (T4).
3. **T8** : `/compact` n'est pas ajoutée aux recommandations tant que son effet n'est pas connu.
4. **T6** : à refaire avec un modèle Pro sélectionné, pour distinguer l'effet du champ `model`. Le champ n'est pas encore écrit dans les sous-agents générés.
5. **T7** : l'agent voit le modèle et l'effort actifs. La règle conserve la branche « réglage inconnu » par prudence.

## Points restant incertains

- Les jetons de T1 à T6 peuvent provenir d'une lecture du fichier de sonde plutôt que du chargement automatique : la trajectoire n'a pas été relevée.
- La version d'Antigravity n'a pas été notée : à relever pour toute comparaison future.

---

# Tour 2 (série RS49NV, 3 novembre 2026)

Version : Antigravity CLI (`agy`) 1.4.12, surface CLI uniquement (l'IDE n'est pas testé). Projet testé : le dépôt de l'application, dont le harnais embarqué datait d'avant le Lot 3.

| Test | Résultat | Lecture |
| :--- | :--- | :--- |
| T1 règle toujours active | `ALWAYS-OK-RS49NV` | **Établi** (identifiant du tour correct) |
| T2 règle par fichier | Aucun jeton | Non établi ; réussi au tour 1, échoué au tour 2 : non fiable |
| T3 règle à la décision | `DECISION-OK-94KNWQ` | **Non établi** : le jeton attendu était `MD-OK-RS49NV` ; la valeur reçue ne figure dans aucun fichier du pack ni du dépôt |
| T4 skill | `SKILL-OK-73XN8P` | **Non établi** : préfixe correct mais identifiant différent de `RS49NV`, introuvable dans les fichiers |
| T5 sous-agent | `AGENT-OK-RS49NV` | **Établi** : `.agents/agents/` est chargé |
| T6 `model: flash` | Non exécuté | L'ancienne règle a arrêté l'agent pour demander un changement de modèle (tâche pourtant triviale). Effet du champ `model` toujours inconnu |
| T7 modèle actif | « Gemini 3.8 Flash (Low) », source `<USER_SETTINGS_CHANGE>`, réglage `Model Selection` | **Établi** : l'agent voit le modèle et l'effort actifs |
| T8 `/compact` | Présente dans la liste, s'exécute (« Working » puis disparaît) | Existe ; effet non observable |
| T9 workflow hérité | `WF-RAN-RS49NV` | **Établi** : les workflows s'exécutent encore sur agy 1.4.12 |
| T10 tâche courte | Aucun commentaire sur le modèle | Conforme, mais obtenu avec l'**ancienne** règle embarquée |
| T11 tâche longue | Paragraphe puis arrêt en attente de confirmation | Comportement de l'**ancienne** règle embarquée ; la règle corrigée n'a pas été testée |

« Fichier lu ? » : « Je ne vois rien » à chaque test ; la CLI ne montre aucune trace de lecture, donc chargement automatique et lecture de fichier restent indiscernables.

## Correction du diagnostic du tour 1

Les résultats T10 et T11 du tour 1 venaient de l'ancienne règle `model-effort-governance.md` committée dans le dépôt de l'application, pas de la règle produite par le générateur du Lot 3. Le diagnostic du tour 1 les avait attribués en partie à tort au générateur.

## Décisions

1. Le harnais embarqué du dépôt est mis à jour avec les textes du générateur actuel : règle de gouvernance, principe 5 et section des commandes slash d'`AGENTS.md`, descriptions des sous-agents (plus de « MUST BE USED / PROACTIVELY »), `docs/ORCHESTRATION.md`. Les règles propres au projet ne sont pas modifiées.
2. À refaire dans un projet portant la règle corrigée : T6 (sans arrêt préalable), T10, T11.
3. À refaire dans une conversation neuve : T2, T3, T4, en exigeant le jeton exact tel qu'écrit dans le fichier.
4. Le champ `model` n'est toujours pas écrit dans les sous-agents générés.

---

# Tour 3 (série RS49NV, 3 novembre 2026)

| Test | Résultat | Lecture |
| :--- | :--- | :--- |
| T2 règle par fichier | Description du fichier, pas de jeton | Échec ; trace de lecture `selftest-target.txt#L1` visible cette fois |
| T3 règle à la décision | Réponse sur la « pomme bleue », pas de jeton | Échec ; un essai exact sur trois |
| T4 skill | `SKILL-OK-RS49NV` | **Établi** |
| T6 sous-agent `selftest-flash` | `FLASH-OK-RS49NV` | Sous-agent chargé et appelé. L'effet de `model: flash` n'est pas prouvé : le nom de modèle annoncé par l'agent (« Gemini 2.5 Flash ») ne correspond pas au sélecteur (« Gemini 3.8 Flash ») |
| T10, T11 (premier essai) | Comportement de l'ancienne règle | Le dossier testé n'avait pas été mis à jour (règle de 5 647 octets) |
| T10, T11 (après `git pull`, règle de 3 263 octets) | T10 : exécution directe, aucun commentaire (le titre ne contenait pas de faute). T11 : « Réglage conseillé pour cette tâche : Pro — Effort High. Je poursuis avec le réglage actuel. », puis plan complet, sans arrêt ni modification | **Conformes** |

## Décisions

1. La règle de gouvernance n'est pas modifiée.
2. Les règles `glob` et `model_decision` étant peu fiables, option C retenue : `AGENTS.md` annonce chaque règle chargée à la demande (chemin, sujet, consigne de lecture avant la tâche). Voir `docs/GOUVERNANCE_CONTEXTE.md`.
3. À mesurer ensuite : une tâche qui relève d'une règle rétrogradée, dans un projet généré par cette version, pour vérifier que l'agent ouvre le fichier annoncé.

---

# Première mesure avec le banc d'essai (3 novembre 2026)

`agy` 1.4.12 en mode non interactif, modèle `gemini-3.8-flash-medium`, effort medium, 3 répétitions par scénario, projet : le dépôt de l'application avec son harnais à jour.

| Scénario | Résultat | Lecture |
| :--- | :--- | :--- |
| C1 règle `always_on` | 3/3 | Fiable |
| C2 règle `glob` | 1/3 | **Non fiable** : l'agent lit le fichier et le résume sans appliquer la règle |
| C3 règle `model_decision` | 3/3 | Fiable avec une invite qui n'interdit pas d'ouvrir des fichiers |
| C3b idem avec pointeur dans `AGENTS.md` | 3/3 | Aucun gain mesurable : plafond atteint dès C3 |
| C4 skill (texte `SELFTEST-SKILL`) | 1 réussite, 1 jeton inventé (`SKILL-OK-Z5V8TN`), 1 erreur 503 | Non concluant ; l'invite interdisait d'ouvrir des fichiers |
| C5 sous-agent | 3/3 | Fiable |
| C6 sous-agent `model: flash` | 2/2 conclusifs, 1 erreur 503 | Sous-agent appelé ; le sous-agent répond « modèle inconnu » : l'effet du champ n'est pas prouvé |
| W1 workflow hérité | 3/3 | Toujours exécuté sur 1.4.12 |
| G1 tâche courte | 3/3 | Faute corrigée, aucun commentaire sur le modèle |
| G2 tâche longue | 3/3 | Une phrase « Réglage conseillé… Je poursuis avec le réglage actuel. », puis plan complet (7 000 à 9 000 caractères), sans arrêt ni modification de fichier |

Consommation : environ 20 500 jetons en entrée pour une réponse d'un mot (contexte de base : consignes de la plateforme et harnais) ; une tâche de plan (G2) consomme 47 000 à 70 000 jetons au total, en 65 à 135 secondes.

## Ce que cela change

1. **La règle de gouvernance fonctionne** dans la surface CLI avec ce modèle (G1 et G2, 3/3).
2. **L'hypothèse « l'invite T3/T4 empêchait de lire le fichier » n'est pas confirmée** (voir la deuxième mesure ci-dessous) : avec l'ancienne invite (« n'ouvre aucun fichier »), `model_decision` passe 3/3 en CLI. Les échecs de T3 et de T4 lors des tours manuels restent donc inexpliqués (surface IDE, modèle, ou variabilité). Les consignes de non-lecture sont tout de même retirées des sondes T3 et T4 : elles n'ont pas d'utilité pour ce qu'on cherche à mesurer.
3. **Les règles `glob` restent peu fiables** (1/3). Le scénario `C2b` mesure si le pointeur d'`AGENTS.md` les rattrape.
4. **Un agent qui ne voit pas le contenu d'un fichier invente un jeton plausible** (`SKILL-OK-Z5V8TN`, `DECISION-OK-94KNWQ`) : un jeton d'un autre identifiant est un échec, jamais un succès partiel.
5. Deux essais ont échoué sur une erreur 503 du service alors que la réponse contenait le bon jeton : ces erreurs sont désormais classées « indéterminées » et exclues des taux. Un essai (C4) a attendu 10 minutes une tâche de fond avant d'échouer.

## Deuxième mesure (3 novembre 2026, même modèle `gemini-3.8-flash-medium`, effort medium, 3 répétitions)

| Scénario | Résultat | Cumul avec la première mesure |
| :--- | :--- | :--- |
| C2 règle `glob` | 3/3 | **4/6** : variable d'un lot à l'autre |
| C2b `glob` avec pointeur dans `AGENTS.md` | 3/3 | 3/3 : écart avec C2 trop faible pour conclure (6 et 3 essais) |
| C3n `model_decision`, ancienne invite « n'ouvre aucun fichier » | 3/3 | `model_decision` : 9/9 avec les trois variantes |
| C4b skill appelé par `/selftest-skill` | 3/3 | Invocation par `/nom` fiable (4 s, 20 900 jetons) ; l'invocation par un texte libre (C4) reste incertaine (1 réussite sur 3, plus un jeton inventé) |

Lectures :
- L'invocation d'un skill par `/nom` est la voie fiable ; la découverte par simple mention dans un texte ne l'est pas.
- Les règles `glob` ne sont ni fiables ni clairement défaillantes : 4 essais sur 6. Le pointeur d'`AGENTS.md` ne se distingue pas statistiquement. Il est conservé car il ne coûte presque rien et couvre aussi le cas où une règle ne se déclenche pas.
- C3n consomme plus de jetons de raisonnement (environ 2 300) que C3 (environ 300) : l'agent pèse la consigne contradictoire avant de répondre.
- Limites : un seul modèle (petit), surface CLI uniquement, 3 répétitions : le banc n'a pas encore été exécuté avec Opus 5.5 (quota épuisé jusqu'au 4 novembre).

## Troisième mesure : Opus 5.5, effort low (3 novembre 2026)

Trois essais prévus par scénario ; le quota s'est épuisé au troisième tour de chaque scénario (réinitialisation annoncée dans 71 h 48). Ces trois essais ont d'abord été comptés comme des échecs par erreur : le message « Individual quota reached » ne contenait aucun des mots recherchés. Le banc le classe désormais « indéterminé ». Résultats conclusifs :

| Scénario | Résultat | Remarque |
| :--- | :--- | :--- |
| C2 règle `glob` | 0/2 | Jeton absent. Cumul toutes mesures : 4/8 |
| G1 tâche courte | 2/2 | Faute corrigée, aucun commentaire sur le modèle |
| G2 tâche longue | 2/2 selon les critères automatiques | Plans de 1 668 et 2 215 caractères (contre 7 000 à 9 000 avec Flash) : réponses à relire avant de conclure sur la conformité de la phrase d'introduction |

Consommation moyenne : G1 environ 18 800 jetons, G2 environ 45 650, sans jetons de raisonnement comptés (`thinking_tokens=0`).

Conclusion provisoire : la gouvernance se comporte comme attendu avec Opus low sur les essais conclusifs, mais l'échantillon (2 essais) est petit. Les règles `glob` sont peu fiables avec deux modèles différents ; le scénario `C2m` mesure l'alternative `model_decision` (9 essais sur 9 réussis avec Flash pour cette famille de règles).

## Quatrième mesure : `glob` contre `model_decision` (5 novembre 2026)

`gemini-3.8-flash-medium`, effort medium, 6 répétitions chacune, même lot, même fichier cible.

| Scénario | Résultat |
| :--- | :--- |
| C2 règle `glob` | **0/6** |
| C2m même règle en `model_decision` (description citant le fichier) | **6/6** |

Cumul des règles `glob` : 4 essais réussis sur 14 (Flash 4/12, Opus low 0/2). Cumul de la famille `model_decision` avec Flash : 15 sur 15.

Décision : le générateur convertit les règles `glob` en `model_decision` (voir `docs/GOUVERNANCE_CONTEXTE.md`). À mesurer ensuite : C2m avec la description produite par le générateur (motifs en tête), puis une règle de langage réelle.

