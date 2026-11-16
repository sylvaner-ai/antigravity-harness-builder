# Graph Report - antigravity-harness-builder  (2026-11-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1066 nodes · 2730 edges · 58 communities (43 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `74698df7`
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
- `profileFromSpec()` --calls--> `extractHeuristicProjectProfile()`  [EXTRACTED]
  tests/harness-pertinence.test.ts → src/modules/project-profile/heuristic-extractor.ts
- `profileOf()` --calls--> `extractHeuristicProjectProfile()`  [EXTRACTED]
  tests/multi-source-slots.test.ts → src/modules/project-profile/heuristic-extractor.ts

## Import Cycles
- None detected.

## Communities (58 total, 15 thin omitted)

### Community 0 - "getDb"
Cohesion: 0.06
Nodes (65): nextConfig, drizzle-orm, next, askHidden(), main(), readPassword(), GET(), POST() (+57 more)

### Community 1 - "audit-extractor.ts"
Cohesion: 0.06
Nodes (48): lucide-react, react, AnalysisSummary(), callApi(), CatalogAdminPage(), formatDate(), ROLE_LABELS, SourceRow (+40 more)

### Community 2 - "catalog-fixture.ts"
Cohesion: 0.06
Nodes (54): catalog, components, file, full, golden, keep, reloaded, AntigravitySurface (+46 more)

### Community 3 - "antigravity-adapter/schema.ts"
Cohesion: 0.08
Nodes (35): ALLOWED_TOOLS_SET, ModelTranslationResult, ToolTranslationResult, translateModelToAntigravity(), ANTIGRAVITY_ALLOWED_SUBAGENT_TOOLS, ANTIGRAVITY_MUTATION_TOOLS, AntigravityRuleFrontmatter, AntigravityRuleFrontmatterSchema (+27 more)

### Community 4 - "app"
Cohesion: 0.06
Nodes (34): name, name, build, container_name, depends_on, environment, healthcheck, ports (+26 more)

### Community 5 - "exporter.ts"
Cohesion: 0.06
Nodes (31): DATABASE_URL, GITHUB_TOKEN, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, RUN_LIVE_GITHUB_TESTS, jobs, test (+23 more)

### Community 6 - "test"
Cohesion: 0.08
Nodes (31): assessPlatformFit(), BACKEND_TECH, buildProjectContext(), ClassifiableComponent, classifyComponent(), classifyEccLike(), CLOUDFLARE_SKILLS, COMMON_RULE_TIERS (+23 more)

### Community 7 - "0000_talented_squirrel_girl.sql"
Cohesion: 0.10
Nodes (22): "ecc_components", ecc_components_sync_external_idx, ecc_components_sync_kind_idx, "ecc_syncs", ecc_syncs_active_idx, "generated_artifacts", generated_artifacts_generation_id_idx, "harness_generations" (+14 more)

### Community 8 - "component-classifier.ts"
Cohesion: 0.17
Nodes (27): sanitizeClaudeSpecificReferences(), serializeAntigravityRule(), serializeAntigravitySkill(), serializeAntigravitySubagent(), splitMarkdownFrontmatter(), ANTIGRAVITY_LIMITS, resolveFileValidationTier(), validatePackagePathSafety() (+19 more)

### Community 9 - "gemini-adapter.ts"
Cohesion: 0.16
Nodes (13): GeminiLLMAdapter, normalizeProfileJson(), estimateTokens(), LlmLimits, positiveInt(), readLlmLimits(), MockLLMAdapter, computeLLMCacheKey() (+5 more)

### Community 10 - "source-registry.ts"
Cohesion: 0.09
Nodes (24): AntigravitySkillFrontmatter, AntigravitySubagentFrontmatter, AntigravitySubagentFrontmatterSchema, ValidationIssueSchema, HarnessBuilderOptions, CatalogReference, CatalogReferenceSchema, CatalogSourceReferenceSchema (+16 more)

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+18 more)

### Community 12 - "builder.ts"
Cohesion: 0.11
Nodes (20): getComponentDescription(), StepSelectionPage(), ReasoningEffortTierSchema, RecommendedModelTierSchema, CURATED_SOURCE_ID, ComponentKindSchema, ComponentOrigin, ComponentOriginSchema (+12 more)

### Community 13 - "auth-hardening.test.ts"
Cohesion: 0.17
Nodes (10): dynamic, GET(), POST(), POST(), clientIp(), Entry, LoginThrottle, loginThrottle (+2 more)

