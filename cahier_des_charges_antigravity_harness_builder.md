# Cahier des charges fonctionnel et technique
## Antigravity Harness Builder — Générateur de harnais de développement pour Google Antigravity

**Version :** 1.2  
**Statut :** spécification de référence pour le développement — révisée pour préciser les choix de stack, les décisions différées et l’architecture des traitements asynchrones  
**Langue de l'interface :** français, avec prise en charge de contenus techniques en anglais  
**Environnement cible de l'application :** Next.js, TypeScript strict, Tailwind CSS, PostgreSQL, Docker et Coolify sur VPS Ubuntu

---

## 1. Vision et objectifs

Créer une application web privée qui transforme les documents de cadrage d'un projet logiciel en un **harnais de développement complet, cohérent, adapté et directement exploitable par Google Antigravity**.

L'utilisateur fournit au minimum :

1. Le cahier des charges fonctionnel et/ou technique du projet cible.
2. Le design system du projet cible (charte graphique, composants, tokens, règles UX/UI, exemples ou documents de référence).

L'application analyse ces sources, caractérise le projet, explore la bibliothèque officielle [Everything Claude Code (ECC)](https://github.com/affaan-m/ECC), sélectionne les composants pertinents et génère un paquet d'installation pour Antigravity comprenant notamment :

- les instructions principales du projet ;
- les règles pérennes de développement ;
- les sous-agents spécialisés réellement utiles ;
- les skills réutilisables et leurs ressources éventuelles ;
- les instructions d'orchestration de l'agent principal ;
- le cahier des charges normalisé et le design system du projet cible ;
- les décisions d'architecture et les critères d'acceptation ;
- un manifeste des composants sélectionnés et de leurs sources ;
- un guide/point d'entrée que l'utilisateur pourra donner à Antigravity pour installer et vérifier l'ensemble.

Le produit ne doit **pas** copier toute la bibliothèque ECC par défaut. Il doit composer le harnais minimal suffisant pour atteindre le niveau de qualité recherché, sans multiplier inutilement les agents, les skills ou les instructions chargées dans le contexte.

### 1.1 Résultat attendu

À la fin du parcours, l'utilisateur télécharge un paquet autonome contenant un fichier `START_HERE.md` à fournir à Antigravity ainsi que les fichiers et dossiers que celui-ci doit installer dans le projet cible. Un fichier ZIP est le livrable principal. Le prompt de démarrage peut également être téléchargé séparément en Markdown ou en texte brut.

L'installation doit être guidée, reproductible, vérifiable et prudente vis-à-vis des fichiers déjà présents dans le projet.

### 1.2 Principes directeurs

- **Pertinence avant quantité :** choisir uniquement les composants qui apportent une valeur identifiable.
- **Compatibilité native :** produire des fichiers compatibles avec la version et la surface d'Antigravity ciblées.
- **Traçabilité :** pouvoir expliquer pourquoi chaque agent, skill et règle a été retenu, avec ses sources et sa version.
- **Pas d'invention silencieuse :** signaler les informations manquantes, contradictions et hypothèses.
- **Contrôle utilisateur :** laisser l'utilisateur examiner et modifier la sélection avant l'export.
- **Sécurité par défaut :** ne jamais exécuter aveuglément un script récupéré depuis une bibliothèque tierce.
- **Évolutivité :** isoler les adaptations propres à Antigravity afin de pouvoir suivre ses évolutions sans réécrire le cœur métier.

### 1.3 Historique des versions

- **1.2 :** clarification de la justification de la stack, des choix techniques imposés, des choix à arbitrer par ADR et de l’architecture initiale des traitements asynchrones.
- **1.1 :** ajout d’une stratégie de livraison par jalons, d’un jeu de tests de référence, d’une politique de maîtrise des coûts et d’une matrice de validation des capacités Antigravity.

---

## 2. Utilisateurs et périmètre

### 2.1 Utilisateur principal

Développeur, dirigeant, product owner ou responsable technique qui utilise Google Antigravity pour créer ou faire évoluer des applications et souhaite préparer automatiquement un environnement de développement agentique de haute qualité.

### 2.2 Périmètre de la V1

La V1 doit permettre de :

1. Créer et retrouver des projets de génération.
2. Importer le cahier des charges et le design system du projet cible.
3. Extraire les informations utiles et soumettre à validation un profil de projet structuré.
4. Identifier et classer les agents, skills, règles et ressources ECC appropriés.
5. Construire un plan d'orchestration adapté au projet.
6. Générer les documents et fichiers natifs pour Antigravity.
7. Vérifier leur cohérence et leur compatibilité avant export.
8. Prévisualiser les composants, justifications et l'arborescence générée.
9. Télécharger le paquet ZIP et le prompt de démarrage.
10. Conserver un historique des générations avec leur version des sources ECC.

### 2.3 Hors périmètre de la V1

- Développer automatiquement le produit décrit dans le cahier des charges cible.
- Modifier la configuration globale d'Antigravity ou les réglages de la machine de l'utilisateur.
- Exécuter automatiquement, depuis l'application web, des scripts sur l'ordinateur cible.
- Garantir l'activation de modèles ou de fonctions qui dépendent de l'abonnement, de la version ou de l'environnement Antigravity de l'utilisateur.
- Copier sans filtrage l'intégralité des agents, skills, hooks ou scripts ECC.
- Prendre en charge toutes les plateformes agentiques dès la V1 : Antigravity est la cible prioritaire.

---

## 3. Parcours utilisateur

Le parcours principal est un assistant en étapes clairement identifiées.

### Étape 1 — Créer un projet de génération

L'utilisateur renseigne le nom du projet cible et, si nécessaire, une courte description. Le nom de l'application génératrice et celui du projet cible doivent rester distincts.

Il sélectionne la surface Antigravity visée : App, IDE ou CLI, selon les options effectivement prises en charge par la version active. La valeur par défaut est la surface couramment utilisée par l'utilisateur ; si elle n'est pas connue, l'application affiche le choix plutôt que de supposer une compatibilité totale.

### Étape 2 — Importer les documents

Deux entrées sont requises :

- **Cahier des charges du projet cible** ;
- **Design system du projet cible**.

