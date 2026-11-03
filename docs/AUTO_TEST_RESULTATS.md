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
