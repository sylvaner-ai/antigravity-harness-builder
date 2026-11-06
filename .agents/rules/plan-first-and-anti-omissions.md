---
trigger: model_decision
description: "À consulter lorsque la tâche concerne : plan first and anti omissions."
---

# Rigueur de Développement & Prévention des Oublis

## 1. Planification Préalable (Plan First)
- Interdiction formelle de modifier des fichiers de code sans avoir préalablement validé une feuille de route d'étapes.
- Identifier les dépendances, les risques d'effets de bord et les cas limites avant d'écrire du code.

## 2. Workflow Test-Driven Development (TDD)
1. **RED :** Écrire le test unitaire ou d'intégration d'abord et vérifier qu'il échoue pour la bonne raison.
2. **GREEN :** Produire l'implémentation la plus simple et ciblée pour faire passer le test au vert.
3. **IMPROVE :** Refactorer pour la lisibilité et la maintenabilité sans changer le comportement.
- Viser au minimum 80% de couverture sur tout nouveau code.

## 3. Checklist Pré-Commit Obligatoire
Avant de marquer une tâche comme terminée :
1. Exécuter la suite de tests : tous les tests doivent être au vert.
2. Exécuter le linter et le vérificateur de types (tsc --noEmit) : zéro avertissement ni erreur.
3. Auditer le diff Git intégral : vérifier qu'aucun fichier temporaire, secret ou modification non sollicitée n'a été introduit.