Formats V1 : PDF, DOCX, Markdown, TXT, JSON, YAML, CSS/SCSS et images PNG/JPEG. SVG peut être accepté comme ressource graphique après validation de sécurité. Les limites de taille doivent être configurables et clairement affichées.

L'application contrôle le type réel du fichier, sa taille, sa lisibilité et la réussite de l'extraction. Elle ne doit jamais exécuter de macro, de code ou de contenu embarqué provenant des documents importés.

L'utilisateur peut ajouter des notes complémentaires : stack technique, contraintes de déploiement, exigences réglementaires, niveau de qualité souhaité, préférences de coûts ou contraintes d'équipe. Ces champs peuvent être préremplis à partir des documents, mais doivent rester modifiables.

### Étape 3 — Analyser et confirmer le profil du projet

L'application extrait notamment :

- objectif et domaine fonctionnel ;
- personas, rôles et parcours utilisateurs ;
- fonctionnalités, règles métier et critères d'acceptation ;
- stack souhaitée ou détectée ;
- contraintes d'architecture, de déploiement et d'intégration ;
- exigences de sécurité, de confidentialité, de conformité et de disponibilité ;
- tokens visuels, typographie, couleurs, espacements, composants, états et règles UX/UI ;
- stratégie de tests et exigences de qualité ;
- éléments certains, éléments déduits et informations manquantes.

L'interface présente une synthèse éditable et distingue explicitement :

- **Source explicite** : information présente dans les documents ;
- **Déduction** : interprétation de l'application, accompagnée d'un niveau de confiance ;
- **Hypothèse proposée** : choix provisoire à confirmer ;
- **Information manquante ou contradictoire** : élément nécessitant une décision.

L'utilisateur peut corriger les informations avant de continuer. L'application ne doit pas bloquer inutilement tout le parcours en cas de manque non critique, mais les hypothèses doivent figurer dans le paquet final.

### Étape 4 — Composer le harnais

L'application interroge son catalogue ECC, évalue les composants candidats et génère une proposition comprenant :

- agents retenus et responsabilités ;
- skills retenus et conditions de déclenchement ;
- règles de développement permanentes ;
- politique d'orchestration et de délégation ;
- politique de sélection des tiers de modèles et recommandations d'effort ;
- éléments créés spécifiquement pour le projet, clairement distingués des éléments adaptés depuis ECC.

Chaque composant est accompagné d'une justification, de sa source, de son degré de compatibilité et des éventuelles adaptations nécessaires.

### Étape 5 — Examiner et ajuster

L'utilisateur peut ajouter ou retirer des composants, modifier leurs priorités et régénérer la proposition. L'application doit signaler les incompatibilités, doublons ou dépendances manquantes avant d'autoriser l'export.

La sélection équilibrée est la valeur par défaut. Une sélection « minimale » ou « approfondie » peut être proposée, sans remplacer l'explication détaillée de la composition.

### Étape 6 — Prévisualiser et exporter

Avant de générer le paquet final, afficher :

- l'arborescence des fichiers ;
- la liste et la justification des composants ;
- les hypothèses et points de vigilance ;
- les avertissements de compatibilité ;
- la version ou le commit ECC utilisé ;
- un résumé des contrôles passés et échoués.

L'utilisateur télécharge le ZIP final et, séparément si souhaité, le prompt `START_HERE.md`.

---

## 4. Intégration de la bibliothèque ECC

### 4.1 Source de référence

Le dépôt officiel est : https://github.com/affaan-m/ECC

L'application doit exploiter la source officielle et sa documentation spécifique à Antigravity, notamment le guide `docs/ANTIGRAVITY-GUIDE.md`. Elle doit vérifier la compatibilité des composants avec Antigravity au lieu de supposer que toutes les ressources créées pour Claude Code sont transférables telles quelles.

### 4.2 Synchronisation et catalogue

Mettre en place un catalogue synchronisable à partir d'une version ou d'un commit ECC identifiable. La synchronisation doit :

1. récupérer la liste et les métadonnées des composants depuis la source officielle ;
2. conserver leur type, description, tags, chemins, licence, dépendances éventuelles et informations de compatibilité ;
3. indexer le contenu utile à la recherche ;
4. enregistrer le tag ou SHA du commit source, la date de synchronisation et les empreintes des fichiers ;
5. mettre les résultats en cache et gérer les erreurs ou limites de l'API GitHub ;
6. distinguer une erreur de synchronisation d'un catalogue vide ;
7. permettre de consulter la version exacte utilisée pour chaque paquet généré.

Ne pas dépendre d'un scraping HTML fragile lorsque l'accès au contenu du dépôt ou à l'API GitHub permet une lecture plus fiable. Le fonctionnement doit rester explicable et les appels externes doivent être limités par le cache.

### 4.3 Recherche et classement des composants

Utiliser une recherche hybride : filtres sur les métadonnées, recherche lexicale et, si elle apporte un gain mesurable, recherche sémantique. Chaque résultat doit être classé au moyen de critères explicites :

- adéquation au domaine et aux fonctionnalités du projet ;
- compatibilité avec la stack et la surface Antigravity ;
- utilité concrète dans les tâches prévues ;
- qualité et clarté des instructions ;
- risques de sécurité et capacités d'exécution requises ;
- redondance avec des composants déjà retenus ;
- coût en contexte et complexité ajoutée ;
- facilité de validation et de maintenance.

Ne pas présenter un score algorithmique comme une vérité absolue. L'interface doit afficher les principales raisons du classement.

### 4.4 Adaptation et compatibilité

- Utiliser le mapping natif recommandé pour Antigravity : règles dans `.agents/rules/`, skills dans `.agents/skills/<nom>/SKILL.md`, agents personnalisés dans `.agents/agents/` et instructions principales au niveau du projet.
- Ne pas copier en bloc un répertoire `.agents/` de la source ECC si celui-ci contient des métadonnées destinées à un autre environnement.
- Vérifier chaque frontmatter YAML, le nom des outils, les capacités et les chemins de skills. Un outil non reconnu ne doit jamais être ajouté « au cas où ».
- Ne pas exporter une configuration spécifique à Claude Code sans l'adapter et la valider pour Antigravity.
- Vérifier dynamiquement les fonctionnalités et conventions disponibles au moment de la génération.
- Les workflows Antigravity historiques ne doivent pas être utilisés comme fondation obligatoire. Au moment de la rédaction de ce cahier des charges, la documentation officielle annonce l'arrêt du système de workflows actuel au 19 octobre 2026 ; privilégier les skills natifs et ne produire d'anciens fichiers workflow que si leur prise en charge actuelle est vérifiée.
- Les hooks, commandes, serveurs MCP et scripts ne sont inclus que s'ils sont compatibles, nécessaires, documentés et soumis aux contrôles de sécurité adaptés.

