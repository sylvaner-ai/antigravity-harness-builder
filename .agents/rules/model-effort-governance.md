---
trigger: always_on
description: "Arbitrage coût/performance du couple Modèle / Niveau d'effort pour les tâches longues ou critiques ; aucune intervention sur les tâches courtes."
---

# Gouvernance Modèle / Effort — antigravity-harness-builder

Surface : IDE. Le modèle et l'effort se règlent dans l'interface (`Model Selection`) : vous ne pouvez pas les modifier vous-même, vous les recommandez à l'utilisateur. Aucun sous-agent ne fige de champ `model` ; le couple conseillé par rôle figure dans `docs/ORCHESTRATION.md`.

## 1. Quand intervenir (proportionnalité)

1. **Tâche courte** (question, relecture, correction bornée dans un seul fichier, formatage) : exécutez-la directement, sans commentaire sur le modèle.
2. **Tâche longue ou à enjeu** (plusieurs fichiers ou étapes, fonctionnalité complète, débogage prolongé, audit, planification) : **avant d'exécuter la tâche**, une seule fois, comparez le réglage actif à la matrice ci-dessous.
   - Couple identique ou écart sans conséquence : lancez la tâche **automatiquement**, sans rien écrire.
   - Écart net : écrivez **une seule phrase** (25 mots au plus, sans justification ni paragraphe) — « Réglage conseillé pour cette tâche : `<couple>`. Je poursuis avec le réglage actuel. » — puis **poursuivez immédiatement**, sans poser de question ni attendre de réponse. Donnez **un seul couple préconisé**, jamais une liste d'options.
3. **Seule exception — arrêt** : la tâche **modifie des fichiers ou des données de façon difficilement réversible** (migration destructive, suppression, refonte appliquée au code d'architecture ou de sécurité) **et** le réglage actif est inférieur au couple préconisé. Demandez alors à l'utilisateur de modifier `Model Selection` avant toute modification. Planifier, analyser, relire ou proposer sans modifier de fichier n'est **jamais** une raison de s'arrêter, même au palier T4.
4. **Réglage actif inconnu** (absent du contexte de session) : ne le devinez pas. Indiquez le couple conseillé en une phrase et poursuivez ; en cas d'action irréversible (point 3), demandez confirmation.
5. Ne reposez pas la question pendant un même chantier, sauf si le travail change de palier.

## 2. Matrice coût / performance

| Palier | Tâches | Couple préconisé |
| :--- | :--- | :--- |
| **T1** Léger | Questions, recherche ponctuelle, documentation, formatage | `Flash — Effort Low` |
| **T2** Localisé | Modification bornée, exécution de tests existants, vérifications de saisie | `Flash — Effort Medium` |
| **T3** Standard | Fonctionnalités, routes API, TDD, corrections de build ou de types | `Pro — Effort Medium` |
| **T4** Critique | Architecture, schéma de base de données, sécurité, débogage difficile, revue finale | `Pro — Effort High` |

Traduisez Flash / Pro vers le libellé exact du sélecteur lorsqu'il est visible dans la session.

## 3. Délégation à un sous-agent

Déléguez uniquement une sous-tâche **indépendante, bornée et volumineuse** (exploration large, revue indépendante, travail parallèle sans collision de fichiers). Une tâche courte se traite directement. Chaque délégation précise l'objectif, les fichiers concernés et le livrable attendu.
