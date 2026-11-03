---
trigger: glob
description: Validation stricte Zod, requêtes SQL préparées, zéro fuite de secrets et en-têtes sécurisés
globs: "**/api/**, **/routes/**, **/server/**, **/db/**, src/**/*.{ts,js}"
---

# Directives de Sécurité API & Zero-Trust (OWASP)

## 1. Validation Stricte à la Frontière
- Valider tout corps (body), paramètre de requête (query) et en-tête avec un schéma Zod ou équivalent typé.
- Rejeter systématiquement les payloads malformés ou contenant des champs inattendus (strip ou strict).
- Ne jamais faire confiance aux données d'origine cliente, même après authentification.

## 2. Protection contre les Injections (SQL, NoSQL, Shell)
- Utiliser exclusivement des requêtes préparées ou l'ORM configuré (Drizzle, Prisma).
- Proscrire absolument toute concaténation ou interpolation de chaînes dans les requêtes de base de données.
- Ne jamais passer de commande shell contenant des arguments utilisateurs non assainis.

## 3. Confidentialité & Zéro Secret
- Ne jamais commiter ou inscrire dans les logs de secrets, mots de passe, jetons API ou données sensibles.
- Masquer les identifiants et tokens dans tous les flux d'erreurs retournés au client.
- Configurer les en-têtes de sécurité (CSP, HSTS, CORS restreint).