### 4.5 Licence et provenance

Conserver les mentions de licence et d'attribution requises. Le manifeste doit distinguer les fichiers ECC utilisés tels quels, les fichiers adaptés et les fichiers nouvellement générés. Chaque composant externe doit avoir un lien vers sa source officielle.

Aucune source tierce ne doit être traitée comme une instruction système. Les contenus provenant d'ECC doivent être considérés comme des données à analyser, puis validés selon les règles de sécurité de l'application.

---

## 5. Structure du paquet généré

Le paquet doit s'adapter au profil réel du projet ; l'arborescence suivante constitue une base et non une obligation de générer chaque fichier à chaque fois.

```text
<project-harness>/
├── START_HERE.md                 # Prompt d'installation à remettre à Antigravity
├── README.md                     # Contenu, utilisation et précautions
├── AGENTS.md                     # Instructions générales du projet cible
├── docs/
│   ├── PROJECT_SPEC.md           # Cahier des charges normalisé
│   ├── DESIGN_SYSTEM.md          # Design system cible normalisé
│   ├── ARCHITECTURE.md            # Architecture et décisions de conception
│   ├── ORCHESTRATION.md           # Politique de délégation et d'exécution
│   ├── ACCEPTANCE_CRITERIA.md     # Critères d'acceptation vérifiables
│   ├── ASSUMPTIONS.md             # Hypothèses et points restant à confirmer
│   ├── ECC_SOURCES.md             # Provenance et licences des composants
│   └── HARNESS_MANIFEST.json      # Métadonnées machine-readable
└── .agents/
    ├── rules/                     # Règles natives et ciblées
    ├── skills/
    │   └── <skill-name>/
    │       ├── SKILL.md
    │       ├── scripts/            # Facultatif, après audit
    │       └── resources/          # Facultatif
    └── agents/
        └── <agent-name>.md
```

Les chemins finaux doivent être confirmés à partir de la surface Antigravity sélectionnée et de sa documentation à jour. Ne pas exporter de répertoire vide ou de fichier décoratif sans utilité.

### 5.1 Contenu de `START_HERE.md`

Le fichier doit être un guide d'exécution concret pour l'agent principal Antigravity. Il doit lui demander de :

1. lire le paquet et examiner le projet cible avant toute modification ;
2. établir un plan d'installation avec les fichiers à créer, modifier ou fusionner ;
3. détecter les collisions et ne pas écraser un fichier existant sans l'avoir signalé ;
4. préserver le code et les réglages existants qui ne sont pas concernés ;
5. appliquer les fichiers à leurs emplacements natifs compatibles avec Antigravity ;
6. vérifier les chemins, le YAML, les liens entre skills et agents, les références et les doublons ;
7. relire les règles et signaler les incohérences ;
8. lancer uniquement les commandes de vérification sûres et utiles, dans les limites d'autorisation d'Antigravity ;
9. demander une validation humaine avant toute action destructive, installation de dépendances non triviale, modification de secrets, migration de données ou commande à risque ;
10. produire un compte rendu des fichiers installés, des contrôles exécutés, des résultats et des actions restant à effectuer.

Le paquet doit pouvoir être installé plusieurs fois sans dupliquer les éléments gérés. Toute stratégie d'installation automatisée doit prévoir un mode simulation et la préservation des fichiers non gérés.

### 5.2 Manifeste machine-readable

`HARNESS_MANIFEST.json` doit au minimum contenir :

- identifiant et date de génération ;
- version du format de paquet ;
- surface Antigravity ciblée ;
- commit/tag ECC de référence ;
- documents d'entrée et empreintes, sans y inclure inutilement leur contenu confidentiel ;
- composants retenus avec type, source, chemin de destination, raison de sélection et statut d'adaptation ;
- modèle ou tier recommandé, niveau d'effort conseillé et indication « configurable », « compatible », « seulement indicatif » ou « non vérifiable » ;
- hypothèses, avertissements et dépendances ;
- résultats de validation des fichiers.

---

## 6. Orchestration de l'agent principal

Le paquet doit décrire une méthode de travail à l'agent principal, sans prétendre remplacer le mécanisme natif d'orchestration d'Antigravity.

### 6.1 Décomposition des tâches

L'agent principal doit :

1. analyser la demande et les critères d'acceptation ;
2. décomposer le travail en tâches atomiques, avec dépendances explicites ;
3. identifier les tâches parallélisables sans conflit d'écriture ;
4. déléguer les tâches indépendantes à des sous-agents spécialisés ;
5. exécuter en série les tâches dépendantes ou touchant les mêmes zones de code ;
6. limiter la concurrence au niveau justifié par la taille du projet et les capacités de l'environnement ;
7. réunir les résultats, résoudre les divergences et faire valider le résultat par un agent ou une passe de revue indépendante ;
8. lancer les tests pertinents avant de déclarer la tâche terminée.

La création d'un sous-agent doit être justifiée par un gain attendu. Éviter la délégation systématique pour des tâches simples, les agents redondants et les chaînes de délégation sans limite utile.

### 6.2 Catalogue de rôles possibles

Le générateur choisit uniquement les rôles nécessaires. Selon le projet, les rôles candidats peuvent comprendre :

- architecte logiciel et planificateur ;
- spécialiste frontend et expérience utilisateur ;
- spécialiste backend et API ;
- spécialiste base de données ;
- gardien du design system et de l'accessibilité ;
- spécialiste tests/QA ;
- auditeur sécurité ;
- spécialiste CI/CD et déploiement ;
- chercheur technique/documentation ;
- relecteur indépendant.

Le rôle, le périmètre, les accès aux outils, le résultat attendu et les critères de réussite doivent être définis pour chaque sous-agent. Les outils autorisés doivent être le minimum nécessaire. Un agent de revue ne doit pas modifier silencieusement le code qu'il audite.

### 6.3 Modèles et niveau d'effort

