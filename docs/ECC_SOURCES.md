# Provenance des Composants et Licences (ECC)

**Dépôt officiel de référence :** [https://github.com/affaan-m/ECC](https://github.com/affaan-m/ECC)  
**Version / Tag synchronisé :** `affaan-m/ECC@b38be6a`  
**Commit SHA exact :** `b38be6a7f6350964d59328b52f0624e1d1d552d1`

---

## 1. Traçabilité des Composants du Harnais (§4.5)

Le tableau ci-dessous distingue explicitement :
- `ecc_verbatim` : composant issu d'ECC utilisé tel quel ;
- `ecc_adapted` : composant issu d'ECC adapté pour la compatibilité native Google Antigravity et le projet ;
- `project_custom` : composant généré spécifiquement pour le projet cible.

| Type | Chemin dans le paquet | Statut d'origine | Source & commit | Raison de sélection | Adaptations appliquées |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Règle | `.agents/rules/model-effort-governance.md` | `project_custom` | Généré sur mesure pour le projet | Gouvernance centralisée du couple Modèle / Niveau d'effort (remplace toute référence au modèle dans le frontmatter YAML des agents). | Créé spécifiquement pour le projet cible |
| Règle | `.agents/rules/api-security-guards.md` | `project_custom` | Composant curated écrit pour Antigravity Harness Builder (texte original ; inspiration : [https://github.com/OWASP/CheatSheetSeries](https://github.com/OWASP/CheatSheetSeries)) | Fonction « rule:pack:security » (source curated). Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, zero-trust, api. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Synergie d'écosystème renforcée avec la stack et les outils du projet. Convertie de « glob » en « model_decision » : le déclenchement par fichier n'est pas fiable (voir docs/AUTO_TEST_RESULTATS.md). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/common-code-review.md` | `ecc_adapted` | [rules/common/code-review.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/common/code-review.md) (`b38be6a7`) | Fonction « rule:common:code-review » (source ecc-official). Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, sql, api. Règle transverse fondamentale de qualité logicielle. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). (chargée à la demande : budget de contexte permanent de 8000 octets) | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/common-security.md` | `ecc_adapted` | [rules/common/security.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/common/security.md) (`b38be6a7`) | Fonction « rule:common:security » (source ecc-official). Mots-clés pertinents détectés : sql, api, security_focus, pack:security-hardened. Répond aux contraintes d'architecture ou de sécurité spécifiées. Règle transverse fondamentale de qualité logicielle. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/common-testing.md` | `ecc_adapted` | [rules/common/testing.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/common/testing.md) (`b38be6a7`) | Fonction « rule:common:testing » (source ecc-official). Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, tdd, api, testing_focus. Répond aux contraintes d'architecture ou de sécurité spécifiées. Règle transverse fondamentale de qualité logicielle. Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/react-patterns.md` | `ecc_adapted` | [rules/react/patterns.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/react/patterns.md) (`b38be6a7`) | Fonction « rule:stack:react:patterns » (source ecc-official). Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, framework:react, framework:nextjs. Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). Convertie de « glob » en « model_decision » : le déclenchement par fichier n'est pas fiable (voir docs/AUTO_TEST_RESULTATS.md). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/react-security.md` | `ecc_adapted` | [rules/react/security.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/react/security.md) (`b38be6a7`) | Fonction « rule:stack:react:security » (source ecc-official). Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, framework:react, framework:nextjs. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Synergie d'écosystème renforcée avec la stack et les outils du projet. Convertie de « glob » en « model_decision » : le déclenchement par fichier n'est pas fiable (voir docs/AUTO_TEST_RESULTATS.md). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/react-testing.md` | `ecc_adapted` | [rules/react/testing.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/react/testing.md) (`b38be6a7`) | Fonction « rule:stack:react:testing » (source ecc-official). Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, framework:react, framework:nextjs. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). Synergie d'écosystème renforcée avec la stack et les outils du projet. Convertie de « glob » en « model_decision » : le déclenchement par fichier n'est pas fiable (voir docs/AUTO_TEST_RESULTATS.md). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/typescript-security.md` | `ecc_adapted` | [rules/typescript/security.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/typescript/security.md) (`b38be6a7`) | Fonction « rule:stack:typescript:security » (source ecc-official). Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, api, security_focus. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Synergie d'écosystème renforcée avec la stack et les outils du projet. Convertie de « glob » en « model_decision » : le déclenchement par fichier n'est pas fiable (voir docs/AUTO_TEST_RESULTATS.md). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/typescript-testing.md` | `ecc_adapted` | [rules/typescript/testing.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/typescript/testing.md) (`b38be6a7`) | Fonction « rule:stack:typescript:testing » (source ecc-official). Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, testing_focus, pack:extreme-tdd-anti-bug. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). Synergie d'écosystème renforcée avec la stack et les outils du projet. Convertie de « glob » en « model_decision » : le déclenchement par fichier n'est pas fiable (voir docs/AUTO_TEST_RESULTATS.md). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/ui-craft-and-5-states.md` | `project_custom` | Composant curated écrit pour Antigravity Harness Builder (texte original ; inspiration : [https://github.com/emilkowalski/skills](https://github.com/emilkowalski/skills)) | Fonction « rule:pack:ui-craft » (source curated). Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, design_engineering_excellence, pack:design-craft-polish. Répond aux contraintes d'architecture ou de sécurité spécifiées. Règle transverse fondamentale de qualité logicielle. Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). Synergie d'écosystème renforcée avec la stack et les outils du projet. Convertie de « glob » en « model_decision » : le déclenchement par fichier n'est pas fiable (voir docs/AUTO_TEST_RESULTATS.md). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/web-security.md` | `ecc_adapted` | [rules/web/security.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/web/security.md) (`b38be6a7`) | Fonction « rule:web:security » (source ecc-official). Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : framework:tailwind, security_focus, pack:security-hardened, bundle:security_synergy. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Synergie d'écosystème renforcée avec la stack et les outils du projet. Convertie de « glob » en « model_decision » : le déclenchement par fichier n'est pas fiable (voir docs/AUTO_TEST_RESULTATS.md). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/web-testing.md` | `ecc_adapted` | [rules/web/testing.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/web/testing.md) (`b38be6a7`) | Fonction « rule:web:testing » (source ecc-official). Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : framework:tailwind, testing_focus, pack:design-craft-polish, pack:extreme-tdd-anti-bug. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). Synergie d'écosystème renforcée avec la stack et les outils du projet. Convertie de « glob » en « model_decision » : le déclenchement par fichier n'est pas fiable (voir docs/AUTO_TEST_RESULTATS.md). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/plan-first-and-anti-omissions.md` | `project_custom` | Composant curated écrit pour Antigravity Harness Builder (texte original ; inspiration : [https://github.com/affaan-m/ECC](https://github.com/affaan-m/ECC)) | Fonction « rule:pack:workflow » (source curated). Mots-clés pertinents détectés : tdd, testing_focus, pack:extreme-tdd-anti-bug, bundle:testing_synergy. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). Synergie d'écosystème renforcée avec la stack et les outils du projet. (chargée à la demande : budget de contexte permanent de 8000 octets) | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/react-coding-style.md` | `ecc_adapted` | [rules/react/coding-style.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/react/coding-style.md) (`b38be6a7`) | Fonction « rule:stack:react:coding-style » (source ecc-official). Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, framework:react, framework:nextjs. Règle transverse fondamentale de qualité logicielle. Convertie de « glob » en « model_decision » : le déclenchement par fichier n'est pas fiable (voir docs/AUTO_TEST_RESULTATS.md). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/common-development-workflow.md` | `ecc_adapted` | [rules/common/development-workflow.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/common/development-workflow.md) (`b38be6a7`) | Fonction « rule:common:development-workflow » (source ecc-official). Mots-clés pertinents détectés : tdd, api, pack:extreme-tdd-anti-bug. Règle transverse fondamentale de qualité logicielle. Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). (chargée à la demande : budget de contexte permanent de 8000 octets) | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/common-git-workflow.md` | `ecc_adapted` | [rules/common/git-workflow.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/common/git-workflow.md) (`b38be6a7`) | Fonction « rule:common:git-workflow » (source ecc-official). Mots-clés pertinents détectés : tdd, pack:extreme-tdd-anti-bug. Règle transverse fondamentale de qualité logicielle. Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/typescript-coding-style.md` | `ecc_adapted` | [rules/typescript/coding-style.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/typescript/coding-style.md) (`b38be6a7`) | Fonction « rule:stack:typescript:coding-style » (source ecc-official). Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, lang:javascript. Règle transverse fondamentale de qualité logicielle. Convertie de « glob » en « model_decision » : le déclenchement par fichier n'est pas fiable (voir docs/AUTO_TEST_RESULTATS.md). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/web-coding-style.md` | `ecc_adapted` | [rules/web/coding-style.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/web/coding-style.md) (`b38be6a7`) | Fonction « rule:web:coding-style » (source ecc-official). Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : framework:tailwind. Règle transverse fondamentale de qualité logicielle. Convertie de « glob » en « model_decision » : le déclenchement par fichier n'est pas fiable (voir docs/AUTO_TEST_RESULTATS.md). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/typescript-patterns.md` | `ecc_adapted` | [rules/typescript/patterns.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/typescript/patterns.md) (`b38be6a7`) | Fonction « rule:stack:typescript:patterns » (source ecc-official). Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, api. Convertie de « glob » en « model_decision » : le déclenchement par fichier n'est pas fiable (voir docs/AUTO_TEST_RESULTATS.md). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/web-patterns.md` | `ecc_adapted` | [rules/web/patterns.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/web/patterns.md) (`b38be6a7`) | Fonction « rule:web:patterns » (source ecc-official). Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : framework:tailwind. Convertie de « glob » en « model_decision » : le déclenchement par fichier n'est pas fiable (voir docs/AUTO_TEST_RESULTATS.md). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/common-coding-style.md` | `ecc_adapted` | [rules/common/coding-style.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/common/coding-style.md) (`b38be6a7`) | Fonction « rule:common:coding-style » (source ecc-official). Mots-clés pertinents détectés : api. Règle transverse fondamentale de qualité logicielle. (chargée à la demande : budget de contexte permanent de 8000 octets) | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/project-drizzle-orm-guidelines.md` | `project_custom` | Généré sur mesure pour le projet | Le catalogue standard ne fournit pas de règle dédiée aux conventions de schéma et migrations Drizzle ORM. Convertie de « glob » en « model_decision » : le déclenchement par fichier n'est pas fiable (voir docs/AUTO_TEST_RESULTATS.md). | Créé spécifiquement pour le projet cible |
| Skill | `.agents/skills/backend-patterns/SKILL.md` | `ecc_adapted` | [skills/backend-patterns/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/backend-patterns/SKILL.md) (`b38be6a7`) | Fonction « skill:backend:patterns » (source ecc-official). Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, framework:nextjs, sql, api. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/deployment-patterns/SKILL.md` | `ecc_adapted` | [skills/deployment-patterns/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/deployment-patterns/SKILL.md) (`b38be6a7`) | Fonction « skill:ops:deployment » (source ecc-official). Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, postgresql, docker, api. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/frontend-patterns/SKILL.md` | `ecc_adapted` | [skills/frontend-patterns/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/frontend-patterns/SKILL.md) (`b38be6a7`) | Fonction « skill:frontend:patterns » (source ecc-official). Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, framework:nextjs, framework:react, api. Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/react-testing/SKILL.md` | `ecc_adapted` | [skills/react-testing/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/react-testing/SKILL.md) (`b38be6a7`) | Fonction « skill:stack:react:testing » (source ecc-official). Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : framework:nextjs, framework:react, vitest, tdd. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/security-review/SKILL.md` | `ecc_adapted` | [skills/security-review/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/security-review/SKILL.md) (`b38be6a7`) | Fonction « skill:security:review » (source ecc-official). Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, framework:nextjs, framework:react, sql. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/tdd-workflow/SKILL.md` | `ecc_adapted` | [skills/tdd-workflow/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/tdd-workflow/SKILL.md) (`b38be6a7`) | Fonction « skill:workflow:tdd » (source ecc-official). Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, framework:react, vitest, tdd. Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/typescript-patterns/SKILL.md` | `ecc_adapted` | [skills/typescript-patterns/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/typescript-patterns/SKILL.md) (`b38be6a7`) | Fonction « skill:stack:typescript:patterns » (source ecc-official). Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, framework:nextjs, framework:react. Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/verification-loop/SKILL.md` | `ecc_adapted` | [skills/verification-loop/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/verification-loop/SKILL.md) (`b38be6a7`) | Fonction « skill:workflow:verification » (source ecc-official). Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, api, pack:security-hardened. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/react-patterns/SKILL.md` | `ecc_adapted` | [skills/react-patterns/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/react-patterns/SKILL.md) (`b38be6a7`) | Fonction « skill:stack:react:patterns » (source ecc-official). Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : framework:nextjs, framework:react, api, pack:security-hardened. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/api-design/SKILL.md` | `ecc_adapted` | [skills/api-design/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/api-design/SKILL.md) (`b38be6a7`) | Fonction « skill:backend:api-design » (source ecc-official). Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, framework:nextjs, sql, api. | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/frontend-a11y/SKILL.md` | `ecc_adapted` | [skills/frontend-a11y/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/frontend-a11y/SKILL.md) (`b38be6a7`) | Fonction « skill:ui:accessibility » (source ecc-official). Préféré à : accessibility. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : framework:nextjs, framework:react, pack:design-craft-polish. Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/database-migrations/SKILL.md` | `ecc_adapted` | [skills/database-migrations/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/database-migrations/SKILL.md) (`b38be6a7`) | Fonction « skill:database:migrations » (source ecc-official). Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, sql, postgresql, database_focus. Répond aux contraintes d'architecture ou de sécurité spécifiées. | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/docker-patterns/SKILL.md` | `ecc_adapted` | [skills/docker-patterns/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/docker-patterns/SKILL.md) (`b38be6a7`) | Fonction « skill:stack:docker:patterns » (source ecc-official). Mots-clés pertinents détectés : sql, postgresql, docker, api. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/postgres-patterns/SKILL.md` | `ecc_adapted` | [skills/postgres-patterns/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/postgres-patterns/SKILL.md) (`b38be6a7`) | Fonction « skill:stack:postgres:patterns » (source ecc-official). Mots-clés pertinents détectés : sql, postgresql, api, pack:security-hardened. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/design-system/SKILL.md` | `ecc_adapted` | [skills/design-system/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/design-system/SKILL.md) (`b38be6a7`) | Fonction « skill:ui:design-system » (source ecc-official). Mots-clés pertinents détectés : pack:design-craft-polish. Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/frontend-design-direction/SKILL.md` | `ecc_adapted` | [skills/frontend-design-direction/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/frontend-design-direction/SKILL.md) (`b38be6a7`) | Fonction « skill:ui:design-engineering » (source ecc-official). Préféré à : make-interfaces-feel-better. Mots-clés pertinents détectés : pack:design-craft-polish. Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). | Adapté vers les standards de compétences Google Antigravity |
| Sous-agent | `.agents/agents/architect.md` | `ecc_adapted` | [agents/architect.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/architect.md) (`b38be6a7`) | Fonction « agent:architect » (source ecc-official). Préféré à : code-architect. Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:javascript, framework:nextjs, agent, postgresql. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers la spécification officielle des sous-agents Antigravity (sans champ model dans le frontmatter YAML) |
| Sous-agent | `.agents/agents/code-reviewer.md` | `ecc_adapted` | [agents/code-reviewer.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/code-reviewer.md) (`b38be6a7`) | Fonction « agent:review:general » (source ecc-official). Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, framework:nextjs, framework:react. Règle transverse fondamentale de qualité logicielle. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). | Adapté vers la spécification officielle des sous-agents Antigravity (sans champ model dans le frontmatter YAML) |
| Sous-agent | `.agents/agents/database-reviewer.md` | `ecc_adapted` | [agents/database-reviewer.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/database-reviewer.md) (`b38be6a7`) | Fonction « agent:database » (source ecc-official). Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:javascript, agent, sql, postgresql. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). | Adapté vers la spécification officielle des sous-agents Antigravity (sans champ model dans le frontmatter YAML) |
| Sous-agent | `.agents/agents/react-reviewer.md` | `ecc_adapted` | [agents/react-reviewer.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/react-reviewer.md) (`b38be6a7`) | Fonction « agent:review:stack » (source ecc-official). Préféré à : typescript-reviewer. Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, framework:nextjs, framework:react. Règle transverse fondamentale de qualité logicielle. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers la spécification officielle des sous-agents Antigravity (sans champ model dans le frontmatter YAML) |
| Sous-agent | `.agents/agents/security-auditor.md` | `project_custom` | Composant curated écrit pour Antigravity Harness Builder (texte original ; inspiration : [https://github.com/OWASP/CheatSheetSeries](https://github.com/OWASP/CheatSheetSeries)) | Fonction « agent:security » (source curated). Préféré à : security-reviewer. Mots-clés pertinents détectés : zero-trust, security_focus, role:security_auditor, pack:security-hardened. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers la spécification officielle des sous-agents Antigravity (sans champ model dans le frontmatter YAML) |
| Sous-agent | `.agents/agents/ui-craft-reviewer.md` | `project_custom` | Composant curated écrit pour Antigravity Harness Builder (texte original ; inspiration : [https://github.com/emilkowalski/skills](https://github.com/emilkowalski/skills)) | Fonction « agent:review:ui » (source curated). Mots-clés pertinents détectés : role:code_reviewer, design_engineering_excellence, pack:design-craft-polish, bundle:ui_craft_synergy. Répond aux contraintes d'architecture ou de sécurité spécifiées. Règle transverse fondamentale de qualité logicielle. Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers la spécification officielle des sous-agents Antigravity (sans champ model dans le frontmatter YAML) |
| Sous-agent | `.agents/agents/react-build-resolver.md` | `ecc_adapted` | [agents/react-build-resolver.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/react-build-resolver.md) (`b38be6a7`) | Fonction « agent:build » (source ecc-official). Préféré à : build-error-resolver. Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, framework:nextjs, framework:react. | Adapté vers la spécification officielle des sous-agents Antigravity (sans champ model dans le frontmatter YAML) |

---

## 2. Principaux Candidats Écartés (Pertinence avant quantité)

- **`brand-voice`** : Module ECC « business-content » : usage métier ou opérationnel, hors développement logiciel.
- **`csharp-coding-style`** : Non applicable : technologie absente du projet (csharp).
- **`java-coding-style`** : Non applicable : technologie absente du projet (java).
- **`kotlin-testing`** : Non applicable : technologie absente du projet (kotlin).
- **`ruby-coding-style`** : Non applicable : technologie absente du projet (ruby).
- **`swift-patterns`** : Non applicable : technologie absente du projet (swift).
- **`flutter-build`** : Technologie spécifique [flutter] non utilisée dans la stack de ce projet.
- **`hookify-help`** : « hookify-help » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`aside`** : « aside » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`astra-review`** : Incompatible avec la stack du projet : composant ciblant [sql] alors que le projet utilise [typescript].
- **`auto-update`** : « auto-update » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`checkpoint`** : « checkpoint » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`cost-report`** : « cost-report » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`cpp-build`** : Technologie spécifique [cpp] non utilisée dans la stack de ce projet.
- **`cpp-review`** : Technologie spécifique [cpp] non utilisée dans la stack de ce projet.
- **`cpp-test`** : Technologie spécifique [cpp] non utilisée dans la stack de ce projet.
- **`evolve`** : « evolve » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`fastapi-review`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`flutter-review`** : Technologie spécifique [flutter] non utilisée dans la stack de ce projet.
- **`flutter-test`** : Technologie spécifique [flutter] non utilisée dans la stack de ce projet.
- **`gan-build`** : Technologie spécifique [gan] non utilisée dans la stack de ce projet.
- **`gan-design`** : Technologie spécifique [gan] non utilisée dans la stack de ce projet.
- **`go-build`** : Incompatible avec la stack du projet : composant ciblant [go] alors que le projet utilise [typescript].
- **`go-review`** : Incompatible avec la stack du projet : composant ciblant [go, sql] alors que le projet utilise [typescript].
- **`go-test`** : Incompatible avec la stack du projet : composant ciblant [go, sql] alors que le projet utilise [typescript].
- **`gradle-build`** : Incompatible avec la stack du projet : composant ciblant [kotlin] alors que le projet utilise [typescript].
- **`harness-audit`** : « harness-audit » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`hookify`** : « hookify » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`hookify-configure`** : « hookify-configure » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`hookify-list`** : « hookify-list » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`instinct-export`** : « instinct-export » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`instinct-import`** : « instinct-import » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`instinct-status`** : « instinct-status » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`kotlin-build`** : Incompatible avec la stack du projet : composant ciblant [kotlin] alors que le projet utilise [typescript].
- **`kotlin-review`** : Incompatible avec la stack du projet : composant ciblant [java, kotlin, sql] alors que le projet utilise [typescript].
- **`kotlin-test`** : Incompatible avec la stack du projet : composant ciblant [kotlin] alors que le projet utilise [typescript].
- **`learn`** : « learn » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`learn-eval`** : « learn-eval » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`loop-start`** : « loop-start » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`loop-status`** : « loop-status » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`model-route`** : « model-route » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`arkts-testing`** : Non applicable : technologie absente du projet (arkts).
- **`project-init`** : « project-init » repose sur des mécanismes propres à Claude Code (6 références : hooks, CLAUDE.md, ~/.claude, /ecc:…).
- **`promote`** : « promote » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`prp-implement`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`cpp-coding-style`** : Non applicable : technologie absente du projet (cpp).
- **`prune`** : « prune » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`python-review`** : Incompatible avec la stack du projet : composant ciblant [python, sql] alors que le projet utilise [typescript].
- **`swift-security`** : Non applicable : technologie absente du projet (swift).
- **`resume-session`** : « resume-session » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`rust-build`** : Incompatible avec la stack du projet : composant ciblant [rust] alors que le projet utilise [typescript].
- **`rust-review`** : Incompatible avec la stack du projet : composant ciblant [rust, sql] alors que le projet utilise [typescript].
- **`rust-test`** : Incompatible avec la stack du projet : composant ciblant [rust] alors que le projet utilise [typescript].
- **`santa-loop`** : Incompatible avec la stack du projet : composant ciblant [rust, sql] alors que le projet utilise [typescript].
- **`save-session`** : « save-session » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`sessions`** : « sessions » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`skill-create`** : « skill-create » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`skill-health`** : « skill-health » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`test-coverage`** : Framework non ciblé : composant prévu pour [vitest] non présent dans la stack [next.js, react, tailwind css].
- **`update-codemaps`** : Incompatible avec la stack du projet : composant ciblant [postgresql] alors que le projet utilise [typescript].
- **`update-docs`** : Incompatible avec la stack du projet : composant ciblant [postgresql] alors que le projet utilise [typescript].
- **`vue-review`** : Technologie spécifique [vue] non utilisée dans la stack de ce projet.
- **`angular-coding-style`** : Non applicable : technologie absente du projet (angular).
- **`angular-hooks`** : « angular-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`angular-patterns`** : Non applicable : technologie absente du projet (angular).
- **`angular-security`** : Non applicable : technologie absente du projet (angular).
- **`angular-testing`** : Non applicable : technologie absente du projet (angular).
- **`arkts-coding-style`** : Non applicable : technologie absente du projet (arkts).
- **`arkts-hooks`** : « arkts-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`arkts-patterns`** : Non applicable : technologie absente du projet (arkts).
- **`arkts-security`** : Non applicable : technologie absente du projet (arkts).
- **`common-agents`** : « common-agents » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`common-hooks`** : « common-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`cpp-hooks`** : « cpp-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`cpp-patterns`** : Non applicable : technologie absente du projet (cpp).
- **`cpp-security`** : Non applicable : technologie absente du projet (cpp).
- **`cpp-testing`** : Non applicable : technologie absente du projet (cpp).
- **`csharp-hooks`** : « csharp-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`csharp-patterns`** : Non applicable : technologie absente du projet (csharp).
- **`csharp-security`** : Non applicable : technologie absente du projet (csharp).
- **`csharp-testing`** : Non applicable : technologie absente du projet (csharp).
- **`dart-coding-style`** : Non applicable : technologie absente du projet (dart / flutter).
- **`dart-hooks`** : « dart-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`dart-patterns`** : Non applicable : technologie absente du projet (dart / flutter).
- **`dart-security`** : Non applicable : technologie absente du projet (dart / flutter).
- **`dart-testing`** : Non applicable : technologie absente du projet (dart / flutter).
- **`fsharp-coding-style`** : Non applicable : technologie absente du projet (fsharp).
- **`java-hooks`** : « java-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`fsharp-hooks`** : « fsharp-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`fsharp-patterns`** : Non applicable : technologie absente du projet (fsharp).
- **`fsharp-security`** : Non applicable : technologie absente du projet (fsharp).
- **`fsharp-testing`** : Non applicable : technologie absente du projet (fsharp).
- **`golang-coding-style`** : Non applicable : technologie absente du projet (go).
- **`java-patterns`** : Non applicable : technologie absente du projet (java).
- **`golang-hooks`** : « golang-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`golang-patterns`** : Non applicable : technologie absente du projet (go).
- **`golang-security`** : Non applicable : technologie absente du projet (go).
- **`golang-testing`** : Non applicable : technologie absente du projet (go).
- **`java-security`** : Non applicable : technologie absente du projet (java).
- **`java-testing`** : Non applicable : technologie absente du projet (java).
- **`kotlin-coding-style`** : Non applicable : technologie absente du projet (kotlin).
- **`kotlin-hooks`** : « kotlin-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`kotlin-patterns`** : Non applicable : technologie absente du projet (kotlin).
- **`kotlin-security`** : Non applicable : technologie absente du projet (kotlin).
- **`nuxt-coding-style`** : Non applicable : technologie absente du projet (nuxt).
- **`nuxt-hooks`** : « nuxt-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`nuxt-patterns`** : Non applicable : technologie absente du projet (nuxt).
- **`nuxt-security`** : Non applicable : technologie absente du projet (nuxt).
- **`nuxt-testing`** : Non applicable : technologie absente du projet (nuxt).
- **`perl-coding-style`** : Non applicable : technologie absente du projet (perl).
- **`perl-hooks`** : « perl-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`perl-patterns`** : Non applicable : technologie absente du projet (perl).
- **`perl-security`** : Non applicable : technologie absente du projet (perl).
- **`perl-testing`** : Non applicable : technologie absente du projet (perl).
- **`php-coding-style`** : Non applicable : technologie absente du projet (php).
- **`swift-testing`** : Non applicable : technologie absente du projet (swift).
- **`php-hooks`** : « php-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`php-patterns`** : Non applicable : technologie absente du projet (php).
- **`php-security`** : Non applicable : technologie absente du projet (php).
- **`php-testing`** : Non applicable : technologie absente du projet (php).
- **`python-coding-style`** : Non applicable : technologie absente du projet (python).
- **`python-fastapi`** : Non applicable : technologie absente du projet (python).
- **`python-hooks`** : « python-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`python-patterns`** : Non applicable : technologie absente du projet (python).
- **`python-security`** : Non applicable : technologie absente du projet (python).
- **`python-testing`** : Non applicable : technologie absente du projet (python).
- **`react-hooks`** : « react-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`react-native-accessibility`** : Non applicable : technologie absente du projet (react-native).
- **`react-native-coding-style`** : Non applicable : technologie absente du projet (react-native).
- **`react-native-hooks`** : « react-native-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`react-native-patterns`** : Non applicable : technologie absente du projet (react-native).
- **`react-native-performance`** : Non applicable : technologie absente du projet (react-native).
- **`react-native-production-readiness`** : Non applicable : technologie absente du projet (react-native).
- **`react-native-security`** : Non applicable : technologie absente du projet (react-native).
- **`react-native-testing`** : Non applicable : technologie absente du projet (react-native).
- **`ruby-hooks`** : « ruby-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`ruby-patterns`** : Non applicable : technologie absente du projet (ruby).
- **`ruby-security`** : Non applicable : technologie absente du projet (ruby).
- **`ruby-testing`** : Non applicable : technologie absente du projet (ruby).
- **`rust-coding-style`** : Non applicable : technologie absente du projet (rust).
- **`rust-hooks`** : « rust-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`rust-patterns`** : Non applicable : technologie absente du projet (rust).
- **`rust-security`** : Non applicable : technologie absente du projet (rust).
- **`rust-testing`** : Non applicable : technologie absente du projet (rust).
- **`swift-coding-style`** : Non applicable : technologie absente du projet (swift).
- **`swift-hooks`** : « swift-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`typescript-hooks`** : « typescript-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`vue-coding-style`** : Non applicable : technologie absente du projet (vue).
- **`vue-hooks`** : « vue-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`vue-patterns`** : Non applicable : technologie absente du projet (vue).
- **`vue-security`** : Non applicable : technologie absente du projet (vue).
- **`vue-testing`** : Non applicable : technologie absente du projet (vue).
- **`angular-developer`** : Non applicable : technologie absente du projet (angular).
- **`web-hooks`** : « web-hooks » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`agent-architecture-audit`** : Non applicable : domaine métier « agents IA / LLM » absent du cahier des charges.
- **`agent-eval`** : Framework non ciblé : composant prévu pour [docker] non présent dans la stack [next.js, react, tailwind css].
- **`agent-payment-x402`** : Le composant 'agent-payment-x402' est spécifique aux micro-paiements crypto/web3 autonomes pour agents et ne convient pas aux applications web de paiement standard ou SEPA.
- **`agent-security-hardening`** : Non applicable : domaine métier « agents IA / LLM » absent du cahier des charges.
- **`agent-sort`** : « agent-sort » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`agentic-os`** : « agentic-os » repose sur des mécanismes propres à Claude Code (23 références : hooks, CLAUDE.md, ~/.claude, /ecc:…).
- **`android-clean-architecture`** : Non applicable : technologie absente du projet (android).
- **`api-connector-builder`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`article-writing`** : Module ECC « business-content » : usage métier ou opérationnel, hors développement logiciel.
- **`automation-audit-ops`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`autonomous-agent-harness`** : « autonomous-agent-harness » repose sur des mécanismes propres à Claude Code (14 références : hooks, CLAUDE.md, ~/.claude, /ecc:…).
- **`autonomous-loops`** : « autonomous-loops » repose sur des mécanismes propres à Claude Code (7 références : hooks, CLAUDE.md, ~/.claude, /ecc:…).
- **`benchmark`** : Framework non ciblé : composant prévu pour [docker] non présent dans la stack [next.js, react, tailwind css].
- **`brand-discovery`** : Module ECC « business-content » : usage métier ou opérationnel, hors développement logiciel.
- **`blender-motion-state-inspection`** : Module ECC « media-generation » : usage métier ou opérationnel, hors développement logiciel.
- **`blueprint`** : Incompatible avec la stack du projet : composant ciblant [postgresql] alors que le projet utilise [typescript].
- **`bun-runtime`** : Non applicable : technologie absente du projet (bun).
- **`carrier-relationship-management`** : Module ECC « supply-chain-domain » : usage métier ou opérationnel, hors développement logiciel.
- **`cisco-ios-patterns`** : Technologie spécifique [ios] non utilisée dans la stack de ce projet.
- **`ck`** : « ck » repose sur des mécanismes propres à Claude Code (11 références : hooks, CLAUDE.md, ~/.claude, /ecc:…).
- **`claude-devfleet`** : « claude-devfleet » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`clickhouse-io`** : Non applicable : technologie absente du projet (clickhouse).
- **`codebase-onboarding`** : « codebase-onboarding » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`competitive-platform-analysis`** : Module ECC « business-content » : usage métier ou opérationnel, hors développement logiciel.
- **`connections-optimizer`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`competitive-report-structure`** : Module ECC « business-content » : usage métier ou opérationnel, hors développement logiciel.
- **`compose-multiplatform-patterns`** : Non applicable : technologie absente du projet (android / kotlin).
- **`config-gc`** : « config-gc » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`configure-ecc`** : « configure-ecc » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`content-engine`** : Module ECC « business-content » : usage métier ou opérationnel, hors développement logiciel.
- **`content-hash-cache-pattern`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`continuous-learning`** : « continuous-learning » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`continuous-learning-v2`** : « continuous-learning-v2 » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`cost-aware-llm-pipeline`** : Non applicable : domaine métier « agents IA / LLM » absent du cahier des charges.
- **`cost-tracking`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`counterparty-channel-discipline`** : Module ECC « operator-desk-patterns » : usage métier ou opérationnel, hors développement logiciel.
- **`cpp-coding-standards`** : Non applicable : technologie absente du projet (cpp).
- **`cpp-testing`** : Non applicable : technologie absente du projet (cpp).
- **`crosspost`** : Module ECC « social-distribution » : usage métier ou opérationnel, hors développement logiciel.
- **`csharp-testing`** : Non applicable : technologie absente du projet (csharp).
- **`customer-billing-ops`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`customs-trade-compliance`** : Module ECC « supply-chain-domain » : usage métier ou opérationnel, hors développement logiciel.
- **`dart-flutter-patterns`** : Non applicable : technologie absente du projet (dart / flutter).
- **`dashboard-builder`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`data-throughput-accelerator`** : Incompatible avec la stack du projet : composant ciblant [sql] alors que le projet utilise [typescript].
- **`deep-research`** : Module ECC « research-apis » : usage métier ou opérationnel, hors développement logiciel.
- **`deepseek-harness-setup`** : « deepseek-harness-setup » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`email-ops`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`defi-amm-security`** : Non applicable : domaine métier « blockchain / crypto » absent du cahier des charges.
- **`delivery-gate`** : « delivery-gate » repose sur des mécanismes propres à Claude Code (7 références : hooks, CLAUDE.md, ~/.claude, /ecc:…).
- **`django-celery`** : Non applicable : technologie absente du projet (django).
- **`django-patterns`** : Non applicable : technologie absente du projet (django).
- **`django-security`** : Non applicable : technologie absente du projet (django).
- **`django-tdd`** : Non applicable : technologie absente du projet (django).
- **`django-verification`** : Non applicable : technologie absente du projet (django).
- **`dmux-workflows`** : « dmux-workflows » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`docs-governance`** : Incompatible avec la stack du projet : composant ciblant [postgresql] alors que le projet utilise [typescript].
- **`documentation-lookup`** : Module ECC « research-apis » : usage métier ou opérationnel, hors développement logiciel.
- **`dotnet-patterns`** : Non applicable : technologie absente du projet (csharp / fsharp).
- **`e2e-testing`** : Non applicable : aucun outil de test de bout en bout (Playwright, Cypress).
- **`ecc-guide`** : « ecc-guide » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`ecc-recipes`** : « ecc-recipes » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`ecc-tools-cost-audit`** : « ecc-tools-cost-audit » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`energy-procurement`** : Module ECC « supply-chain-domain » : usage métier ou opérationnel, hors développement logiciel.
- **`esign-field-placement`** : Module ECC « operator-desk-patterns » : usage métier ou opérationnel, hors développement logiciel.
- **`eval-harness`** : Non applicable : domaine métier « agents IA / LLM » absent du cahier des charges.
- **`evm-token-decimals`** : Non applicable : domaine métier « blockchain / crypto » absent du cahier des charges.
- **`exa-search`** : Module ECC « research-apis » : usage métier ou opérationnel, hors développement logiciel.
- **`fal-ai-media`** : Module ECC « media-generation » : usage métier ou opérationnel, hors développement logiciel.
- **`fastapi-patterns`** : Non applicable : technologie absente du projet (fastapi).
- **`finance-billing-ops`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`master-agreement-generator`** : Module ECC « operator-desk-patterns » : usage métier ou opérationnel, hors développement logiciel.
- **`flox-environments`** : Le composant 'flox-environments' requiert l'outillage Flox non présent dans l'infrastructure du projet.
- **`flutter-dart-code-review`** : Non applicable : technologie absente du projet (flutter).
- **`foundation-models-on-device`** : Incompatible avec la stack du projet : composant ciblant [swift] alors que le projet utilise [typescript].
- **`fsharp-testing`** : Non applicable : technologie absente du projet (fsharp).
- **`gan-style-harness`** : Technologie spécifique [gan] non utilisée dans la stack de ce projet.
- **`gateguard`** : « gateguard » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`generating-python-installer`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`github-ops`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`golang-patterns`** : Non applicable : technologie absente du projet (go).
- **`golang-testing`** : Non applicable : technologie absente du projet (go).
- **`google-workspace-ops`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`healthcare-cdss-patterns`** : Non applicable : domaine métier « santé » absent du cahier des charges.
- **`healthcare-emr-patterns`** : Non applicable : domaine métier « santé » absent du cahier des charges.
- **`healthcare-phi-compliance`** : Non applicable : domaine métier « santé » absent du cahier des charges.
- **`hipaa-compliance`** : Non applicable : domaine métier « santé » absent du cahier des charges.
- **`homelab-pihole-dns`** : Framework non ciblé : composant prévu pour [docker] non présent dans la stack [next.js, react, tailwind css].
- **`hookify-rules`** : « hookify-rules » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`i18n-sync`** : Non applicable : domaine métier « internationalisation » absent du cahier des charges.
- **`inherit-legacy-style`** : « inherit-legacy-style » repose sur des mécanismes propres à Claude Code (11 références : hooks, CLAUDE.md, ~/.claude, /ecc:…).
- **`inventory-demand-planning`** : Module ECC « supply-chain-domain » : usage métier ou opérationnel, hors développement logiciel.
- **`investor-materials`** : Module ECC « business-content » : usage métier ou opérationnel, hors développement logiciel.
- **`investor-outreach`** : Module ECC « business-content » : usage métier ou opérationnel, hors développement logiciel.
- **`ios-icon-gen`** : Incompatible avec la stack du projet : composant ciblant [swift] alors que le projet utilise [typescript].
- **`issue-review`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`iterative-retrieval`** : Non applicable : domaine métier « agents IA / LLM » absent du cahier des charges.
- **`ito-baskets`** : Module ECC « prediction-market-skills » : usage métier ou opérationnel, hors développement logiciel.
- **`ito-compute`** : Module ECC « ito-compute » : usage métier ou opérationnel, hors développement logiciel.
- **`ito-inference`** : Module ECC « ito-compute » : usage métier ou opérationnel, hors développement logiciel.
- **`ito-training`** : Module ECC « ito-compute » : usage métier ou opérationnel, hors développement logiciel.
- **`java-coding-standards`** : Non applicable : technologie absente du projet (java).
- **`jira-integration`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`jpa-patterns`** : Non applicable : technologie absente du projet (jpa / hibernate).
- **`knowledge-ops`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`kotlin-coroutines-flows`** : Non applicable : technologie absente du projet (kotlin).
- **`kotlin-exposed-patterns`** : Non applicable : technologie absente du projet (kotlin).
- **`kotlin-ktor-patterns`** : Non applicable : technologie absente du projet (kotlin).
- **`kotlin-patterns`** : Non applicable : technologie absente du projet (kotlin).
- **`kotlin-testing`** : Non applicable : technologie absente du projet (kotlin).
- **`kubernetes-patterns`** : Non applicable : technologie absente du projet (kubernetes).
- **`laravel-patterns`** : Non applicable : technologie absente du projet (laravel).
- **`laravel-plugin-discovery`** : Non applicable : technologie absente du projet (laravel).
- **`laravel-security`** : Non applicable : technologie absente du projet (laravel).
- **`laravel-tdd`** : Non applicable : technologie absente du projet (laravel).
- **`laravel-verification`** : Non applicable : technologie absente du projet (laravel).
- **`lead-intelligence`** : Module ECC « business-content » : usage métier ou opérationnel, hors développement logiciel.
- **`liquid-glass-design`** : Incompatible avec la stack du projet : composant ciblant [swift] alors que le projet utilise [typescript].
- **`llm-trading-agent-security`** : Non applicable : domaine métier « blockchain / crypto » absent du cahier des charges.
- **`logistics-exception-management`** : Module ECC « supply-chain-domain » : usage métier ou opérationnel, hors développement logiciel.
- **`mailtrap-email-integration`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`manim-video`** : Module ECC « media-generation » : usage métier ou opérationnel, hors développement logiciel.
- **`market-research`** : Module ECC « business-content » : usage métier ou opérationnel, hors développement logiciel.
- **`marketing-campaign`** : Module ECC « business-content » : usage métier ou opérationnel, hors développement logiciel.
- **`mcp-server-patterns`** : Non applicable : domaine métier « serveurs MCP » absent du cahier des charges.
- **`messages-ops`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`ml-adoption-playbook`** : Non applicable : domaine métier « machine learning » absent du cahier des charges.
- **`mle-workflow`** : Non applicable : domaine métier « machine learning » absent du cahier des charges.
- **`module-regression`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`mybatis-patterns`** : Non applicable : technologie absente du projet (mybatis).
- **`mysql-patterns`** : Non applicable : technologie absente du projet (mysql / mariadb).
- **`nasiko-control-plane`** : Module ECC « nasiko-control-plane » : usage métier ou opérationnel, hors développement logiciel.
- **`nestjs-patterns`** : Non applicable : technologie absente du projet (nestjs).
- **`netmiko-ssh-automation`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`network-bgp-diagnostics`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`network-interface-health`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`nodejs-keccak256`** : Non applicable : domaine métier « blockchain / crypto » absent du cahier des charges.
- **`nutrient-document-processing`** : Module ECC « document-processing » : usage métier ou opérationnel, hors développement logiciel.
- **`nuxt4-patterns`** : Non applicable : technologie absente du projet (nuxt).
- **`openclaw-persona-forge`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`opensource-pipeline`** : « opensource-pipeline » repose sur des mécanismes propres à Claude Code (11 références : hooks, CLAUDE.md, ~/.claude, /ecc:…).
- **`operator-approval-loop`** : Module ECC « operator-desk-patterns » : usage métier ou opérationnel, hors développement logiciel.
- **`osint-investigation`** : Module ECC « research-apis » : usage métier ou opérationnel, hors développement logiciel.
- **`perl-patterns`** : Non applicable : technologie absente du projet (perl).
- **`perl-security`** : Non applicable : technologie absente du projet (perl).
- **`perl-testing`** : Non applicable : technologie absente du projet (perl).
- **`plankton-code-quality`** : « plankton-code-quality » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`prediction-market-oracle-research`** : Module ECC « prediction-market-skills » : usage métier ou opérationnel, hors développement logiciel.
- **`prediction-market-risk-review`** : Module ECC « prediction-market-skills » : usage métier ou opérationnel, hors développement logiciel.
- **`prisma-patterns`** : Non applicable : technologie absente du projet (prisma).
- **`product-capability`** : Module ECC « business-content » : usage métier ou opérationnel, hors développement logiciel.
- **`production-scheduling`** : Module ECC « supply-chain-domain » : usage métier ou opérationnel, hors développement logiciel.
- **`project-flow-ops`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`prompt-caching-strategy`** : Non applicable : domaine métier « agents IA / LLM » absent du cahier des charges.
- **`prompt-optimizer`** : « prompt-optimizer » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`python-patterns`** : Non applicable : technologie absente du projet (python).
- **`python-testing`** : Non applicable : technologie absente du projet (python).
- **`pytorch-patterns`** : Non applicable : technologie absente du projet (pytorch).
- **`quality-nonconformance`** : Module ECC « supply-chain-domain » : usage métier ou opérationnel, hors développement logiciel.
- **`quarkus-patterns`** : Non applicable : technologie absente du projet (quarkus).
- **`quarkus-security`** : Non applicable : technologie absente du projet (quarkus).
- **`quarkus-tdd`** : Non applicable : technologie absente du projet (quarkus).
- **`redis-patterns`** : Non applicable : technologie absente du projet (redis).
- **`quarkus-verification`** : Non applicable : technologie absente du projet (quarkus).
- **`rails-patterns`** : Non applicable : technologie absente du projet (rails).
- **`react-native-patterns`** : Non applicable : technologie absente du projet (react-native).
- **`terminal-ops`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`recsys-pipeline-architect`** : Framework non ciblé : composant prévu pour [fastapi] non présent dans la stack [next.js, react, tailwind css].
- **`regex-vs-llm-structured-text`** : Non applicable : domaine métier « agents IA / LLM » absent du cahier des charges.
- **`remotion-video-creation`** : Module ECC « media-generation » : usage métier ou opérationnel, hors développement logiciel.
- **`repo-scan`** : Incompatible avec la stack du projet : composant ciblant [java, swift] alors que le projet utilise [typescript].
- **`research-ops`** : Module ECC « research-apis » : usage métier ou opérationnel, hors développement logiciel.
- **`returns-reverse-logistics`** : Module ECC « supply-chain-domain » : usage métier ou opérationnel, hors développement logiciel.
- **`rules-distill`** : « rules-distill » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`rust-patterns`** : Non applicable : technologie absente du projet (rust).
- **`rust-testing`** : Non applicable : technologie absente du projet (rust).
- **`safety-guard`** : Framework non ciblé : composant prévu pour [docker] non présent dans la stack [next.js, react, tailwind css].
- **`scientific-db-pubmed-database`** : Module ECC « research-apis » : usage métier ou opérationnel, hors développement logiciel.
- **`scientific-db-uspto-database`** : Module ECC « research-apis » : usage métier ou opérationnel, hors développement logiciel.
- **`scientific-pkg-gget`** : Module ECC « research-apis » : usage métier ou opérationnel, hors développement logiciel.
- **`scientific-thinking-literature-review`** : Module ECC « research-apis » : usage métier ou opérationnel, hors développement logiciel.
- **`scientific-thinking-scholar-evaluation`** : Module ECC « research-apis » : usage métier ou opérationnel, hors développement logiciel.
- **`search-first`** : « search-first » repose sur des mécanismes propres à Claude Code (7 références : hooks, CLAUDE.md, ~/.claude, /ecc:…).
- **`security-scan`** : « security-scan » repose sur des mécanismes propres à Claude Code (17 références : hooks, CLAUDE.md, ~/.claude, /ecc:…).
- **`seo`** : Module ECC « business-content » : usage métier ou opérationnel, hors développement logiciel.
- **`opensource-sanitizer`** : Framework non ciblé : composant prévu pour [docker] non présent dans la stack [next.js, react, tailwind css].
- **`skill-comply`** : « skill-comply » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`skill-host-compat`** : « skill-host-compat » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`skill-scout`** : « skill-scout » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`skill-stocktake`** : « skill-stocktake » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`social-graph-ranker`** : Module ECC « business-content » : usage métier ou opérationnel, hors développement logiciel.
- **`social-publisher`** : Module ECC « social-distribution » : usage métier ou opérationnel, hors développement logiciel.
- **`springboot-patterns`** : Non applicable : technologie absente du projet (springboot).
- **`springboot-security`** : Non applicable : technologie absente du projet (springboot).
- **`springboot-tdd`** : Non applicable : technologie absente du projet (springboot).
- **`springboot-verification`** : Non applicable : technologie absente du projet (springboot).
- **`strategic-compact`** : « strategic-compact » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`swift-actor-persistence`** : Non applicable : technologie absente du projet (swift).
- **`swift-concurrency-6-2`** : Non applicable : technologie absente du projet (swift).
- **`swift-protocol-di-testing`** : Non applicable : technologie absente du projet (swift).
- **`swiftui-patterns`** : Non applicable : technologie absente du projet (swiftui).
- **`taste`** : Module ECC « media-generation » : usage métier ou opérationnel, hors développement logiciel.
- **`taste-application`** : Module ECC « media-generation » : usage métier ou opérationnel, hors développement logiciel.
- **`taste-distillation`** : Module ECC « media-generation » : usage métier ou opérationnel, hors développement logiciel.
- **`tasteforge-video`** : Module ECC « media-generation » : usage métier ou opérationnel, hors développement logiciel.
- **`team-builder`** : « team-builder » repose sur des mécanismes propres à Claude Code (7 références : hooks, CLAUDE.md, ~/.claude, /ecc:…).
- **`tinystruct-patterns`** : Non applicable : technologie absente du projet (tinystruct).
- **`token-budget-advisor`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`token-card`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`rag-pipeline-reviewer`** : Non applicable : domaine métier « agents IA / LLM » absent du cahier des charges.
- **`ui-demo`** : Module ECC « media-generation » : usage métier ou opérationnel, hors développement logiciel.
- **`ui-to-vue`** : Technologie spécifique [vue] non utilisée dans la stack de ce projet.
- **`uncloud`** : Incompatible avec la stack du projet : composant ciblant [postgresql] alors que le projet utilise [typescript].
- **`unified-memory`** : Module ECC « skill-unified-memory » : usage métier ou opérationnel, hors développement logiciel.
- **`unified-notifications-ops`** : Module ECC « operator-workflows » : usage métier ou opérationnel, hors développement logiciel.
- **`video-editing`** : Module ECC « media-generation » : usage métier ou opérationnel, hors développement logiciel.
- **`videodb`** : Module ECC « media-generation » : usage métier ou opérationnel, hors développement logiciel.
- **`visa-doc-translate`** : Module ECC « document-processing » : usage métier ou opérationnel, hors développement logiciel.
- **`vite-patterns`** : Non applicable : technologie absente du projet (vite).
- **`vue-patterns`** : Non applicable : technologie absente du projet (vue).
- **`workspace-surface-audit`** : « workspace-surface-audit » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`x-api`** : Module ECC « social-distribution » : usage métier ou opérationnel, hors développement logiciel.
- **`chief-of-staff`** : Framework non ciblé : composant prévu pour [playwright] non présent dans la stack [next.js, react, tailwind css].
- **`e2e-runner`** : Non applicable : aucun outil de test de bout en bout (Playwright, Cypress).
- **`cpp-build-resolver`** : Non applicable : technologie absente du projet (cpp).
- **`cpp-reviewer`** : Non applicable : technologie absente du projet (cpp).
- **`csharp-reviewer`** : Non applicable : technologie absente du projet (csharp).
- **`dart-build-resolver`** : Non applicable : technologie absente du projet (dart / flutter).
- **`mle-reviewer`** : Non applicable : domaine métier « machine learning » absent du cahier des charges.
- **`django-build-resolver`** : Non applicable : technologie absente du projet (django).
- **`django-reviewer`** : Non applicable : technologie absente du projet (django).
- **`fastapi-reviewer`** : Non applicable : technologie absente du projet (fastapi).
- **`flutter-reviewer`** : Non applicable : technologie absente du projet (flutter).
- **`fsharp-reviewer`** : Non applicable : technologie absente du projet (fsharp).
- **`gan-evaluator`** : Technologie spécifique [gan] non utilisée dans la stack de ce projet.
- **`gan-generator`** : Technologie spécifique [gan] non utilisée dans la stack de ce projet.
- **`gan-planner`** : Technologie spécifique [gan] non utilisée dans la stack de ce projet.
- **`go-build-resolver`** : Non applicable : technologie absente du projet (go).
- **`go-reviewer`** : Non applicable : technologie absente du projet (go).
- **`harmonyos-app-resolver`** : Technologie spécifique [harmonyos] non utilisée dans la stack de ce projet.
- **`network-architect`** : Non applicable : domaine métier « réseau » absent du cahier des charges.
- **`harness-optimizer`** : « harness-optimizer » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.
- **`healthcare-reviewer`** : Non applicable : domaine métier « santé » absent du cahier des charges.
- **`java-build-resolver`** : Non applicable : technologie absente du projet (java).
- **`java-reviewer`** : Non applicable : technologie absente du projet (java).
- **`kotlin-build-resolver`** : Non applicable : technologie absente du projet (kotlin).
- **`kotlin-reviewer`** : Non applicable : technologie absente du projet (kotlin).
- **`opensource-forker`** : Framework non ciblé : composant prévu pour [fastapi, docker] non présent dans la stack [next.js, react, tailwind css].
- **`opensource-packager`** : « opensource-packager » repose sur des mécanismes propres à Claude Code (24 références : hooks, CLAUDE.md, ~/.claude, /ecc:…).
- **`php-reviewer`** : Non applicable : technologie absente du projet (php).
- **`python-reviewer`** : Non applicable : technologie absente du projet (python).
- **`pytorch-build-resolver`** : Non applicable : technologie absente du projet (pytorch).
- **`ruby-reviewer`** : Non applicable : technologie absente du projet (ruby).
- **`rust-build-resolver`** : Non applicable : technologie absente du projet (rust).
- **`rust-reviewer`** : Non applicable : technologie absente du projet (rust).
- **`seo-specialist`** : Non applicable : domaine métier « SEO » absent du cahier des charges.
- **`spec-miner`** : Framework non ciblé : composant prévu pour [django, spring] non présent dans la stack [next.js, react, tailwind css].
- **`swift-build-resolver`** : Non applicable : technologie absente du projet (swift).
- **`swift-reviewer`** : Non applicable : technologie absente du projet (swift).
- **`vue-reviewer`** : Non applicable : technologie absente du projet (vue).
- **`brownfield-retrospective`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`browser-qa`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`build-fix`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`code-review`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`epic-claim`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`epic-decompose`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`epic-publish`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`epic-review`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`epic-sync`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`epic-unblock`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`epic-validate`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`feature-dev`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`jira`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`multi-backend`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`multi-execute`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`multi-frontend`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`multi-plan`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`multi-workflow`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`orch-review`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`plan`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`plan-prd`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`pm2`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`pr`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`projects`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`prp-commit`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`prp-plan`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`prp-pr`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`prp-prd`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`quality-gate`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`react-build`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`react-review`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`react-test`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`refactor-clean`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`review-pr`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`setup-pm`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`common-patterns`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`common-performance`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`web-design-quality`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`web-performance`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`agent-harness-construction`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`agent-introspection-debugging`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`agent-runtime-gateway-smoke-test`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`agent-self-evaluation`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`agentic-engineering`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`ai-first-engineering`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`ai-regression-testing`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`architecture-decision-records`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`benchmark-methodology`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`benchmark-optimization-loop`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`bengali-nlp`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`canary-watch`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`change-impact`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`click-path-audit`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`code-tour`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`codehealth-mcp`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`coding-standards`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`context-and-decisions`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`context-budget`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`continuous-agent-loop`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`contract-first`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`conventional-commit-review`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`council`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`council-multi-model`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`data-scraper-agent`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`dev-team`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`dynamic-workflow-mode`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`enterprise-agent-ops`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`error-handling`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`frontend-slides`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`git-workflow`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`growth-log`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`healthcare-eval-harness`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`hermes-imports`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`hexagonal-architecture`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`homelab-network-readiness`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`homelab-network-setup`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`homelab-vlan-segmentation`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`homelab-wireguard-vpn`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`intent-driven-development`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`latency-critical-systems`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`living-docs-governance`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`loop-design-check`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`mcp-dependency-review`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`module-governance`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`motion-advanced`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`motion-foundations`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`orch-fix-defect`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`motion-patterns`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`nanoclaw-repl`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`network-config-validation`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`nextjs-turbopack`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`orch-add-feature`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`orch-build-mvp`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`orch-change-feature`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`orch-pipeline`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`orch-refine-code`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`parallel-execution-optimizer`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`plan-canvas`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`plan-orchestrate`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`product-lens`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`production-audit`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`ralphinho-rfc-pipeline`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`react-performance`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`recursive-decision-ledger`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`santa-method`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`security-bounty-hunter`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`story-lifecycle`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`team-agent-orchestration`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`terminal-opener`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`performance-optimizer`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`test-collaboration`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`windows-desktop-e2e`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`a11y-architect`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`agent-evaluator`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`bengali-reviewer`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`code-explorer`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`conversation-analyzer`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`code-simplifier`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`comment-analyzer`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`commit-reviewer`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`doc-updater`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`docs-lookup`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`homelab-architect`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`loop-operator`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`marketing-agent`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`network-config-reviewer`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`network-troubleshooter`** : Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.
- **`planner`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`pr-test-analyzer`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`refactor-cleaner`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`silent-failure-hunter`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`tdd-guide`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`type-design-analyzer`** : Composant de palier « extended », non inclus dans le preset BALANCED.
- **`accessibility`** : Doublon fonctionnel évité : la fonction « skill:ui:accessibility » est couverte par « frontend-a11y » (source ecc-official, priorité 50).
- **`make-interfaces-feel-better`** : Doublon fonctionnel évité : la fonction « skill:ui:design-engineering » est couverte par « frontend-design-direction » (source ecc-official, priorité 50).
- **`typescript-reviewer`** : Doublon fonctionnel évité : la fonction « agent:review:stack » est couverte par « react-reviewer » (source ecc-official, priorité 50).
- **`build-error-resolver`** : Doublon fonctionnel évité : la fonction « agent:build » est couverte par « react-build-resolver » (source ecc-official, priorité 50).
- **`code-architect`** : Doublon fonctionnel évité : la fonction « agent:architect » est couverte par « architect » (source ecc-official, priorité 50).
- **`security-reviewer`** : Doublon fonctionnel évité : la fonction « agent:security » est couverte par « security-auditor » (source curated, priorité 100).

---

## 3. Licences et attributions

- **Affaan Mustafa** — [https://github.com/affaan-m/ECC](https://github.com/affaan-m/ECC) — licence **MIT** — commit `b38be6a7` — 39 composant(s)

Les composants marqués `curated` sont écrits pour ce générateur.

Texte de la licence MIT, applicable aux dépôts ci-dessus sous cette licence :

```text
MIT License

Copyright (c) Affaan Mustafa

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
