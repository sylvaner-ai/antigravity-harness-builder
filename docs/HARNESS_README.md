# Harnais de Développement Google Antigravity — antigravity-harness-builder

Ce paquet autonome a été généré par **Antigravity Harness Builder** pour configurer un environnement de développement agentique sur mesure pour le projet **antigravity-harness-builder**.

## Installation Rapide dans Google Antigravity

1. Extrayez le contenu de cette archive à la racine de votre projet cible (ou dans un dossier de staging).
2. Ouvrez une nouvelle conversation dans **Google Antigravity** (surface configurée : `IDE`).
3. Fournissez le fichier [`START_HERE.md`](./START_HERE.md) à l'agent principal en lui demandant d'exécuter le protocole d'installation en 10 étapes.

## Structure du Paquet

- `START_HERE.md` : Prompt et protocole d'installation prudent en 10 étapes.
- `AGENTS.md` : Instructions permanentes de la racine du projet (sans frontmatter YAML, < 24 Ko).
- `docs/PROJECT_SPEC.md` : Cahier des charges normalisé avec traçabilité des sources.
- `docs/DESIGN_SYSTEM.md` : Charte graphique, tokens visuels, composants et règles d'accessibilité.
- `docs/ARCHITECTURE.md` : Contraintes techniques et décisions d'architecture.
- `docs/ORCHESTRATION.md` : Politique de décomposition des tâches, délégation aux sous-agents, tiers de modèles et efforts conseillés.
- `docs/ACCEPTANCE_CRITERIA.md` : Critères d'acceptation vérifiables par fonctionnalité.
- `docs/ASSUMPTIONS.md` : Hypothèses proposées, déductions et informations manquantes à confirmer.
- `docs/ECC_SOURCES.md` : Provenance exacte, commit (`v2.2.3` / `b38be6a7f6350964d59328b52f0624e1d1d552d1`) et licence MIT des composants Everything Claude Code (ECC).
- `docs/HARNESS_MANIFEST.json` : Manifeste machine-readable et rapport de validation.
- `.agents/rules/` : Règles natives Antigravity (`always_on`, `glob`, `model_decision`).
- `.agents/skills/` : Skills natifs Antigravity (`SKILL.md` et ressources).
- `.agents/agents/` : Sous-agents spécialisés à privilèges minimaux.
