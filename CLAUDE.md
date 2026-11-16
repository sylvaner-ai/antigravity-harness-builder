## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. When the answer is under a Markdown heading, `graphify section "<heading>"` prints that section's text, so the .md need not be opened. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## Workflow Hybride (Antigravity VPS + Claude Code Cloud + Coolify)

- **Priorité au graphe de connaissances :** Avant toute recherche de fichiers (`grep`, `find`, lecture massive), lis **toujours** `graphify-out/GRAPH_REPORT.md` et requête `graphify-out/graph.json` (`graphify query "<question>"`, `graphify path`, `graphify explain`).
- **Claude Code (Cloud) :** Tu travailles dans un environnement distant éphémère à partir du dépôt GitHub. Tu n'as **pas** besoin de regénérer le graphe manuellement — la CI GitHub Actions (`.github/workflows/graphify.yml`) met à jour `graphify-out/` automatiquement à chaque merge sur `main`/`master`. Appuie-toi sur le graphe existant.
- **Antigravity (VPS / Coolify) :** Tu travailles directement sur le VPS de production/hébergement géré via **Coolify**. Fais particulièrement attention à ne pas casser les configurations de déploiement Docker/Coolify (`Dockerfile`, `docker-compose*.yml`, `.dockerignore`, variables d'environnement, ports et volumes).