### Community 14 - "catalog-service.ts"
Cohesion: 0.21
Nodes (11): vitest, CatalogComponentMeta, HarnessBuilderService, CatalogCandidateInput, SelectionEngine, ALL_EXCELLENCE_PACKS, CRUD_SIMPLE_PROFILE, HIGH_SECURITY_INJECTION_PROFILE (+3 more)

### Community 15 - "upgrade-plan.ts"
Cohesion: 0.17
Nodes (19): adaptSourceContent(), buildModuleIndex(), buildMultiSourceCatalog(), findModule(), issue(), MultiSourceCatalog, SourceBuildReport, authorFromCopyright() (+11 more)

### Community 16 - "dependencies"
Cohesion: 0.21
Nodes (8): AuditBundleIngestion, BuiltHarnessPackage, ProjectProfile, unmetRequirement(), SelectionResult, EvaluationAxisResult, GoldenDatasetEvaluationReport, GoldenDatasetEvaluator

### Community 17 - "project-profile/schema.ts"
Cohesion: 0.19
Nodes (16): ALWAYS_ON_BUDGET_BYTES, AlwaysOnBudgetResult, clip(), convertGlobRulesToModelDecision(), enforceAlwaysOnBudget(), GLOB_DESCRIPTION_MAX, isProtected(), isReviewerSlug() (+8 more)

### Community 18 - "catalog-builder.ts"
Cohesion: 0.16
Nodes (15): computeUpgradePlan(), isInventoriedByAudit(), LABELS, ORDER, overlapsModelEffortGovernance(), renderUpgradePlanMarkdown(), sha256(), UpgradeAction (+7 more)

### Community 19 - "runner.ts"
Cohesion: 0.10
Nodes (20): dependencies, drizzle-orm@^0.45.4, @google/genai@^2.32.0, isomorphic-dompurify@^2.21.0, js-yaml@^4.1.0, lucide-react@^1.64.0, mammoth@^1.9.0, next@^16.4.5 (+12 more)

### Community 20 - "postgres"
Cohesion: 0.11
Nodes (18): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test, timeout, container_name (+10 more)

### Community 21 - "steps"
Cohesion: 0.11
Nodes (18): GRAPHIFY_FORCE, jobs, update-graph, name, on, push, permissions, contents (+10 more)

### Community 22 - "templates.ts"
Cohesion: 0.11
Nodes (16): AntigravitySurfaceSchema, ConfidenceLevel, ConfidenceLevelSchema, DesignSystemProfile, DesignSystemProfileSchema, EpistemicStatus, EpistemicStatusSchema, FeatureSpecification (+8 more)

### Community 23 - "context-governance.test.ts"
Cohesion: 0.16
Nodes (16): ComponentClassification, Methodology, SlotTier, CANONICAL_LANG_MAP, CLASSIFIED_CAPS, containsWord(), escapeRegExp(), KNOWN_EXCLUSIVE_TECH (+8 more)

### Community 24 - "engine.ts"
Cohesion: 0.23
Nodes (14): AgyResult, changedFiles(), copyProject(), durationToMs(), executeBench(), flattenNumbers(), fmt(), IGNORED_TOP_DIRS (+6 more)

### Community 25 - "ProjectProfile"
Cohesion: 0.11
Nodes (15): agy, jsonl, outDir, printTimeout, probeDir, project, runs, scenarios (+7 more)

### Community 26 - "devDependencies"
Cohesion: 0.20
Nodes (16): NewSourceSchema, POST(), CatalogSourceCategory, CatalogSourceRole, activeCatalogKeys(), activeSourceConfigs(), addCatalogSource(), analyzeCatalogSource() (+8 more)

### Community 27 - "bench-antigravity.mts"
Cohesion: 0.21
Nodes (13): inferRecommendedModelEffortPair(), ReasoningEffortTier, RecommendedModelTier, generateOrchestrationPlan(), OrchestrationPlanOptions, formatModelEffortCouple(), renderModelEffortGovernanceRuleBody(), SubagentGovernanceEntry (+5 more)

### Community 28 - "selection-engine/schema.ts"
Cohesion: 0.12
Nodes (16): devDependencies, autoprefixer@^10.4.20, esbuild@^0.28.2, tsx@^4.19.3, @types/js-yaml@^4.0.9, @types/node@^22.13.0, @types/react@^19.0.10, typescript@^5.8.2 (+8 more)

### Community 29 - "selftest-pack.test.ts"
Cohesion: 0.18
Nodes (13): randomNonce(), renderSelfTestGuide(), renderSelfTestScript(), SELFTEST_ALLOWED_PATH, SELFTEST_NONCE_PATTERN, SelfTestFile, SelfTestPack, SelfTestProbe (+5 more)