Le générateur doit **séparer** trois notions :

1. le tier de modèle demandé au sous-agent, selon les valeurs natives effectivement supportées ;
2. le niveau d'effort de raisonnement (low, medium, high ou libellés officiels actuels) ;
3. la recommandation de qualité/coût liée à la tâche.

Pour les configurations de sous-agents Antigravity, utiliser uniquement les valeurs de champ de modèle confirmées par le schéma officiel au moment de la génération — par exemple `inherit`, `flash` ou `pro` si ces valeurs sont toujours documentées. Ne pas écrire de noms de modèles périmés ou non disponibles dans les fichiers générés.

Politique par défaut :

- **Tier rapide / Flash** : exploration ciblée, documentation simple, petites transformations localisées et tâches bien définies ;
- **Tier avancé / Pro** : conception d'architecture, arbitrages complexes, debugging difficile, revue sécurité et tâches à fort impact ;
- **Héritage / Inherit** : lorsque la disponibilité du modèle ou la compatibilité de l'environnement n'est pas certaine.

Le niveau d'effort doit être conseillé selon la difficulté, le risque et l'incertitude : faible pour un travail simple et réversible, moyen pour un travail normal, élevé pour les tâches complexes ou critiques. Cependant, le générateur ne doit déclarer que ce qu'Antigravity permet réellement de configurer. Si l'effort ne peut pas être assigné indépendamment à chaque tâche ou sous-agent par un fichier de configuration, l'enregistrer comme **politique d'orchestration et recommandation**, et non comme paramètre techniquement imposé. L'application doit rendre cette distinction visible.

### 6.4 Politique de qualité

Le harnais généré doit demander à l'agent principal de travailler selon un cycle proportionné : comprendre et planifier, implémenter par étapes, tester, revoir avec un regard indépendant, corriger, vérifier et documenter. Les tests et contrôles doivent être définis par fonctionnalité et pas seulement à la fin du projet.

---

## 7. Exigences fonctionnelles détaillées

### FR-01 — Gestion des projets

Créer, nommer, consulter, dupliquer, archiver et supprimer un projet de génération. Chaque génération doit être historisée avec son statut : en attente, en cours, terminée, partiellement échouée ou échouée.

### FR-02 — Import et extraction

Extraire les contenus textuels des formats supportés. Pour les images, utiliser l'analyse visuelle si le fournisseur configuré le permet ; sinon demander un complément ou signaler précisément la limite. Gérer les fichiers corrompus, incomplets, trop volumineux ou sans texte utile.

### FR-03 — Profil normalisé

Produire un profil structuré et validable. L'extraction doit utiliser des schémas typés et être validée côté serveur. Toute donnée incertaine doit garder un lien vers la source lorsque cela est possible.

### FR-04 — Synchronisation ECC

Synchroniser le catalogue officiellement, afficher la version utilisée et continuer à fonctionner sur le dernier index valide en cas d'indisponibilité temporaire de GitHub. Une synchronisation incomplète ne doit jamais remplacer un catalogue valide.

### FR-05 — Sélection explicable

Retourner des candidats triés, leurs justifications, leur compatibilité, leurs dépendances et leurs sources. Éliminer les doublons et les composants incompatibles. Proposer de nouveaux fichiers sur mesure lorsque le catalogue n'apporte pas de composant satisfaisant ; les distinguer des composants ECC.

### FR-06 — Génération structurée

Générer tous les fichiers via un pipeline ordonné : profil validé, recherche de composants, plan de harnais, rédaction des fichiers, vérification des liens et frontmatters, construction du paquet, contrôle final. Utiliser des schémas structurés et des validations côté serveur plutôt que de se fier à une réponse libre unique du modèle.

### FR-07 — Prévisualisation

Permettre la lecture des fichiers principaux, le parcours de l'arborescence, l'inclusion/exclusion des composants et la consultation des avertissements avant export.

### FR-08 — Export

Créer un ZIP sûr contenant uniquement les fichiers prévus, sans secrets ni fichiers système accidentels. Autoriser le téléchargement du ZIP et du `START_HERE.md` séparément. Générer un rapport récapitulatif et conserver l'empreinte du paquet.

### FR-09 — Contrôles de compatibilité

Valider les chemins, le format des métadonnées YAML, la présence des fichiers `SKILL.md`, l'existence des références de skills, les outils autorisés, les noms de fichiers et la cohérence du manifeste. Si un contrôle ne peut pas être effectué automatiquement, le préciser comme tel.

### FR-10 — Historique et traçabilité

Permettre de retrouver les entrées, le profil confirmé, la version ECC, la sélection, les fichiers générés et le rapport de validation associés à une génération. Les secrets et les contenus confidentiels ne doivent pas apparaître dans les journaux techniques.

---

## 8. Exigences non fonctionnelles

### 8.0 Justification et statut des choix techniques

La stack retenue vise à limiter la complexité opérationnelle tout en conservant un socle maintenable pour une application web qui combine interface, logique métier, traitement documentaire, intégration ECC et appels à des modèles d’IA.

**Socle de référence :**

- **Next.js avec App Router :** regrouper l’interface web et les endpoints serveur dans un même projet, sans imposer deux applications distinctes dès la V1. Les traitements longs ne doivent toutefois pas dépendre de la durée de vie d’une requête HTTP.
- **TypeScript strict :** partager des contrats typés entre les modules et réduire les erreurs de cohérence. Compléter impérativement le typage par une validation à l’exécution des données importées et des réponses de modèles.
- **Tailwind CSS :** accélérer la construction d’une interface cohérente et responsive. Définir en complément des composants réutilisables, des tokens et des règles d’accessibilité ; Tailwind ne constitue pas à lui seul le design system.
- **PostgreSQL :** source de vérité relationnelle pour les comptes, projets, versions, composants ECC, tâches, générations et rapports ; JSONB peut être utilisé pour certaines structures variables lorsque cela est justifié.
- **Docker :** rendre les environnements de build et d’exécution reproductibles.
- **Coolify sur VPS Ubuntu :** simplifier le déploiement et l’exploitation tout en conservant la maîtrise de l’hébergement. Cette décision implique de documenter les sauvegardes, la supervision, les mises à jour de sécurité, la restauration et le retour arrière.

