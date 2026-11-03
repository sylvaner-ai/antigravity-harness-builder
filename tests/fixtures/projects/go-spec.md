# Cahier des charges — Collecteur de métriques

## Contexte
Service en ligne de commande et API HTTP qui collecte des métriques d'infrastructure et les expose à un outil de supervision. Aucune interface graphique.

## Pile technique
- Langage : Go 1.23
- Données : SQLite
- Tests : go test
- Déploiement : Docker

## Exigences
Fonctionnement sans interruption, journalisation structurée, arrêt propre sur signal.
