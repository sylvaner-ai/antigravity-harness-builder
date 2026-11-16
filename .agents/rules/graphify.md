---
trigger: always_on
description: Consult the graphify knowledge graph at graphify-out/ for codebase and architecture questions.
---

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- For codebase or architecture questions, when `graphify-out/graph.json` exists, first run `graphify query "<question>"` (CLI) or `query_graph` (MCP). Use `graphify path "<A>" "<B>"` / `shortest_path` for relationships and `graphify explain "<concept>"` / `get_node` for focused concepts. When the answer is under a Markdown heading, `graphify section "<heading>"` / `get_section` returns that section's text, so the .md need not be opened. These return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output.
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## Workflow Hybride (Antigravity VPS + Claude Code Cloud + Coolify)

- **Priorité au graphe de connaissances :** Avant toute recherche de fichiers (`grep`, `find`, lecture massive), lis **toujours** `graphify-out/GRAPH_REPORT.md` et requête `graphify-out/graph.json` (`graphify query "<question>"`, `graphify path`, `graphify explain`).
- **Claude Code (Cloud) :** Tu travailles dans un environnement distant éphémère à partir du dépôt GitHub. Tu n'as **pas** besoin de regénérer le graphe manuellement — la CI GitHub Actions (`.github/workflows/graphify.yml`) met à jour `graphify-out/` automatiquement à chaque merge sur `main`/`master`. Appuie-toi sur le graphe existant.
- **Antigravity (VPS / Coolify) :** Tu travailles directement sur le VPS de production/hébergement géré via **Coolify**. Fais particulièrement attention à ne pas casser les configurations de déploiement Docker/Coolify (`Dockerfile`, `docker-compose*.yml`, `.dockerignore`, variables d'environnement, ports et volumes).