Ces choix sont le **socle de référence**, pas une affirmation que cette combinaison est universellement optimale. Toute modification doit être motivée par un besoin mesuré et documentée dans une décision d’architecture (ADR).

**Choix volontairement différés jusqu’au jalon 0 :** ORM et outil de migration, bibliothèque de composants UI, fournisseur LLM initial, méthode d’indexation/recherche ECC, stockage des documents, mécanisme de file de tâches et éventuel cache partagé. Évaluer les options pertinentes, en choisir une par responsabilité et consigner la décision ainsi que ses compromis. Zod, Prisma, Drizzle, Vitest et Playwright sont des candidats possibles, pas des dépendances imposées d’avance.

**Principe de sobriété :** ne pas introduire Redis, un service Python séparé, une architecture microservices ou une plateforme externe de traitement sans exigence démontrée. Privilégier un monolithe modulaire pour la V1, avec des frontières permettant d’extraire ultérieurement les workers si la charge ou la fiabilité attendue le justifie.

### 8.1 Qualité logicielle

- Next.js avec App Router et version stable au moment de l'implémentation.
- TypeScript en mode strict, sans `any` non justifié et sans désactivation globale des vérifications.
- Tailwind CSS et composants réutilisables cohérents.
- Validation d'entrée et de sortie côté serveur avec des schémas typés, par exemple Zod.
- Architecture par domaines fonctionnels, séparation claire de l'interface, de la logique métier, des adaptateurs LLM, des sources ECC et de la génération de fichiers.
- Gestion structurée des erreurs, des tentatives, des délais et des états de traitement.
- Aucune dépendance supplémentaire sans justification ; versions verrouillées et mises à jour contrôlées.
- Tests unitaires, d'intégration et de parcours critique exécutables dans la CI ou dans un script de validation documenté.

### 8.2 Architecture de données

PostgreSQL est la source de vérité pour les utilisateurs, projets, documents et métadonnées, profils confirmés, synchronisations ECC, sélections, générations, rapports et états de traitement.

Le stockage des documents doit être privé et inaccessible par URL publique. Les opérations longues (synchronisation ECC, analyse documentaire, génération et évaluation) doivent être exécutées comme des tâches persistantes, et non dépendre de la durée de vie d’une requête web. Pour la V1, privilégier un mécanisme de tâches adossé à PostgreSQL ou une solution équivalente explicitement justifiée. Il doit prendre en charge les états, les tentatives bornées, les délais, la reprise après redémarrage, l’idempotence lorsque possible et la consultation de progression. Ne pas ajouter Redis par défaut sans besoin démontré. Si une solution adossée à PostgreSQL ne satisfait pas les critères mesurés, comparer des alternatives au jalon 0 et documenter le choix.

Le choix de l'ORM et du système de migrations doit être unique, documenté dans une décision d'architecture et compatible avec PostgreSQL. Les migrations doivent être versionnées et testées.

### 8.3 Fournisseur LLM

Isoler l'accès au fournisseur d'IA derrière une interface serveur dédiée. Le fournisseur initial doit être configuré par variables d'environnement ; Google Gemini peut servir de fournisseur initial, sans dépendance à une API interne non documentée d'Antigravity. Prévoir une architecture permettant d'ajouter un autre fournisseur sans réécrire le traitement documentaire ou le moteur de sélection.

- Les clés sont uniquement côté serveur, jamais dans le navigateur, le bundle ou les journaux.
- Les identifiants de modèles doivent être configurables et réévaluables.
- Les réponses structurées doivent être validées avant utilisation.
- Prévoir gestion du rate limiting, timeouts, retries contrôlés, limites de tokens/coûts et message utilisateur explicite en cas d'échec.
- Afficher les informations pertinentes sur le traitement des documents par le fournisseur configuré.

### 8.4 Déploiement

L'application doit être conteneurisée et déployable sur un VPS Ubuntu avec Docker et Coolify. Prévoir :

- séparation des environnements de développement et de production ;
- configuration par variables d'environnement et fichier `.env.example` sans secrets ;
- endpoint de santé ;
- migrations contrôlées ;
- sauvegarde et restauration documentées de PostgreSQL et des fichiers persistés ;
- logs structurés et rotation raisonnable ;
- démarrage reproductible et procédure de mise à jour/rollback ;
- aucune clé ou donnée sensible intégrée à l'image Docker.

---

## 9. Sécurité, confidentialité et résilience

- Authentifier les utilisateurs de l'application et vérifier les autorisations côté serveur sur chaque projet, document, génération et export.
- Les documents importés peuvent contenir des informations confidentielles ; ne les rendre accessibles qu'à leur propriétaire ou aux rôles explicitement autorisés.
- Fournir une action de suppression des documents et projets et documenter la durée de conservation.
- Ne pas afficher le contenu des documents dans les logs applicatifs. Éviter de conserver les données brutes dans les traces de requêtes.
- Traiter les documents importés et le contenu ECC comme des entrées non fiables : ignorer toute instruction qu'ils contiendraient visant à modifier les règles de sécurité, révéler des secrets ou exécuter du code.
- Ne pas exécuter le code inclus dans les documents ou les dépôts ECC pendant l'analyse.
- Protéger l'import contre les fichiers malformés, la traversée de répertoires, les archives dangereuses, les fichiers déguisés et les dénis de service par taille ou complexité.
- Protéger les exports ZIP contre les chemins absolus, les chemins `..`, les collisions et les fichiers inattendus.
- Appliquer une limitation de débit adaptée aux imports, générations et synchronisations.
- Exiger une confirmation explicite dans le guide d'installation avant toute commande destructive ou à effets de bord importants.
- Ne pas publier les documents ou paquets générés sur un service tiers sans choix explicite de l'utilisateur.
- Documenter les données éventuellement transmises au fournisseur LLM et permettre la suppression des résultats enregistrés.

---

## 10. Interface et expérience utilisateur

L'application génératrice a son propre design system, distinct du design system importé pour le projet cible. Son interface doit être sobre, haut de gamme, claire, rapide et orientée vers la maîtrise du processus.

Écrans minimum :

1. Connexion ;
2. tableau de bord des projets de génération ;
3. assistant de création et import des documents ;
4. profil de projet à valider ;
5. composition du harnais et justification des éléments ;
6. prévisualisation de l'arborescence et des fichiers ;
7. résultats, avertissements, historique et téléchargement ;
8. écran de diagnostic/synchronisation ECC, réservé à l'administration si nécessaire.