### Community 30 - "orchestration-generator.ts"
Cohesion: 0.19
Nodes (8): fflate@^0.8.2, fflate, catalogSources, CatalogFetcher, DEFAULT_CATALOG_SOURCES, downloadRepositoryTarball(), skill(), buildSyntheticTarGz()

### Community 31 - "scenarios.ts"
Cohesion: 0.21
Nodes (9): zod, ActionSchema, DELETE(), PATCH(), GitHubCatalogFetcher, deleteCatalogSource(), getSource(), repinCatalogSource() (+1 more)

### Community 32 - "vitest"
Cohesion: 0.26
Nodes (13): GENERATOR_REPOSITORY_URL, renderSlashCommandBullets(), formatEpistemicBadge(), onDemandTopic(), renderAgentsMarkdown(), renderArchitectureMarkdown(), renderAssumptionsMarkdown(), renderAttributions() (+5 more)

### Community 33 - "package.json"
Cohesion: 0.23
Nodes (11): snapshots, SourceSnapshot, CatalogComponentRecord, CatalogSyncRecord, SearchCatalogOptions, CatalogSourceConfig, extractTarGzTextFilesInMemory(), isRelevantCatalogPath() (+3 more)

### Community 34 - "scripts"
Cohesion: 0.24
Nodes (12): appendToAgents(), BENCH_PLANTED_FILE, BenchRunContext, buildBenchScenarios(), containsToken(), findWait(), onDemandSection(), SETTING_WORD (+4 more)

### Community 35 - "golden-dataset.test.ts"
Cohesion: 0.18
Nodes (10): description, @types/pdf-parse@^1.1.5, @types/pg@^8.11.11, engines, node, name, private, version (+2 more)

### Community 36 - "catalog-sources.ts"
Cohesion: 0.18
Nodes (11): scripts, admin:user, build, db:generate, db:migrate, dev, fixtures:selection, start (+3 more)

### Community 37 - "SelectionEngine"
Cohesion: 0.33
Nodes (4): POST(), adminAction(), sanitizeErrorMessage(), CatalogService

### Community 38 - "multi-source-slots.test.ts"
Cohesion: 0.39
Nodes (5): adaptAgentMarkdown(), translateToolsToAntigravity(), parseHarnessManifest(), snapshot, createSampleDeterministicInput()

### Community 39 - "tar-extractor.ts"
Cohesion: 0.36
Nodes (7): agent(), buildFixtureCatalog(), ECC_MANIFEST, findSourceById(), rule(), skill(), snapshot()

### Community 40 - "ref_node_path"
Cohesion: 0.25
Nodes (7): CLAUDE_SPECIFIC_PATTERNS, CLAUDE_SPECIFIC_THRESHOLD, ContentSafetyVerdict, META_TOOLING_SLUGS, PlatformFitVerdict, SECRET_EXFILTRATION, ZERO_WIDTH_BLOCK_THRESHOLD

### Community 41 - "content-safety.ts"
Cohesion: 0.29
Nodes (4): compiledPath, fs, path, { spawnSync }

### Community 42 - "upload-limits.ts"
Cohesion: 0.53
Nodes (4): checkUploadLimits(), positiveInt(), readUploadLimits(), UploadLimits

## Knowledge Gaps
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `catalog-service.ts` to `getDb`, `audit-extractor.ts`, `catalog-fixture.ts`, `golden-dataset.test.ts`, `vitest`, `multi-source-slots.test.ts`, `tar-extractor.ts`, `component-classifier.ts`, `gemini-adapter.ts`, `upload-limits.ts`, `auth-hardening.test.ts`, `project-profile/schema.ts`, `catalog-builder.ts`, `templates.ts`, `engine.ts`, `selection-engine/schema.ts`, `selftest-pack.test.ts`, `orchestration-generator.ts`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Should `getDb` be split into smaller, more focused modules?**
  _Cohesion score 0.05652951699463327 - nodes in this community are weakly interconnected._
- **Why does `next` connect `getDb` to `audit-extractor.ts`, `golden-dataset.test.ts`, `SelectionEngine`, `builder.ts`, `auth-hardening.test.ts`, `proxy.ts`, `runner.ts`, `devDependencies`, `scenarios.ts`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `audit-extractor.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.056535504296698326 - nodes in this community are weakly interconnected._
- **Why does `getDb()` connect `getDb` to `package.json`, `SelectionEngine`, `devDependencies`, `orchestration-generator.ts`, `scenarios.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `catalog-fixture.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05576923076923077 - nodes in this community are weakly interconnected._
- **Should `antigravity-adapter/schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._