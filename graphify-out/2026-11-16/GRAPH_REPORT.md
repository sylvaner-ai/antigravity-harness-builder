# Graph Report - antigravity-harness-builder  (2026-11-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1065 nodes · 2729 edges · 58 communities (43 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b1d5fe79`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- getDb
- audit-extractor.ts
- catalog-fixture.ts
- antigravity-adapter/schema.ts
- app
- exporter.ts
- test
- 0000_talented_squirrel_girl.sql
- component-classifier.ts
- gemini-adapter.ts
- source-registry.ts
- compilerOptions
- builder.ts
- auth-hardening.test.ts
- catalog-service.ts
- upgrade-plan.ts
- dependencies
- project-profile/schema.ts
- catalog-builder.ts
- runner.ts
- postgres
- steps
- templates.ts
- context-governance.test.ts
- engine.ts
- ProjectProfile
- devDependencies
- bench-antigravity.mts
- selection-engine/schema.ts
- selftest-pack.test.ts
- orchestration-generator.ts
- scenarios.ts
- vitest
- package.json
- scripts
- golden-dataset.test.ts
- catalog-sources.ts
- SelectionEngine
- multi-source-slots.test.ts
- tar-extractor.ts
- ref_node_path
- content-safety.ts
- upload-limits.ts
- BenchScenario
- drizzle-kit
- proxy.ts
- 0005_dry_mandarin.sql
- postcss@^8.5.3
- tailwindcss@^3.4.17
- @types/react-dom@^19.0.4

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 51 edges
2. `AuthService` - 44 edges
3. `next` - 37 edges
4. `vitest` - 35 edges
5. `ProjectProfile` - 32 edges
6. `drizzle-orm` - 29 edges
7. `buildDeterministicHarnessPackage()` - 28 edges
8. `requireAuthUser()` - 27 edges
9. `compilerOptions` - 24 edges
10. `buildMultiSourceCatalog()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `adapterWithClient()` --calls--> `GeminiLLMAdapter`  [EXTRACTED]
  tests/llm-limits.test.ts → src/modules/llm-gateway/gemini-adapter.ts
- `runSelection()` --calls--> `SelectionEngine`  [EXTRACTED]
  tests/support/catalog-fixture.ts → src/modules/selection-engine/engine.ts
- `buildFixtureCatalog()` --calls--> `buildMultiSourceCatalog()`  [EXTRACTED]
  tests/multi-source-slots.test.ts → src/modules/catalog/catalog-builder.ts
- `bench()` --calls--> `buildBenchScenarios()`  [EXTRACTED]
  tests/bench.test.ts → src/modules/bench/scenarios.ts
- `profileFromSpec()` --calls--> `extractHeuristicProjectProfile()`  [EXTRACTED]
  tests/harness-pertinence.test.ts → src/modules/project-profile/heuristic-extractor.ts

## Import Cycles
- None detected.

## Communities (58 total, 15 thin omitted)

### Community 0 - "getDb"
Cohesion: 0.05
Nodes (70): nextConfig, drizzle-orm, next, askHidden(), main(), readPassword(), GET(), NewSourceSchema (+62 more)

### Community 1 - "audit-extractor.ts"
Cohesion: 0.05
Nodes (50): lucide-react, react, AnalysisSummary(), callApi(), CatalogAdminPage(), formatDate(), ROLE_LABELS, SourceRow (+42 more)

### Community 2 - "catalog-fixture.ts"
Cohesion: 0.06
Nodes (55): catalog, components, file, full, golden, keep, reloaded, AntigravitySurface (+47 more)

### Community 3 - "antigravity-adapter/schema.ts"
Cohesion: 0.07
Nodes (33): AntigravitySubagentToolSchema, CommandExecutionPolicy, CommandExecutionPolicySchema, ComponentOriginStatus, ComponentOriginStatusSchema, ConfigurabilityStatus, ConfigurabilityStatusSchema, KebabSlugSchema (+25 more)

### Community 4 - "app"
Cohesion: 0.06
Nodes (34): name, name, build, container_name, depends_on, environment, healthcheck, ports (+26 more)

### Community 5 - "exporter.ts"
Cohesion: 0.15
Nodes (31): adaptAgentMarkdown(), sanitizeClaudeSpecificReferences(), serializeAntigravityRule(), serializeAntigravitySkill(), serializeAntigravitySubagent(), splitMarkdownFrontmatter(), translateToolsToAntigravity(), ANTIGRAVITY_LIMITS (+23 more)

### Community 6 - "test"
Cohesion: 0.06
Nodes (31): DATABASE_URL, GITHUB_TOKEN, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, RUN_LIVE_GITHUB_TESTS, jobs, test (+23 more)

### Community 7 - "0000_talented_squirrel_girl.sql"
Cohesion: 0.10
Nodes (22): "ecc_components", ecc_components_sync_external_idx, ecc_components_sync_kind_idx, "ecc_syncs", ecc_syncs_active_idx, "generated_artifacts", generated_artifacts_generation_id_idx, "harness_generations" (+14 more)

### Community 8 - "component-classifier.ts"
Cohesion: 0.08
Nodes (29): assessPlatformFit(), BACKEND_TECH, buildProjectContext(), classifyComponent(), classifyEccLike(), CLOUDFLARE_SKILLS, COMMON_RULE_TIERS, CURATED (+21 more)

### Community 9 - "gemini-adapter.ts"
Cohesion: 0.17
Nodes (13): GeminiLLMAdapter, normalizeProfileJson(), estimateTokens(), LlmLimits, positiveInt(), readLlmLimits(), MockLLMAdapter, computeLLMCacheKey() (+5 more)

### Community 10 - "source-registry.ts"
Cohesion: 0.17
Nodes (22): ActionSchema, DELETE(), PATCH(), catalogSources, activeCatalogKeys(), activeSourceConfigs(), addCatalogSource(), analyzeCatalogSource() (+14 more)

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+18 more)

### Community 12 - "builder.ts"
Cohesion: 0.12
Nodes (23): ALLOWED_TOOLS_SET, ModelTranslationResult, ToolTranslationResult, translateModelToAntigravity(), ANTIGRAVITY_ALLOWED_SUBAGENT_TOOLS, AntigravityRuleFrontmatter, AntigravityRuleFrontmatterSchema, AntigravitySkillFrontmatter (+15 more)

### Community 13 - "auth-hardening.test.ts"
Cohesion: 0.17
Nodes (10): dynamic, GET(), POST(), POST(), clientIp(), Entry, LoginThrottle, loginThrottle (+2 more)

### Community 14 - "catalog-service.ts"
Cohesion: 0.15
Nodes (7): sanitizeErrorMessage(), CatalogComponentRecord, CatalogFetcher, CatalogService, CatalogSyncRecord, GitHubCatalogFetcher, SearchCatalogOptions

### Community 15 - "upgrade-plan.ts"
Cohesion: 0.16
Nodes (15): computeUpgradePlan(), isInventoriedByAudit(), LABELS, ORDER, overlapsModelEffortGovernance(), renderUpgradePlanMarkdown(), sha256(), UpgradeAction (+7 more)

### Community 16 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, drizzle-orm@^0.45.4, @google/genai@^2.32.0, isomorphic-dompurify@^2.21.0, js-yaml@^4.1.0, lucide-react@^1.64.0, mammoth@^1.9.0, next@^16.4.5 (+12 more)

### Community 17 - "project-profile/schema.ts"
Cohesion: 0.11
Nodes (17): zod, AntigravitySurfaceSchema, ConfidenceLevel, ConfidenceLevelSchema, DesignSystemProfile, DesignSystemProfileSchema, EpistemicStatus, EpistemicStatusSchema (+9 more)

### Community 18 - "catalog-builder.ts"
Cohesion: 0.18
Nodes (18): ValidationIssue, adaptSourceContent(), buildModuleIndex(), buildMultiSourceCatalog(), findModule(), issue(), MultiSourceCatalog, SourceBuildReport (+10 more)

### Community 19 - "runner.ts"
Cohesion: 0.20
Nodes (17): AgyResult, changedFiles(), copyProject(), durationToMs(), executeBench(), flattenNumbers(), fmt(), IGNORED_TOP_DIRS (+9 more)

### Community 20 - "postgres"
Cohesion: 0.11
Nodes (18): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test, timeout, container_name (+10 more)

### Community 21 - "steps"
Cohesion: 0.11
Nodes (18): GRAPHIFY_FORCE, jobs, update-graph, name, on, push, permissions, contents (+10 more)

### Community 22 - "templates.ts"
Cohesion: 0.20
Nodes (16): GENERATOR_REPOSITORY_URL, NATIVE_SLASH_COMMANDS, renderSlashCommandBullets(), SLASH_COMMAND_SUGGESTION_POLICY, SlashCommandGuide, formatEpistemicBadge(), onDemandTopic(), renderAgentsMarkdown() (+8 more)

### Community 23 - "context-governance.test.ts"
Cohesion: 0.20
Nodes (14): ALWAYS_ON_BUDGET_BYTES, AlwaysOnBudgetResult, convertGlobRulesToModelDecision(), enforceAlwaysOnBudget(), GLOB_DESCRIPTION_MAX, isProtected(), isReviewerSlug(), keepRank() (+6 more)

### Community 24 - "engine.ts"
Cohesion: 0.18
Nodes (16): inferRecommendedModelEffortPair(), renderModelEffortGovernanceRuleBody(), Methodology, SlotTier, synthesizeProjectCustomComponents(), CANONICAL_LANG_MAP, CLASSIFIED_CAPS, containsWord() (+8 more)

### Community 25 - "ProjectProfile"
Cohesion: 0.26
Nodes (9): ANTIGRAVITY_MUTATION_TOOLS, AuditBundleIngestion, BuiltHarnessPackage, HarnessManifest, ProjectProfile, SelectionResult, EvaluationAxisResult, GoldenDatasetEvaluationReport (+1 more)

### Community 26 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, autoprefixer@^10.4.20, esbuild@^0.28.2, tsx@^4.19.3, @types/js-yaml@^4.0.9, @types/node@^22.13.0, @types/react@^19.0.10, typescript@^5.8.2 (+8 more)

### Community 27 - "bench-antigravity.mts"
Cohesion: 0.12
Nodes (12): agy, jsonl, outDir, printTimeout, probeDir, project, runs, scenarios (+4 more)

### Community 28 - "selection-engine/schema.ts"
Cohesion: 0.14
Nodes (14): CURATED_SOURCE_ID, ComponentKindSchema, ComponentOrigin, ComponentOriginSchema, CustomComponentSpecSchema, ExcellencePackSchema, PresetModeSchema, RejectedComponent (+6 more)

### Community 29 - "selftest-pack.test.ts"
Cohesion: 0.18
Nodes (13): randomNonce(), renderSelfTestGuide(), renderSelfTestScript(), SELFTEST_ALLOWED_PATH, SELFTEST_NONCE_PATTERN, SelfTestFile, SelfTestPack, SelfTestProbe (+5 more)

### Community 30 - "orchestration-generator.ts"
Cohesion: 0.21
Nodes (9): CatalogComponentMeta, HarnessBuilderService, generateOrchestrationPlan(), OrchestrationPlanOptions, formatModelEffortCouple(), renderSlashCommandTable(), ClassifiableComponent, CatalogCandidateInput (+1 more)

### Community 31 - "scenarios.ts"
Cohesion: 0.22
Nodes (13): appendToAgents(), BENCH_PLANTED_FILE, BenchRunContext, buildBenchScenarios(), containsToken(), findWait(), onDemandSection(), SETTING_WORD (+5 more)

### Community 32 - "vitest"
Cohesion: 0.26
Nodes (7): vitest, AntigravitySubagentFrontmatterSchema, PackageFileEntry, DeterministicPackageInput, parseHarnessManifest(), snapshot, createSampleDeterministicInput()

### Community 33 - "package.json"
Cohesion: 0.18
Nodes (10): description, @types/pdf-parse@^1.1.5, @types/pg@^8.11.11, engines, node, name, private, version (+2 more)

### Community 34 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, admin:user, build, db:generate, db:migrate, dev, fixtures:selection, start (+3 more)

### Community 35 - "golden-dataset.test.ts"
Cohesion: 0.33
Nodes (6): ALL_EXCELLENCE_PACKS, CRUD_SIMPLE_PROFILE, HIGH_SECURITY_INJECTION_PROFILE, INCOMPLETE_CONTRADICTORY_PROFILE, RICH_DESIGN_SYSTEM_PROFILE, SAAS_MULTI_TENANT_PROFILE

### Community 36 - "catalog-sources.ts"
Cohesion: 0.24
Nodes (9): CatalogSourceCategory, CatalogSourceRole, ComponentProvenance, CURATED_SOURCE_PRIORITY, findSourceByUrl(), REDISTRIBUTABLE_LICENSES, resolveComponentProvenance(), UNKNOWN_SOURCE_PRIORITY (+1 more)

### Community 37 - "SelectionEngine"
Cohesion: 0.33
Nodes (6): ComponentClassification, unmetRequirement(), matchLanguagesStrict(), normalizeLangToken(), SelectionEngine, ScoreBreakdown

### Community 38 - "multi-source-slots.test.ts"
Cohesion: 0.36
Nodes (7): agent(), buildFixtureCatalog(), ECC_MANIFEST, findSourceById(), rule(), skill(), snapshot()

### Community 39 - "tar-extractor.ts"
Cohesion: 0.36
Nodes (7): fflate@^0.8.2, fflate, snapshots, extractTarGzTextFilesInMemory(), isRelevantCatalogPath(), parsePaxPathRecord(), readNullTerminatedAscii()

### Community 40 - "ref_node_path"
Cohesion: 0.25
Nodes (4): compiledPath, fs, path, { spawnSync }

### Community 41 - "content-safety.ts"
Cohesion: 0.25
Nodes (7): CLAUDE_SPECIFIC_PATTERNS, CLAUDE_SPECIFIC_THRESHOLD, ContentSafetyVerdict, META_TOOLING_SLUGS, PlatformFitVerdict, SECRET_EXFILTRATION, ZERO_WIDTH_BLOCK_THRESHOLD

### Community 42 - "upload-limits.ts"
Cohesion: 0.53
Nodes (4): checkUploadLimits(), positiveInt(), readUploadLimits(), UploadLimits

## Knowledge Gaps
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `getDb`, `audit-extractor.ts`, `catalog-fixture.ts`, `exporter.ts`, `gemini-adapter.ts`, `source-registry.ts`, `auth-hardening.test.ts`, `catalog-service.ts`, `upgrade-plan.ts`, `project-profile/schema.ts`, `runner.ts`, `templates.ts`, `context-governance.test.ts`, `devDependencies`, `selftest-pack.test.ts`, `orchestration-generator.ts`, `package.json`, `golden-dataset.test.ts`, `multi-source-slots.test.ts`, `upload-limits.ts`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Should `getDb` be split into smaller, more focused modules?**
  _Cohesion score 0.05268168835290384 - nodes in this community are weakly interconnected._
- **Why does `next` connect `getDb` to `package.json`, `audit-extractor.ts`, `source-registry.ts`, `auth-hardening.test.ts`, `proxy.ts`, `dependencies`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `audit-extractor.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0528169014084507 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `project-profile/schema.ts` to `getDb`, `package.json`, `audit-extractor.ts`, `antigravity-adapter/schema.ts`, `gemini-adapter.ts`, `source-registry.ts`, `dependencies`, `selection-engine/schema.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `catalog-fixture.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05547785547785548 - nodes in this community are weakly interconnected._
- **Should `antigravity-adapter/schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07301587301587302 - nodes in this community are weakly interconnected._