Exigences UX :

- afficher clairement l'étape courante et les étapes restantes ;
- permettre de revenir aux étapes précédentes sans perdre les corrections ;
- différencier erreurs bloquantes, avertissements et recommandations ;
- donner des explications lisibles plutôt que des scores opaques ;
- rendre les états de chargement et les traitements asynchrones compréhensibles ;
- fournir des états vides, erreurs réseau, reprise et relance ;
- assurer le fonctionnement sur ordinateur et tablette, avec une interface exploitable sur smartphone ;
- respecter les critères d'accessibilité pertinents (navigation clavier, labels, contrastes, états de focus et messages d'erreur).

Ne pas appliquer automatiquement le design system du projet cible à l'application génératrice : celui-ci appartient au livrable destiné au projet cible.

---

## 11. Tests et critères d'acceptation

La livraison n'est acceptée que si les critères ci-dessous sont vérifiés.

### 11.1 Documents et profil

- Le système accepte les formats officiellement annoncés et rejette clairement les formats invalides.
- L'utilisateur peut visualiser et corriger le profil extrait avant la génération.
- Les hypothèses, contradictions et informations inconnues sont identifiées sans être présentées comme des faits certains.
- Un échec de parsing est explicite et ne génère pas silencieusement un profil vide.

### 11.2 Catalogue ECC

- Chaque composant sélectionné possède une provenance traçable.
- Le paquet conserve la version exacte du catalogue ou le commit ECC utilisé.
- Les composants non compatibles sont exclus ou marqués comme non disponibles, avec une explication.
- Une défaillance temporaire de la source distante ne détruit pas le dernier index valide.
- Le choix est justifiable et ne reproduit pas systématiquement tous les composants ECC.

### 11.3 Harnais

- Les fichiers natifs ont les bons chemins et les formats conformes à la documentation Antigravity prise en charge.
- Les fichiers agents contiennent des métadonnées valides et uniquement des valeurs de configuration vérifiées.
- Chaque skill possède son `SKILL.md` valide et les références croisées sont résolues.
- Le guide `START_HERE.md` donne des instructions ordonnées, préserve les fichiers existants et impose les validations nécessaires.
- Le manifeste correspond aux fichiers réellement présents dans le ZIP.
- Les scripts, s'il y en a, sont optionnels, audités, documentés et non exécutés pendant la génération.

### 11.4 Export et sécurité

- L'export peut être décompressé avec un outil ZIP standard.
- Il ne contient ni secret, ni chemin système, ni document qui n'appartient pas au projet exporté.
- Des noms de fichier malveillants ou des chemins traversant les répertoires sont rejetés.
- La suppression d'un projet respecte les règles de suppression définies pour ses documents et générations.
- Un utilisateur ne peut pas consulter les projets ou exports d'un autre utilisateur.

### 11.5 Qualité applicative

- Les tests unitaires, d'intégration et end-to-end critiques passent.
- Le contrôle TypeScript strict, le lint, le build de production et les migrations de base de données sont validés.
- Les erreurs du fournisseur LLM, de GitHub, du stockage ou de la base sont gérées et affichées clairement.
- L'application peut être déployée et redémarrée via Docker/Coolify sans intervention dans l'image pour y ajouter des secrets.
- Une procédure de sauvegarde, de restauration et de mise à jour est documentée.

---

## 12. Données principales à persister

Modèle indicatif, à adapter et documenter avant l'implémentation :

- **User** : compte et préférences ;
- **Project** : projet de génération, propriétaire, surface Antigravity et dates ;
- **SourceDocument** : type, nom sûr, empreinte, statut d'extraction, métadonnées et emplacement privé ;
- **ProjectProfile** : profil extrait et version confirmée ;
- **EccSync** : commit/version, date, résultat, empreinte du catalogue et erreurs ;
- **EccComponent** : type, nom, source, licence, compatibilité, contenu indexé, dépendances et empreinte ;
- **HarnessGeneration** : profil utilisé, paramètres, état, versions sources, sélection, sorties et rapport de contrôle ;
- **GeneratedArtifact** : chemin relatif, type, contenu ou stockage, empreinte et résultat de validation ;
- **Job** : type de traitement, état, tentatives, erreurs sans données confidentielles et horodatages.

Les noms de modèles de données ci-dessus sont des noms fonctionnels, pas une obligation de reprendre littéralement ces noms en code. Les migrations et relations doivent être documentées.

---

## 13. Architecture applicative proposée

L'application doit rester modulaire. Séparer au minimum les domaines suivants :

1. **Documents** : import sécurisé, extraction, normalisation et liens vers les sources ;
2. **Profil de projet** : structuration, validation et édition du profil ;
3. **ECC Catalog** : synchronisation, indexation, provenance et cache ;
4. **Selection Engine** : filtrage, classement, compatibilité et déduplication ;
5. **LLM Gateway** : abstraction fournisseur, sorties structurées, validation et contrôle d'usage ;
6. **Harness Builder** : génération des règles, agents, skills, documentation et manifeste ;
7. **Antigravity Adapter** : chemins, schémas, capacités et validations propres à la surface cible ;
8. **Package Exporter** : assemblage ZIP sûr, empreintes et rapports ;
9. **UI et gestion des projets** : parcours, états et historique ;
10. **Jobs et observabilité** : traitements en arrière-plan, reprise, erreurs et suivi ; mécanisme initial simple, persistant et compatible avec le déploiement Coolify.

Créer des décisions d’architecture (ADR) pour les choix structurants, notamment le fournisseur LLM, l’ORM et les migrations, la bibliothèque UI, la méthode d’indexation ECC, la file de traitement et le stockage des documents. Chaque ADR doit inclure le besoin, les options considérées, les critères, la décision, les compromis, le coût opérationnel et les conditions qui justifieraient de revoir la décision. Ne pas introduire plusieurs technologies concurrentes pour une même responsabilité.

### 13.1 Principes de déploiement et d’exécution

