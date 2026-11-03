# Cahier des charges — Agent de support N1

## Contexte
Chatbot de support informatique de niveau 1 pour les clients d'une ESN. Il répond aux questions courantes, crée des tickets et escalade vers un technicien.

## Pile technique
- Langage : Python 3.12
- Framework : FastAPI, Pydantic v2
- Données : PostgreSQL 17, SQLAlchemy 2, Alembic
- LLM : API compatible OpenAI, auto-hébergée
- Tests : pytest
- Déploiement : Docker, Coolify

## Sécurité
Authentification des clients par jeton, journalisation sans données personnelles, conformité RGPD.

## Interface
Widget web minimal en HTML/CSS, respectant le design system fourni.
