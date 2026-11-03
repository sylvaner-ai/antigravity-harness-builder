# Cahier des charges — Portail de gestion des sinistres

## Contexte
Application interne d'un courtier en assurance : saisie, instruction et suivi des déclarations de sinistre. Les gestionnaires traitent les dossiers ; les experts déposent leurs rapports.

## Pile technique
- Langage : Java 21
- Framework : Spring Boot 3
- Données : MySQL 8, accès par MyBatis
- Tests : JUnit 5
- Déploiement : Docker, Kubernetes

## Rôles
- Gestionnaire : crée et instruit les dossiers.
- Expert : dépose des rapports sur les dossiers qui lui sont affectés.
- Administrateur : gère les habilitations.

## Sécurité
Authentification forte, traçabilité des accès aux dossiers, conformité RGPD.