- Commencer par un **monolithe modulaire** : application Next.js, PostgreSQL et stockage privé des fichiers ; ajouter un processus worker distinct uniquement si le traitement asynchrone retenu ou les contraintes d’exploitation le nécessitent.
- Ne pas exécuter de tâches lourdes ou non bornées dans le cycle de vie d’une requête HTTP. L’interface doit pouvoir afficher l’état d’une tâche et récupérer son résultat après déconnexion/reconnexion.
- Prévoir des limites configurables de taille de fichier, de durée, de concurrence, de tentatives et de coût LLM.
- Séparer les secrets et configurations par environnement. Les secrets ne doivent être ni intégrés à l’image Docker ni versionnés.
- Documenter les dépendances persistantes, l’ordre de démarrage, les migrations, les sauvegardes et la restauration complète.
- L’architecture doit permettre, sans refonte du domaine métier, d’extraire ultérieurement le traitement documentaire ou la génération dans un worker dédié si les mesures le justifient.

---

## 14. Méthode de développement exigée d'Antigravity

Antigravity doit être dirigé par le présent cahier des charges et les règles du dépôt. Il ne doit pas commencer par générer l'intégralité du code en une seule passe.

### Phase A — Analyse et conception

- vérifier les exigences et identifier les ambiguïtés restantes ;
- proposer l'architecture et le modèle de données ;
- établir les ADR ;
- découper le travail en lots et identifier les dépendances ;
- définir les contrats, schémas et critères de validation.

### Phase B — Socle technique

- initialiser l'application et les outils de qualité ;
- mettre en place l'authentification, la base, les migrations et les variables d'environnement ;
- configurer les tests, le lint, TypeScript strict, le build et Docker ;
- vérifier que le socle passe les contrôles avant de continuer.

### Phase C — Vertical slices

Développer par parcours de bout en bout : import et profil, catalogue ECC, sélection, génération, validation, export et historique. Chaque lot doit inclure ses tests et une démonstration vérifiable.

### Phase D — Durcissement

- revoir sécurité, confidentialité et permissions ;
- tester les fichiers malformés et les erreurs réseau ;
- vérifier la compatibilité Antigravity des artefacts générés ;
- valider l'export, la restauration, l'idempotence et le déploiement.

### Phase E — Livraison

Fournir un résumé de ce qui a été livré, les décisions prises, les tests exécutés avec leurs résultats réels, les limites connues et les étapes de déploiement. Ne jamais déclarer un test passé s'il n'a pas effectivement été exécuté.

---

## 15. Priorités de mise en œuvre

### Priorité P0 — Indispensable pour la V1

- import du cahier des charges et du design system ;
- extraction et édition du profil ;
- catalogue ECC versionné, synchronisé depuis la source officielle ;
- classement explicable et sélection manuelle ;
- production des fichiers natifs Antigravity ;
- vérification des formats et références ;
- export ZIP avec `START_HERE.md`, manifeste et rapport ;
- authentification, isolation des projets et protection des fichiers ;
- tests, build reproductible et déploiement Docker/Coolify.

### Priorité P1 — À ajouter après validation de la V1

- variantes de génération minimale/équilibrée/approfondie ;
- évaluation comparative de plusieurs compositions du harnais ;
- synchronisation planifiée et interface d'administration ECC ;
- comparaison entre deux générations ;
- bibliothèque de profils réutilisables et modèles de contraintes ;
- export dans d'autres formats ou adaptateurs après validation de la cible.

### Priorité P2 — Évolutions possibles

- import structuré depuis Figma ou d'autres sources de design system ;
- connecteurs privés GitHub avec autorisation explicite ;
- catalogue de composants internes maintenu par l'utilisateur ;
- suivi de l'évolution des capacités Antigravity et alertes de compatibilité ;
- mesure empirique de la qualité des harnais à partir de tests et retours d'usage.

---

## 15.1 Stratégie de livraison progressive — exigence prioritaire

Le développement doit être organisé en jalons validables. Il est interdit de construire toute l'application en une seule passe ou de considérer l'interface comme prioritaire sur la fiabilité du moteur de génération. Chaque jalon doit être démontrable, testé et accepté avant que le suivant ne devienne le chantier principal.

### Jalon 0 — Vérification des hypothèses techniques

Avant le développement fonctionnel, Antigravity doit vérifier la documentation actuelle d'Antigravity et d'ECC, confirmer les chemins natifs, les schémas d'agents, les formats de skills, les paramètres de modèle réellement disponibles et les conditions de licence. Les résultats sont consignés dans des ADR datés. Toute capacité non vérifiée doit être marquée « non confirmée » et ne doit pas être présentée comme garantie.

**Critère de sortie :** une matrice de compatibilité versionnée et une preuve minimale de validation de chaque format cible retenu.

### Jalon 1 — Moteur déterministe de paquet, sans LLM

Construire d'abord le cœur qui prend un profil de projet structuré et une sélection de composants déjà connue, puis produit un paquet ZIP valide. Ajouter les validations de chemin, de manifeste, de frontmatter, de références et d'intégrité. Les modèles de fichiers doivent être testables sans appel à un fournisseur d'IA.

**Critères de sortie :** ZIP décompressable, manifeste cohérent, chemins sûrs, tests de validation passants et génération reproductible à entrées identiques, à l'exception des métadonnées explicitement variables.

### Jalon 2 — Catalogue ECC et adaptateur Antigravity

Mettre en place la synchronisation versionnée, le cache, la provenance et l'adaptateur de compatibilité. Tester le comportement sur les erreurs réseau, les limites d'API et les changements de structure du dépôt. Le catalogue ne doit pas être remplacé par une synchronisation partielle ou invalide.

**Critères de sortie :** chaque composant indexé dispose d'une provenance et d'une empreinte ; chaque composant exporté est associé à une décision de compatibilité ; les erreurs de synchronisation sont visibles et n'effacent pas la dernière version valide.

### Jalon 3 — Profil documentaire structuré

Ajouter l'import, l'extraction et l'analyse assistée par LLM après avoir défini un schéma de profil strict. Chaque champ extrait doit, lorsque possible, être associé à une référence au document source et être classé comme explicite, déduit, hypothèse ou inconnu. L'utilisateur doit pouvoir corriger le profil avant toute sélection de composants.

**Critères de sortie :** les erreurs d'extraction sont explicites, le profil peut être modifié et les hypothèses ne sont jamais présentées comme des faits confirmés.

