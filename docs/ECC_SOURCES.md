# Provenance des Composants et Licences (ECC)

**Dépôt officiel de référence :** [https://github.com/affaan-m/ECC](https://github.com/affaan-m/ECC)  
**Version / Tag synchronisé :** `v2.2.3`  
**Commit SHA exact :** `b38be6a7f6350964d59328b52f0624e1d1d552d1`

---

## 1. Traçabilité des Composants du Harnais (§4.5)

Le tableau ci-dessous distingue explicitement :
- `ecc_verbatim` : composant issu d'ECC utilisé tel quel ;
- `ecc_adapted` : composant issu d'ECC adapté pour la compatibilité native Google Antigravity et le projet ;
- `project_custom` : composant généré spécifiquement pour le projet cible.

| Type | Chemin dans le paquet | Statut d'origine | Source officielle ECC & Commit | Raison de sélection | Adaptations appliquées |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Règle | `.agents/rules/common-code-review.md` | `ecc_adapted` | [rules/common/code-review.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/common/code-review.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, sql, api. Règle transverse fondamentale de qualité logicielle. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/common-testing.md` | `ecc_adapted` | [rules/common/testing.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/common/testing.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, api, testing_focus, pack:extreme-tdd-anti-bug. Répond aux contraintes d'architecture ou de sécurité spécifiées. Règle transverse fondamentale de qualité logicielle. Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/react-patterns.md` | `ecc_adapted` | [rules/react/patterns.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/react/patterns.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, framework:react, framework:nextjs. Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/typescript-security.md` | `ecc_adapted` | [rules/typescript/security.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/typescript/security.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, api, pack:security-hardened. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/api-security-guards.md` | `ecc_adapted` | [rules/security/api-security-guards.md](https://github.com/OWASP/CheatSheetSeries) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, api, validation. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/ui-craft-and-5-states.md` | `ecc_adapted` | [rules/design/ui-craft-and-5-states.md](https://github.com/emilkowalski/skills) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, design_engineering_excellence, pack:design-craft-polish. Répond aux contraintes d'architecture ou de sécurité spécifiées. Règle transverse fondamentale de qualité logicielle. Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/plan-first-and-anti-omissions.md` | `ecc_adapted` | [rules/quality/plan-first-and-anti-omissions.md](https://github.com/affaan-m/ECC) (`b38be6a7`) | Mots-clés pertinents détectés : testing_focus, pack:extreme-tdd-anti-bug, bundle:testing_synergy. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/common-development-workflow.md` | `ecc_adapted` | [rules/common/development-workflow.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/common/development-workflow.md) (`b38be6a7`) | Mots-clés pertinents détectés : api, pack:extreme-tdd-anti-bug. Règle transverse fondamentale de qualité logicielle. Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/common-patterns.md` | `ecc_adapted` | [rules/common/patterns.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/common/patterns.md) (`b38be6a7`) | Mots-clés pertinents détectés : api, pack:security-hardened, pack:extreme-tdd-anti-bug. Règle transverse fondamentale de qualité logicielle. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/common-git-workflow.md` | `ecc_adapted` | [rules/common/git-workflow.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/common/git-workflow.md) (`b38be6a7`) | Mots-clés pertinents détectés : pack:extreme-tdd-anti-bug. Règle transverse fondamentale de qualité logicielle. Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/common-coding-style.md` | `ecc_adapted` | [rules/common/coding-style.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/common/coding-style.md) (`b38be6a7`) | Mots-clés pertinents détectés : api. Règle transverse fondamentale de qualité logicielle. | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/common-hooks.md` | `ecc_adapted` | [rules/common/hooks.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/common/hooks.md) (`b38be6a7`) | Règle transverse fondamentale de qualité logicielle. | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/common-performance.md` | `ecc_adapted` | [rules/common/performance.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/rules/common/performance.md) (`b38be6a7`) | Règle transverse fondamentale de qualité logicielle. | Adapté vers les standards Google Antigravity |
| Règle | `.agents/rules/project-design-system-tokens.md` | `project_custom` | Généré sur mesure pour le projet | Le catalogue ECC ne fournit que des règles CSS génériques sans les tokens ni la charte graphique de ce projet. | Créé spécifiquement pour le projet cible |
| Règle | `.agents/rules/project-drizzle-orm-guidelines.md` | `project_custom` | Généré sur mesure pour le projet | Le catalogue standard ne fournit pas de règle dédiée aux conventions de schéma et migrations Drizzle ORM. | Créé spécifiquement pour le projet cible |
| Skill | `.agents/skills/react-test/SKILL.md` | `ecc_adapted` | [commands/react-test.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/commands/react-test.md) (`b38be6a7`) | Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : framework:react, vitest, api, testing_focus. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/agent-payment-x402/SKILL.md` | `ecc_adapted` | [skills/agent-payment-x402/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/agent-payment-x402/SKILL.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, lang:java, framework:nextjs, skill. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/ai-regression-testing/SKILL.md` | `ecc_adapted` | [skills/ai-regression-testing/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/ai-regression-testing/SKILL.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, framework:nextjs, skill, vitest. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/backend-patterns/SKILL.md` | `ecc_adapted` | [skills/backend-patterns/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/backend-patterns/SKILL.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, framework:nextjs, skill, sql. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/bun-runtime/SKILL.md` | `ecc_adapted` | [skills/bun-runtime/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/bun-runtime/SKILL.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, skill, sql. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/click-path-audit/SKILL.md` | `ecc_adapted` | [skills/click-path-audit/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/click-path-audit/SKILL.md) (`b38be6a7`) | Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : framework:react, skill, api, pack:security-hardened. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/codebase-onboarding/SKILL.md` | `ecc_adapted` | [skills/codebase-onboarding/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/codebase-onboarding/SKILL.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, framework:nextjs, framework:react, skill. Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/coding-standards/SKILL.md` | `ecc_adapted` | [skills/coding-standards/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/coding-standards/SKILL.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, framework:nextjs, framework:react. Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/deployment-patterns/SKILL.md` | `ecc_adapted` | [skills/deployment-patterns/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/deployment-patterns/SKILL.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, skill, postgresql, docker. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/frontend-patterns/SKILL.md` | `ecc_adapted` | [skills/frontend-patterns/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/frontend-patterns/SKILL.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, framework:nextjs, framework:react, skill. Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/gateguard/SKILL.md` | `ecc_adapted` | [skills/gateguard/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/gateguard/SKILL.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:java, skill, sql, api. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/healthcare-phi-compliance/SKILL.md` | `ecc_adapted` | [skills/healthcare-phi-compliance/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/healthcare-phi-compliance/SKILL.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, skill, sql, api. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/mysql-patterns/SKILL.md` | `ecc_adapted` | [skills/mysql-patterns/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/mysql-patterns/SKILL.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:javascript, skill, sql, postgresql. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/mybatis-patterns/SKILL.md` | `ecc_adapted` | [skills/mybatis-patterns/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/mybatis-patterns/SKILL.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:java, skill, sql, postgresql. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/prompt-optimizer/SKILL.md` | `ecc_adapted` | [skills/prompt-optimizer/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/prompt-optimizer/SKILL.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, lang:java, framework:nextjs, framework:react. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/react-testing/SKILL.md` | `ecc_adapted` | [skills/react-testing/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/react-testing/SKILL.md) (`b38be6a7`) | Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : framework:nextjs, framework:react, skill, vitest. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers les standards de compétences Google Antigravity |
| Skill | `.agents/skills/security-review/SKILL.md` | `ecc_adapted` | [skills/security-review/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/skills/security-review/SKILL.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, framework:nextjs, framework:react, skill. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers les standards de compétences Google Antigravity |
| Sous-agent | `.agents/agents/build-error-resolver.md` | `ecc_adapted` | [agents/build-error-resolver.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/build-error-resolver.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, framework:nextjs, agent. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers la spécification officielle des sous-agents Antigravity |
| Sous-agent | `.agents/agents/code-reviewer.md` | `ecc_adapted` | [agents/code-reviewer.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/code-reviewer.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, framework:nextjs, framework:react. Règle transverse fondamentale de qualité logicielle. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). | Adapté vers la spécification officielle des sous-agents Antigravity |
| Sous-agent | `.agents/agents/performance-optimizer.md` | `ecc_adapted` | [agents/performance-optimizer.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/performance-optimizer.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, framework:react, agent. Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli). | Adapté vers la spécification officielle des sous-agents Antigravity |
| Sous-agent | `.agents/agents/security-auditor.md` | `ecc_adapted` | [agents/security-auditor.md](https://github.com/OWASP/CheatSheetSeries) (`b38be6a7`) | Mots-clés pertinents détectés : role:security_auditor, pack:security-hardened, bundle:security_synergy. Répond aux contraintes d'architecture ou de sécurité spécifiées. Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust). Synergie d'écosystème renforcée avec la stack et les outils du projet. | Adapté vers la spécification officielle des sous-agents Antigravity |
| Sous-agent | `.agents/agents/react-build-resolver.md` | `ecc_adapted` | [agents/react-build-resolver.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/react-build-resolver.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Adapté aux frameworks utilisés [next.js, react, tailwind css]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, framework:nextjs, framework:react. | Adapté vers la spécification officielle des sous-agents Antigravity |
| Sous-agent | `.agents/agents/doc-updater.md` | `ecc_adapted` | [agents/doc-updater.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/doc-updater.md) (`b38be6a7`) | Correspondance directe avec les langages [typescript]. Mots-clés pertinents détectés : lang:typescript, lang:javascript, agent, api. | Adapté vers la spécification officielle des sous-agents Antigravity |

---

## 2. Principaux Candidats Écartés (Pertinence avant quantité)

- **`dart-testing`** : Incompatible avec la stack du projet : composant ciblant [dart] alors que le projet utilise [typescript].
- **`flutter-build`** : Technologie spécifique [flutter] non utilisée dans la stack de ce projet.
- **`arkts-security`** : Technologie spécifique [arkts] non utilisée dans la stack de ce projet.
- **`flutter-test`** : Technologie spécifique [flutter] non utilisée dans la stack de ce projet.
- **`gan-build`** : Technologie spécifique [gan] non utilisée dans la stack de ce projet.
- **`arkts-testing`** : Technologie spécifique [arkts] non utilisée dans la stack de ce projet.
- **`common-agents`** : Incompatible avec la stack du projet : composant ciblant [rust] alors que le projet utilise [typescript].
- **`astra-review`** : Incompatible avec la stack du projet : composant ciblant [sql] alors que le projet utilise [typescript].
- **`cpp-build`** : Technologie spécifique [cpp] non utilisée dans la stack de ce projet.
- **`cpp-review`** : Technologie spécifique [cpp] non utilisée dans la stack de ce projet.
- **`cpp-test`** : Technologie spécifique [cpp] non utilisée dans la stack de ce projet.
- **`flutter-review`** : Technologie spécifique [flutter] non utilisée dans la stack de ce projet.
- **`fastapi-review`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`gan-design`** : Technologie spécifique [gan] non utilisée dans la stack de ce projet.
- **`go-build`** : Incompatible avec la stack du projet : composant ciblant [go] alors que le projet utilise [typescript].
- **`go-review`** : Incompatible avec la stack du projet : composant ciblant [go, sql] alors que le projet utilise [typescript].
- **`go-test`** : Incompatible avec la stack du projet : composant ciblant [go, sql] alors que le projet utilise [typescript].
- **`gradle-build`** : Incompatible avec la stack du projet : composant ciblant [kotlin] alors que le projet utilise [typescript].
- **`hookify`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`kotlin-build`** : Incompatible avec la stack du projet : composant ciblant [kotlin] alors que le projet utilise [typescript].
- **`kotlin-review`** : Incompatible avec la stack du projet : composant ciblant [java, kotlin, sql] alors que le projet utilise [typescript].
- **`kotlin-test`** : Incompatible avec la stack du projet : composant ciblant [kotlin] alors que le projet utilise [typescript].
- **`pm2`** : Incompatible avec la stack du projet : composant ciblant [javascript, python] alors que le projet utilise [typescript].
- **`project-init`** : Framework non ciblé : composant prévu pour [tailwindcss, docker] non présent dans la stack [next.js, react, tailwind css].
- **`prp-implement`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`python-review`** : Incompatible avec la stack du projet : composant ciblant [python, sql] alors que le projet utilise [typescript].
- **`rust-build`** : Incompatible avec la stack du projet : composant ciblant [rust] alors que le projet utilise [typescript].
- **`rust-review`** : Incompatible avec la stack du projet : composant ciblant [rust, sql] alors que le projet utilise [typescript].
- **`rust-test`** : Incompatible avec la stack du projet : composant ciblant [rust] alors que le projet utilise [typescript].
- **`santa-loop`** : Incompatible avec la stack du projet : composant ciblant [rust, sql] alors que le projet utilise [typescript].
- **`save-session`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`test-coverage`** : Framework non ciblé : composant prévu pour [vitest] non présent dans la stack [next.js, react, tailwind css].
- **`update-codemaps`** : Incompatible avec la stack du projet : composant ciblant [postgresql] alors que le projet utilise [typescript].
- **`update-docs`** : Incompatible avec la stack du projet : composant ciblant [postgresql] alors que le projet utilise [typescript].
- **`vue-review`** : Technologie spécifique [vue] non utilisée dans la stack de ce projet.
- **`angular-coding-style`** : Technologie spécifique [angular] non utilisée dans la stack de ce projet.
- **`angular-hooks`** : Technologie spécifique [angular] non utilisée dans la stack de ce projet.
- **`angular-patterns`** : Technologie spécifique [angular] non utilisée dans la stack de ce projet.
- **`angular-security`** : Technologie spécifique [angular] non utilisée dans la stack de ce projet.
- **`angular-testing`** : Technologie spécifique [angular] non utilisée dans la stack de ce projet.
- **`arkts-coding-style`** : Technologie spécifique [arkts] non utilisée dans la stack de ce projet.
- **`arkts-hooks`** : Technologie spécifique [arkts] non utilisée dans la stack de ce projet.
- **`arkts-patterns`** : Technologie spécifique [arkts] non utilisée dans la stack de ce projet.
- **`dart-security`** : Incompatible avec la stack du projet : composant ciblant [dart] alors que le projet utilise [typescript].
- **`common-security`** : Incompatible avec la stack du projet : composant ciblant [sql] alors que le projet utilise [typescript].
- **`cpp-coding-style`** : Incompatible avec la stack du projet : composant ciblant [cpp, c++] alors que le projet utilise [typescript].
- **`cpp-hooks`** : Incompatible avec la stack du projet : composant ciblant [cpp, c++] alors que le projet utilise [typescript].
- **`cpp-patterns`** : Incompatible avec la stack du projet : composant ciblant [cpp, c++] alors que le projet utilise [typescript].
- **`cpp-security`** : Incompatible avec la stack du projet : composant ciblant [cpp, c++] alors que le projet utilise [typescript].
- **`cpp-testing`** : Incompatible avec la stack du projet : composant ciblant [cpp, c++] alors que le projet utilise [typescript].
- **`csharp-coding-style`** : Incompatible avec la stack du projet : composant ciblant [csharp, c#] alors que le projet utilise [typescript].
- **`csharp-hooks`** : Incompatible avec la stack du projet : composant ciblant [csharp, c#] alors que le projet utilise [typescript].
- **`csharp-patterns`** : Incompatible avec la stack du projet : composant ciblant [csharp, c#] alors que le projet utilise [typescript].
- **`csharp-security`** : Incompatible avec la stack du projet : composant ciblant [csharp, c#] alors que le projet utilise [typescript].
- **`csharp-testing`** : Incompatible avec la stack du projet : composant ciblant [csharp, c#] alors que le projet utilise [typescript].
- **`dart-coding-style`** : Incompatible avec la stack du projet : composant ciblant [dart] alors que le projet utilise [typescript].
- **`dart-hooks`** : Incompatible avec la stack du projet : composant ciblant [dart] alors que le projet utilise [typescript].
- **`dart-patterns`** : Incompatible avec la stack du projet : composant ciblant [dart] alors que le projet utilise [typescript].
- **`fsharp-coding-style`** : Incompatible avec la stack du projet : composant ciblant [fsharp] alors que le projet utilise [typescript].
- **`fsharp-hooks`** : Incompatible avec la stack du projet : composant ciblant [fsharp] alors que le projet utilise [typescript].
- **`fsharp-patterns`** : Incompatible avec la stack du projet : composant ciblant [fsharp] alors que le projet utilise [typescript].
- **`fsharp-security`** : Incompatible avec la stack du projet : composant ciblant [fsharp] alors que le projet utilise [typescript].
- **`fsharp-testing`** : Incompatible avec la stack du projet : composant ciblant [fsharp] alors que le projet utilise [typescript].
- **`golang-coding-style`** : Incompatible avec la stack du projet : composant ciblant [go, golang] alors que le projet utilise [typescript].
- **`kotlin-patterns`** : Incompatible avec la stack du projet : composant ciblant [kotlin] alors que le projet utilise [typescript].
- **`golang-hooks`** : Incompatible avec la stack du projet : composant ciblant [go, golang] alors que le projet utilise [typescript].
- **`golang-patterns`** : Incompatible avec la stack du projet : composant ciblant [go, golang] alors que le projet utilise [typescript].
- **`golang-security`** : Incompatible avec la stack du projet : composant ciblant [go, golang] alors que le projet utilise [typescript].
- **`golang-testing`** : Incompatible avec la stack du projet : composant ciblant [go, golang] alors que le projet utilise [typescript].
- **`java-coding-style`** : Incompatible avec la stack du projet : composant ciblant [java] alors que le projet utilise [typescript].
- **`java-hooks`** : Incompatible avec la stack du projet : composant ciblant [java] alors que le projet utilise [typescript].
- **`java-patterns`** : Incompatible avec la stack du projet : composant ciblant [java] alors que le projet utilise [typescript].
- **`java-security`** : Incompatible avec la stack du projet : composant ciblant [java] alors que le projet utilise [typescript].
- **`java-testing`** : Incompatible avec la stack du projet : composant ciblant [java] alors que le projet utilise [typescript].
- **`kotlin-coding-style`** : Incompatible avec la stack du projet : composant ciblant [kotlin] alors que le projet utilise [typescript].
- **`kotlin-hooks`** : Incompatible avec la stack du projet : composant ciblant [kotlin] alors que le projet utilise [typescript].
- **`kotlin-security`** : Incompatible avec la stack du projet : composant ciblant [kotlin] alors que le projet utilise [typescript].
- **`kotlin-testing`** : Incompatible avec la stack du projet : composant ciblant [kotlin] alors que le projet utilise [typescript].
- **`nuxt-coding-style`** : Framework non ciblé : composant prévu pour [nuxt, vue] non présent dans la stack [next.js, react, tailwind css].
- **`nuxt-hooks`** : Framework non ciblé : composant prévu pour [nuxt, vue] non présent dans la stack [next.js, react, tailwind css].
- **`nuxt-patterns`** : Framework non ciblé : composant prévu pour [nuxt, vue] non présent dans la stack [next.js, react, tailwind css].
- **`nuxt-security`** : Framework non ciblé : composant prévu pour [nuxt, vue] non présent dans la stack [next.js, react, tailwind css].
- **`nuxt-testing`** : Framework non ciblé : composant prévu pour [nuxt, vue] non présent dans la stack [next.js, react, tailwind css].
- **`perl-coding-style`** : Technologie spécifique [perl] non utilisée dans la stack de ce projet.
- **`perl-hooks`** : Technologie spécifique [perl] non utilisée dans la stack de ce projet.
- **`perl-patterns`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`perl-security`** : Incompatible avec la stack du projet : composant ciblant [sql] alors que le projet utilise [typescript].
- **`perl-testing`** : Technologie spécifique [perl] non utilisée dans la stack de ce projet.
- **`php-coding-style`** : Incompatible avec la stack du projet : composant ciblant [php] alors que le projet utilise [typescript].
- **`php-hooks`** : Incompatible avec la stack du projet : composant ciblant [php] alors que le projet utilise [typescript].
- **`php-patterns`** : Incompatible avec la stack du projet : composant ciblant [php] alors que le projet utilise [typescript].
- **`php-security`** : Incompatible avec la stack du projet : composant ciblant [php] alors que le projet utilise [typescript].
- **`php-testing`** : Incompatible avec la stack du projet : composant ciblant [php] alors que le projet utilise [typescript].
- **`python-coding-style`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`python-fastapi`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`python-hooks`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`python-patterns`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`python-security`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`python-testing`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`react-native-accessibility`** : Technologie spécifique [react-native] non utilisée dans la stack de ce projet.
- **`react-native-coding-style`** : Technologie spécifique [react-native] non utilisée dans la stack de ce projet.
- **`react-native-hooks`** : Technologie spécifique [react-native] non utilisée dans la stack de ce projet.
- **`react-native-patterns`** : Technologie spécifique [react-native] non utilisée dans la stack de ce projet.
- **`react-native-performance`** : Technologie spécifique [react-native] non utilisée dans la stack de ce projet.
- **`react-native-production-readiness`** : Technologie spécifique [react-native] non utilisée dans la stack de ce projet.
- **`react-native-security`** : Technologie spécifique [react-native] non utilisée dans la stack de ce projet.
- **`react-native-testing`** : Technologie spécifique [react-native] non utilisée dans la stack de ce projet.
- **`ruby-coding-style`** : Incompatible avec la stack du projet : composant ciblant [ruby] alors que le projet utilise [typescript].
- **`rust-patterns`** : Incompatible avec la stack du projet : composant ciblant [rust] alors que le projet utilise [typescript].
- **`ruby-hooks`** : Incompatible avec la stack du projet : composant ciblant [ruby] alors que le projet utilise [typescript].
- **`ruby-patterns`** : Incompatible avec la stack du projet : composant ciblant [ruby] alors que le projet utilise [typescript].
- **`ruby-security`** : Incompatible avec la stack du projet : composant ciblant [ruby] alors que le projet utilise [typescript].
- **`ruby-testing`** : Incompatible avec la stack du projet : composant ciblant [ruby] alors que le projet utilise [typescript].
- **`rust-coding-style`** : Incompatible avec la stack du projet : composant ciblant [rust] alors que le projet utilise [typescript].
- **`rust-hooks`** : Incompatible avec la stack du projet : composant ciblant [rust] alors que le projet utilise [typescript].
- **`rust-security`** : Incompatible avec la stack du projet : composant ciblant [rust] alors que le projet utilise [typescript].
- **`rust-testing`** : Incompatible avec la stack du projet : composant ciblant [rust] alors que le projet utilise [typescript].
- **`swift-coding-style`** : Incompatible avec la stack du projet : composant ciblant [swift] alors que le projet utilise [typescript].
- **`swift-hooks`** : Incompatible avec la stack du projet : composant ciblant [swift] alors que le projet utilise [typescript].
- **`swift-patterns`** : Incompatible avec la stack du projet : composant ciblant [swift] alors que le projet utilise [typescript].
- **`vue-patterns`** : Technologie spécifique [vue] non utilisée dans la stack de ce projet.
- **`swift-security`** : Incompatible avec la stack du projet : composant ciblant [swift] alors que le projet utilise [typescript].
- **`swift-testing`** : Incompatible avec la stack du projet : composant ciblant [swift] alors que le projet utilise [typescript].
- **`vue-security`** : Technologie spécifique [vue] non utilisée dans la stack de ce projet.
- **`vue-coding-style`** : Technologie spécifique [vue] non utilisée dans la stack de ce projet.
- **`vue-hooks`** : Technologie spécifique [vue] non utilisée dans la stack de ce projet.
- **`vue-testing`** : Technologie spécifique [vue] non utilisée dans la stack de ce projet.
- **`web-coding-style`** : Incompatible avec la stack du projet : composant ciblant [css, html] alors que le projet utilise [typescript].
- **`web-design-quality`** : Incompatible avec la stack du projet : composant ciblant [css, html] alors que le projet utilise [typescript].
- **`web-hooks`** : Incompatible avec la stack du projet : composant ciblant [css, html] alors que le projet utilise [typescript].
- **`web-patterns`** : Incompatible avec la stack du projet : composant ciblant [css, html] alors que le projet utilise [typescript].
- **`web-performance`** : Incompatible avec la stack du projet : composant ciblant [css, html] alors que le projet utilise [typescript].
- **`web-security`** : Incompatible avec la stack du projet : composant ciblant [css, html] alors que le projet utilise [typescript].
- **`web-testing`** : Incompatible avec la stack du projet : composant ciblant [css, html] alors que le projet utilise [typescript].
- **`accessibility`** : Incompatible avec la stack du projet : composant ciblant [kotlin, swift] alors que le projet utilise [typescript].
- **`agent-eval`** : Framework non ciblé : composant prévu pour [docker] non présent dans la stack [next.js, react, tailwind css].
- **`agentic-os`** : Incompatible avec la stack du projet : composant ciblant [python, postgresql] alors que le projet utilise [typescript].
- **`android-clean-architecture`** : Incompatible avec la stack du projet : composant ciblant [kotlin, sql] alors que le projet utilise [typescript].
- **`angular-developer`** : Technologie spécifique [angular] non utilisée dans la stack de ce projet.
- **`bengali-nlp`** : Incompatible avec la stack du projet : composant ciblant [javascript, python, sql, postgresql] alors que le projet utilise [typescript].
- **`benchmark`** : Framework non ciblé : composant prévu pour [docker] non présent dans la stack [next.js, react, tailwind css].
- **`blender-motion-state-inspection`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`blueprint`** : Incompatible avec la stack du projet : composant ciblant [postgresql] alors que le projet utilise [typescript].
- **`browser-qa`** : Framework non ciblé : composant prévu pour [playwright] non présent dans la stack [next.js, react, tailwind css].
- **`docs-governance`** : Incompatible avec la stack du projet : composant ciblant [postgresql] alors que le projet utilise [typescript].
- **`compose-multiplatform-patterns`** : Incompatible avec la stack du projet : composant ciblant [kotlin] alors que le projet utilise [typescript].
- **`content-hash-cache-pattern`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`cost-aware-llm-pipeline`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`cpp-coding-standards`** : Technologie spécifique [cpp] non utilisée dans la stack de ce projet.
- **`cpp-testing`** : Technologie spécifique [cpp] non utilisée dans la stack de ce projet.
- **`csharp-testing`** : Incompatible avec la stack du projet : composant ciblant [csharp, postgresql] alors que le projet utilise [typescript].
- **`dart-flutter-patterns`** : Technologie spécifique [dart] non utilisée dans la stack de ce projet.
- **`data-throughput-accelerator`** : Incompatible avec la stack du projet : composant ciblant [sql] alors que le projet utilise [typescript].
- **`database-migrations`** : Framework non ciblé : composant prévu pour [django] non présent dans la stack [next.js, react, tailwind css].
- **`deep-research`** : Incompatible avec la stack du projet : composant ciblant [rust] alors que le projet utilise [typescript].
- **`delivery-gate`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`design-system`** : Framework non ciblé : composant prévu pour [tailwindcss] non présent dans la stack [next.js, react, tailwind css].
- **`django-celery`** : Technologie spécifique [django] non utilisée dans la stack de ce projet.
- **`django-patterns`** : Technologie spécifique [django] non utilisée dans la stack de ce projet.
- **`django-security`** : Technologie spécifique [django] non utilisée dans la stack de ce projet.
- **`django-tdd`** : Technologie spécifique [django] non utilisée dans la stack de ce projet.
- **`django-verification`** : Technologie spécifique [django] non utilisée dans la stack de ce projet.
- **`dotnet-patterns`** : Incompatible avec la stack du projet : composant ciblant [csharp] alors que le projet utilise [typescript].
- **`e2e-testing`** : Framework non ciblé : composant prévu pour [playwright] non présent dans la stack [next.js, react, tailwind css].
- **`energy-procurement`** : Framework non ciblé : composant prévu pour [spring] non présent dans la stack [next.js, react, tailwind css].
- **`exa-search`** : Incompatible avec la stack du projet : composant ciblant [python, rust] alors que le projet utilise [typescript].
- **`fal-ai-media`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`fastapi-patterns`** : Technologie spécifique [fastapi] non utilisée dans la stack de ce projet.
- **`flutter-dart-code-review`** : Technologie spécifique [flutter] non utilisée dans la stack de ce projet.
- **`foundation-models-on-device`** : Incompatible avec la stack du projet : composant ciblant [swift] alors que le projet utilise [typescript].
- **`frontend-slides`** : Incompatible avec la stack du projet : composant ciblant [javascript, python] alors que le projet utilise [typescript].
- **`fsharp-testing`** : Incompatible avec la stack du projet : composant ciblant [csharp] alors que le projet utilise [typescript].
- **`gan-style-harness`** : Technologie spécifique [gan] non utilisée dans la stack de ce projet.
- **`generating-python-installer`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`golang-patterns`** : Incompatible avec la stack du projet : composant ciblant [go, sql, postgresql] alors que le projet utilise [typescript].
- **`golang-testing`** : Technologie spécifique [golang] non utilisée dans la stack de ce projet.
- **`hexagonal-architecture`** : Framework non ciblé : composant prévu pour [spring] non présent dans la stack [next.js, react, tailwind css].
- **`homelab-pihole-dns`** : Framework non ciblé : composant prévu pour [docker] non présent dans la stack [next.js, react, tailwind css].
- **`inherit-legacy-style`** : Incompatible avec la stack du projet : composant ciblant [java, swift, php] alors que le projet utilise [typescript].
- **`laravel-plugin-discovery`** : Technologie spécifique [laravel] non utilisée dans la stack de ce projet.
- **`ios-icon-gen`** : Incompatible avec la stack du projet : composant ciblant [swift] alors que le projet utilise [typescript].
- **`iterative-retrieval`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`ito-baskets`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`java-coding-standards`** : Incompatible avec la stack du projet : composant ciblant [java, sql] alors que le projet utilise [typescript].
- **`jpa-patterns`** : Incompatible avec la stack du projet : composant ciblant [java, sql, postgresql] alors que le projet utilise [typescript].
- **`knowledge-ops`** : Incompatible avec la stack du projet : composant ciblant [sql, postgresql] alors que le projet utilise [typescript].
- **`kotlin-coroutines-flows`** : Incompatible avec la stack du projet : composant ciblant [kotlin] alors que le projet utilise [typescript].
- **`kotlin-exposed-patterns`** : Incompatible avec la stack du projet : composant ciblant [kotlin, sql, postgresql] alors que le projet utilise [typescript].
- **`kotlin-ktor-patterns`** : Incompatible avec la stack du projet : composant ciblant [kotlin, postgresql] alors que le projet utilise [typescript].
- **`kotlin-patterns`** : Incompatible avec la stack du projet : composant ciblant [java, kotlin, sql, postgresql] alors que le projet utilise [typescript].
- **`kotlin-testing`** : Technologie spécifique [kotlin] non utilisée dans la stack de ce projet.
- **`laravel-patterns`** : Incompatible avec la stack du projet : composant ciblant [php] alors que le projet utilise [typescript].
- **`laravel-security`** : Technologie spécifique [laravel] non utilisée dans la stack de ce projet.
- **`laravel-tdd`** : Technologie spécifique [laravel] non utilisée dans la stack de ce projet.
- **`laravel-verification`** : Technologie spécifique [laravel] non utilisée dans la stack de ce projet.
- **`lead-intelligence`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`liquid-glass-design`** : Incompatible avec la stack du projet : composant ciblant [swift] alors que le projet utilise [typescript].
- **`ml-adoption-playbook`** : Framework non ciblé : composant prévu pour [django, fastapi] non présent dans la stack [next.js, react, tailwind css].
- **`module-regression`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`netmiko-ssh-automation`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`network-bgp-diagnostics`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`openclaw-persona-forge`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`network-interface-health`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`nextjs-turbopack`** : Incompatible avec la stack du projet : composant ciblant [rust] alors que le projet utilise [typescript].
- **`nuxt4-patterns`** : Framework non ciblé : composant prévu pour [vue, nuxt] non présent dans la stack [next.js, react, tailwind css].
- **`operator-approval-loop`** : Incompatible avec la stack du projet : composant ciblant [python, sql] alors que le projet utilise [typescript].
- **`perl-patterns`** : Technologie spécifique [perl] non utilisée dans la stack de ce projet.
- **`repo-scan`** : Incompatible avec la stack du projet : composant ciblant [java, swift] alors que le projet utilise [typescript].
- **`perl-security`** : Technologie spécifique [perl] non utilisée dans la stack de ce projet.
- **`perl-testing`** : Technologie spécifique [perl] non utilisée dans la stack de ce projet.
- **`prompt-caching-strategy`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`python-patterns`** : Technologie spécifique [python] non utilisée dans la stack de ce projet.
- **`python-testing`** : Technologie spécifique [python] non utilisée dans la stack de ce projet.
- **`pytorch-patterns`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`quarkus-patterns`** : Technologie spécifique [quarkus] non utilisée dans la stack de ce projet.
- **`quarkus-security`** : Technologie spécifique [quarkus] non utilisée dans la stack de ce projet.
- **`quarkus-tdd`** : Technologie spécifique [quarkus] non utilisée dans la stack de ce projet.
- **`quarkus-verification`** : Technologie spécifique [quarkus] non utilisée dans la stack de ce projet.
- **`rails-patterns`** : Incompatible avec la stack du projet : composant ciblant [javascript, ruby] alors que le projet utilise [typescript].
- **`react-native-patterns`** : Technologie spécifique [react-native] non utilisée dans la stack de ce projet.
- **`react-performance`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`recsys-pipeline-architect`** : Framework non ciblé : composant prévu pour [fastapi] non présent dans la stack [next.js, react, tailwind css].
- **`redis-patterns`** : Incompatible avec la stack du projet : composant ciblant [python, postgresql] alors que le projet utilise [typescript].
- **`rust-patterns`** : Technologie spécifique [rust] non utilisée dans la stack de ce projet.
- **`rust-testing`** : Technologie spécifique [rust] non utilisée dans la stack de ce projet.
- **`safety-guard`** : Framework non ciblé : composant prévu pour [docker] non présent dans la stack [next.js, react, tailwind css].
- **`scientific-db-pubmed-database`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`scientific-db-uspto-database`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`scientific-pkg-gget`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`springboot-patterns`** : Technologie spécifique [springboot] non utilisée dans la stack de ce projet.
- **`search-first`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`skill-stocktake`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`springboot-security`** : Technologie spécifique [springboot] non utilisée dans la stack de ce projet.
- **`springboot-tdd`** : Technologie spécifique [springboot] non utilisée dans la stack de ce projet.
- **`springboot-verification`** : Technologie spécifique [springboot] non utilisée dans la stack de ce projet.
- **`swift-actor-persistence`** : Incompatible avec la stack du projet : composant ciblant [swift] alors que le projet utilise [typescript].
- **`swift-concurrency-6-2`** : Incompatible avec la stack du projet : composant ciblant [swift] alors que le projet utilise [typescript].
- **`swift-protocol-di-testing`** : Incompatible avec la stack du projet : composant ciblant [swift] alors que le projet utilise [typescript].
- **`swiftui-patterns`** : Incompatible avec la stack du projet : composant ciblant [swift] alors que le projet utilise [typescript].
- **`taste-application`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`taste-distillation`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`tasteforge-video`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`token-budget-advisor`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`ui-demo`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`ui-to-vue`** : Technologie spécifique [vue] non utilisée dans la stack de ce projet.
- **`uncloud`** : Incompatible avec la stack du projet : composant ciblant [postgresql] alors que le projet utilise [typescript].
- **`video-editing`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`videodb`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`visa-doc-translate`** : Incompatible avec la stack du projet : composant ciblant [python] alors que le projet utilise [typescript].
- **`vue-patterns`** : Technologie spécifique [vue] non utilisée dans la stack de ce projet.
- **`a11y-architect`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`agent-evaluator`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`architect`** : Incompatible avec la stack du projet : composant ciblant [javascript, postgresql] alors que le projet utilise [typescript].
- **`bengali-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript, python, postgresql] alors que le projet utilise [typescript].
- **`comment-analyzer`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`chief-of-staff`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`code-architect`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`code-explorer`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`code-simplifier`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`commit-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`conversation-analyzer`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`cpp-build-resolver`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`cpp-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`csharp-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript, csharp, sql] alors que le projet utilise [typescript].
- **`dart-build-resolver`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`database-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript, sql, postgresql] alors que le projet utilise [typescript].
- **`django-build-resolver`** : Incompatible avec la stack du projet : composant ciblant [javascript, python, postgresql] alors que le projet utilise [typescript].
- **`django-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript, python, sql] alors que le projet utilise [typescript].
- **`docs-lookup`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`e2e-runner`** : Framework non ciblé : composant prévu pour [playwright] non présent dans la stack [next.js, react, tailwind css].
- **`fastapi-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript, python, sql] alors que le projet utilise [typescript].
- **`network-config-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`flutter-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`fsharp-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript, sql] alors que le projet utilise [typescript].
- **`gan-evaluator`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`gan-generator`** : Technologie spécifique [gan] non utilisée dans la stack de ce projet.
- **`gan-planner`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`go-build-resolver`** : Incompatible avec la stack du projet : composant ciblant [javascript, go] alors que le projet utilise [typescript].
- **`go-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript, go, sql] alors que le projet utilise [typescript].
- **`harmonyos-app-resolver`** : Technologie spécifique [harmonyos] non utilisée dans la stack de ce projet.
- **`harness-optimizer`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`healthcare-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`homelab-architect`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`java-build-resolver`** : Incompatible avec la stack du projet : composant ciblant [javascript, java] alors que le projet utilise [typescript].
- **`java-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript, java, sql] alors que le projet utilise [typescript].
- **`kotlin-build-resolver`** : Incompatible avec la stack du projet : composant ciblant [javascript, java, kotlin] alors que le projet utilise [typescript].
- **`kotlin-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript, java, kotlin] alors que le projet utilise [typescript].
- **`loop-operator`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`marketing-agent`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`mle-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript, python, sql] alors que le projet utilise [typescript].
- **`network-architect`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`network-troubleshooter`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`opensource-forker`** : Incompatible avec la stack du projet : composant ciblant [javascript, postgresql] alors que le projet utilise [typescript].
- **`opensource-packager`** : Incompatible avec la stack du projet : composant ciblant [javascript, python, postgresql] alors que le projet utilise [typescript].
- **`opensource-sanitizer`** : Incompatible avec la stack du projet : composant ciblant [javascript, postgresql] alors que le projet utilise [typescript].
- **`php-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript, php, sql] alors que le projet utilise [typescript].
- **`planner`** : Incompatible avec la stack du projet : composant ciblant [javascript, sql] alors que le projet utilise [typescript].
- **`pr-test-analyzer`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`python-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript, python, sql] alors que le projet utilise [typescript].
- **`pytorch-build-resolver`** : Incompatible avec la stack du projet : composant ciblant [javascript, python] alors que le projet utilise [typescript].
- **`rag-pipeline-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`ruby-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript, ruby, sql] alors que le projet utilise [typescript].
- **`rust-build-resolver`** : Incompatible avec la stack du projet : composant ciblant [javascript, rust] alors que le projet utilise [typescript].
- **`rust-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript, rust, sql] alors que le projet utilise [typescript].
- **`security-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript, sql] alors que le projet utilise [typescript].
- **`seo-specialist`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`silent-failure-hunter`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`spec-miner`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`swift-build-resolver`** : Incompatible avec la stack du projet : composant ciblant [javascript, swift] alors que le projet utilise [typescript].
- **`swift-reviewer`** : Incompatible avec la stack du projet : composant ciblant [javascript, swift, sql] alors que le projet utilise [typescript].
- **`tdd-guide`** : Incompatible avec la stack du projet : composant ciblant [javascript, sql] alors que le projet utilise [typescript].
- **`type-design-analyzer`** : Incompatible avec la stack du projet : composant ciblant [javascript] alors que le projet utilise [typescript].
- **`vue-reviewer`** : Technologie spécifique [vue] non utilisée dans la stack de ce projet.
- **`react-review`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`react-security`** : Doublon fonctionnel évité : le rôle/famille "RULE:react" est déjà couvert par le composant prioritaire "react-patterns".
- **`react-testing`** : Doublon fonctionnel évité : le rôle/famille "RULE:react" est déjà couvert par le composant prioritaire "react-patterns".
- **`typescript-testing`** : Doublon fonctionnel évité : le rôle/famille "RULE:typescript" est déjà couvert par le composant prioritaire "typescript-security".
- **`tdd-workflow`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`tinystruct-patterns`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`typescript-patterns`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`vite-patterns`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`react-reviewer`** : Doublon fonctionnel évité : le rôle/famille "SUBAGENT:code-reviewer" est déjà couvert par le composant prioritaire "code-reviewer".
- **`typescript-reviewer`** : Doublon fonctionnel évité : le rôle/famille "SUBAGENT:code-reviewer" est déjà couvert par le composant prioritaire "code-reviewer".
- **`ui-craft-reviewer`** : Doublon fonctionnel évité : le rôle/famille "SUBAGENT:code-reviewer" est déjà couvert par le composant prioritaire "code-reviewer".
- **`architecture-decision-records`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`code-review`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`agent-runtime-gateway-smoke-test`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`autonomous-loops`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`brownfield-retrospective`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`contract-first`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`healthcare-emr-patterns`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`mailtrap-email-integration`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`nestjs-patterns`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`orch-pipeline`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`plankton-code-quality`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`test-collaboration`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`verification-loop`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`continuous-learning-v2`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`react-patterns`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`react-coding-style`** : Doublon fonctionnel évité : le rôle/famille "RULE:react" est déjà couvert par le composant prioritaire "react-patterns".
- **`agentic-engineering`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`healthcare-cdss-patterns`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`story-lifecycle`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`api-design`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`error-handling`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`prisma-patterns`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`multi-execute`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`frontend-a11y`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`motion-foundations`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`motion-patterns`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`team-builder`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`orch-review`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`review-pr`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`agent-security-hardening`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`git-workflow`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`production-audit`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`security-bounty-hunter`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`agent-architecture-audit`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`defi-amm-security`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`github-ops`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`security-scan`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`workspace-surface-audit`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`react-build`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`react-hooks`** : Doublon fonctionnel évité : le rôle/famille "RULE:react" est déjà couvert par le composant prioritaire "react-patterns".
- **`agent-sort`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`automation-audit-ops`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`ecc-tools-cost-audit`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`llm-trading-agent-security`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`docker-patterns`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`flox-environments`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`healthcare-eval-harness`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`homelab-wireguard-vpn`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`kubernetes-patterns`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`mle-workflow`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`plan-orchestrate`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`postgres-patterns`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`harness-audit`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`agent-self-evaluation`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`claude-devfleet`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`code-tour`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`continuous-learning`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`data-scraper-agent`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`dmux-workflows`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`eval-harness`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`hipaa-compliance`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`hookify-rules`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`intent-driven-development`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`issue-review`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`jira-integration`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`market-research`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`mcp-dependency-review`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`network-config-validation`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`nutrient-document-processing`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`opensource-pipeline`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`prediction-market-risk-review`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`product-capability`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`santa-method`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`social-publisher`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`windows-desktop-e2e`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`x-api`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`typescript-coding-style`** : Doublon fonctionnel évité : le rôle/famille "RULE:typescript" est déjà couvert par le composant prioritaire "typescript-security".
- **`clickhouse-io`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`jira`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`multi-backend`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`prp-plan`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`skill-create`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`ai-first-engineering`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`autonomous-agent-harness`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`carrier-relationship-management`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`codehealth-mcp`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`config-gc`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`council`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`customs-trade-compliance`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`dynamic-workflow-mode`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`ecc-guide`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`ecc-recipes`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`enterprise-agent-ops`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`frontend-design-direction`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`homelab-network-readiness`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`homelab-vlan-segmentation`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`logistics-exception-management`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`marketing-campaign`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`orch-add-feature`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`orch-build-mvp`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`orch-change-feature`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`orch-fix-defect`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`osint-investigation`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`prediction-market-oracle-research`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`product-lens`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`quality-nonconformance`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`ralphinho-rfc-pipeline`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`regex-vs-llm-structured-text`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`returns-reverse-logistics`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`rules-distill`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`skill-comply`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`skill-scout`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`strategic-compact`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`team-agent-orchestration`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`terminal-ops`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`unified-notifications-ops`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`api-connector-builder`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`mcp-server-patterns`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`refactor-cleaner`** : Quota maximum de sous-agents (6) atteint pour le preset THOROUGH.
- **`instinct-status`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`evolve`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`feature-dev`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`instinct-export`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`multi-frontend`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`multi-plan`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`multi-workflow`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`plan`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`plan-prd`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`pr`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`prp-pr`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`documentation-lookup`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`motion-advanced`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`refactor-clean`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`typescript-patterns`** : Doublon fonctionnel évité : le rôle/famille "RULE:typescript" est déjà couvert par le composant prioritaire "typescript-security".
- **`evm-token-decimals`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`nodejs-keccak256`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`resume-session`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`agent-harness-construction`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`benchmark-methodology`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`remotion-video-creation`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`taste`** : Quota maximum de compétences / skills (16) atteint pour le preset THOROUGH.
- **`build-fix`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`prp-commit`** : Doublon fonctionnel évité : le rôle/famille "COMMAND_CONVERTED:workflow-converted" est déjà couvert par le composant prioritaire "react-test".
- **`typescript-hooks`** : Doublon fonctionnel évité : le rôle/famille "RULE:typescript" est déjà couvert par le composant prioritaire "typescript-security".
- **`article-writing`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`brand-voice`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`canary-watch`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`change-impact`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`configure-ecc`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`connections-optimizer`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`content-engine`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`conventional-commit-review`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`counterparty-channel-discipline`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`crosspost`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`customer-billing-ops`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`dashboard-builder`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`esign-field-placement`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`hermes-imports`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`inventory-demand-planning`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`ito-compute`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`ito-inference`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`ito-training`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`latency-critical-systems`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`module-governance`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`parallel-execution-optimizer`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`production-scheduling`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`recursive-decision-ledger`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`social-graph-ranker`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`token-card`** : Score de pertinence (14/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`aside`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`learn`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`learn-eval`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`skill-health`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`agent-introspection-debugging`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`benchmark-optimization-loop`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`brand-discovery`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`cisco-ios-patterns`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`ck`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`competitive-platform-analysis`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`competitive-report-structure`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`email-ops`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`context-and-decisions`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`context-budget`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`continuous-agent-loop`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`cost-tracking`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`council-multi-model`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`deepseek-harness-setup`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`dev-team`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`finance-billing-ops`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`google-workspace-ops`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`growth-log`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`homelab-network-setup`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`i18n-sync`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`investor-materials`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`investor-outreach`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`living-docs-governance`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`loop-design-check`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`make-interfaces-feel-better`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`manim-video`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`master-agreement-generator`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`messages-ops`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`nanoclaw-repl`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`nasiko-control-plane`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`orch-refine-code`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`plan-canvas`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`research-ops`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`project-flow-ops`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`scientific-thinking-literature-review`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`scientific-thinking-scholar-evaluation`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`seo`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`skill-host-compat`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`terminal-opener`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`unified-memory`** : Score de pertinence (7/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`checkpoint`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`auto-update`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`cost-report`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`epic-claim`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`epic-decompose`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`epic-publish`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`epic-review`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`epic-sync`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`epic-unblock`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`epic-validate`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`instinct-import`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`hookify-configure`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`hookify-help`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`hookify-list`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`loop-start`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`loop-status`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`model-route`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`projects`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`promote`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`prp-prd`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`prune`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`quality-gate`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`sessions`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.
- **`setup-pm`** : Score de pertinence (0/100) inférieur au seuil requis (15/100) pour le preset THOROUGH.

---

## 3. Licence et Attribution Obligatoire (Everything Claude Code — MIT License)

Les composants marqués `ecc_verbatim` ou `ecc_adapted` proviennent du projet open-source **Everything Claude Code (ECC)** créé par **Affaan Mustafa** ([https://github.com/affaan-m/ECC](https://github.com/affaan-m/ECC)), distribué sous licence **MIT** :

```text
MIT License

Copyright (c) 2026 Affaan Mustafa

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
