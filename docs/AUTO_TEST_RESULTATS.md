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