### Jalon 4 — Sélection explicable et orchestration

Construire le moteur de sélection en séparant les filtres bloquants de compatibilité, le classement de pertinence et les arbitrages éditables par l'utilisateur. Les recommandations d'agents, skills, modèles et efforts doivent inclure une justification lisible et un statut de faisabilité technique.

**Critères de sortie :** pour chaque composant retenu, l'application peut expliquer son utilité, sa source, ses dépendances, ses coûts/risques et pourquoi des candidats proches ont été écartés.

### Jalon 5 — Interface complète et déploiement

Finaliser l'expérience utilisateur autour des moteurs éprouvés, puis mettre en place authentification, persistance, historique, observabilité, déploiement et procédures de restauration.

**Critères de sortie :** parcours complet exécuté dans l'environnement de préproduction, tests critiques réussis et procédure de déploiement/restauration suivie avec succès.

## 15.2 Évaluation objective de la qualité des générations

Créer un jeu de tests de référence (« golden dataset ») contenant plusieurs profils représentatifs : application CRUD simple, SaaS multi-rôles, application avec design system riche, projet avec exigences de sécurité fortes et projet documentaire incomplet ou contradictoire. Les exemples ne doivent contenir aucune donnée personnelle réelle.

Pour chaque cas, conserver un profil attendu, les composants obligatoires/interdits, les points d'incertitude à détecter et les critères d'évaluation. Les résultats générés doivent être évalués automatiquement et/ou par revue humaine selon les critères suivants :

- **Compatibilité :** aucun composant déclaré compatible sans preuve ou règle de validation correspondante ;
- **Pertinence :** les composants essentiels sont proposés et les composants inutiles ou redondants sont écartés ;
- **Traçabilité :** chaque composant externe retenu renvoie à une source versionnée ;
- **Cohérence :** aucun conflit majeur entre instructions, règles, agents et skills ;
- **Sécurité :** aucun secret, script exécuté automatiquement ou chemin dangereux dans l'export ;
- **Utilisabilité :** le `START_HERE.md` permet de comprendre l'installation, les vérifications et les limites ;
- **Reproductibilité :** les mêmes entrées, versions et options produisent une structure fonctionnellement équivalente.

Ne pas optimiser uniquement une note globale : un échec de sécurité ou de compatibilité critique doit bloquer la génération, même si les autres scores sont bons. Enregistrer les résultats par version du générateur afin de détecter toute régression.

## 15.3 Politique de génération et de coût

- Utiliser des sorties structurées validées pour les décisions intermédiaires ; ne pas demander à un unique appel LLM de produire directement l'ensemble du ZIP final sans étapes de contrôle.
- Séparer l'analyse documentaire, la recherche ECC, la sélection, la rédaction et la validation.
- Réutiliser les résultats d'extraction et de catalogue en cache lorsque les empreintes des entrées n'ont pas changé.
- Limiter les reprises automatiques ; toute reprise doit être bornée, observable et idempotente.
- Afficher les erreurs et les limites de traitement sans exposer les prompts internes, les clés ou les données confidentielles.
- Permettre à l'utilisateur de relancer une étape isolée sans refaire toute la génération si ses dépendances sont inchangées.

## 15.4 Matrice de validation des capacités Antigravity

Maintenir un adaptateur versionné et une matrice explicite indiquant, pour chaque capacité : surface concernée, version/documentation de référence, format attendu, validateur utilisé, date de vérification et statut (`confirmé`, `partiel`, `non confirmé`, `indisponible`). Cette matrice couvre au minimum les règles, skills, agents personnalisés, métadonnées YAML, valeurs de modèle, paramètres d'effort, appels d'outils et conventions de chargement.

La génération doit appliquer trois niveaux de résultat :

1. **Validé automatiquement :** une règle ou un validateur confirme le format et la compatibilité connus ;
2. **Compatible selon documentation :** la structure correspond à une documentation officielle, mais aucun test d'exécution direct n'a été possible ;
3. **Non vérifié :** l'application ne peut pas garantir que la fonctionnalité sera prise en charge dans l'environnement de l'utilisateur.

Le rapport doit distinguer validation syntaxique, validation documentaire et validation d'exécution. Aucun de ces statuts ne doit être confondu avec une garantie universelle de fonctionnement.

## 16. Définition de « terminé »

La V1 est considérée comme livrée uniquement lorsque :

- le parcours complet, de l'import à l'export, fonctionne dans l'environnement déployé ;
- les fichiers générés sont natifs, cohérents et reliés à une version ECC identifiable ;
- les hypothèses, sources et limites de compatibilité sont visibles ;
- le paquet contient un guide de démarrage exploitable par Antigravity ;
- les contrôles automatiques et les tests critiques passent réellement ;
- la sécurité des documents, des projets, des secrets et des exports a été vérifiée ;
- la procédure de déploiement, de mise à jour et de sauvegarde est documentée ;
- aucune fonctionnalité principale ne dépend d'un modèle ou d'un comportement non documenté présenté comme garanti.
- le jeu de tests de référence est exécuté et les régressions critiques de compatibilité, sécurité et cohérence bloquent la livraison ;
- la matrice de compatibilité Antigravity est datée et les capacités non vérifiées sont explicitement signalées ;
- chaque jalon de développement a des critères de sortie documentés et les résultats réels sont consignés.

---

## 17. Références techniques à vérifier au moment de la génération

- ECC — dépôt officiel : https://github.com/affaan-m/ECC
- ECC — guide d'installation Antigravity : https://github.com/affaan-m/ECC/blob/main/docs/ANTIGRAVITY-GUIDE.md
- Documentation Antigravity — skills : https://antigravity.google/docs/skills
- Documentation Antigravity — règles : https://antigravity.google/docs/rules/
- Documentation Antigravity — sous-agents : https://antigravity.google/docs/subagents/
- Documentation Antigravity — modèles et effort de raisonnement : https://antigravity.google/docs/models/
- Documentation Antigravity — workflows et migration vers les skills : https://www.antigravity.google/docs/ide/workflows/

**Règle de maintenance :** ces références doivent être consultées ou vérifiées à chaque mise à jour importante de l'adaptateur Antigravity. Le générateur doit préférer le schéma et les fonctionnalités réellement documentés à toute supposition fondée sur une ancienne version.
