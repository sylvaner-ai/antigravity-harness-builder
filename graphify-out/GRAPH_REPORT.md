# Graph Report - AntigravityHarnessBuilder  (2026-11-16)

## Corpus Check
- 184 files · ~359,642 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 5, .lock 1, .example 1)

## Summary
- 1033 nodes · 2694 edges · 54 communities (45 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7d3b484a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- getDb
- catalog-fixture.ts
- runner.ts
- catalog/page.tsx
- antigravity-adapter/schema.ts
- app
- catalog-sources.ts
- component-classifier.ts
- test
- builder.ts
- exporter.ts
- project-profile/schema.ts
- selection-engine/schema.ts
- indexer.ts
- compilerOptions
- source-registry.ts
- package-exporter/schema.ts
- milestone2-catalog.test.ts
- auth-hardening.test.ts
- vitest
- engine.ts
- dependencies
- postgres
- devDependencies
- db/index.ts
- ProjectProfile
- package.json
- scripts
- download/route.ts
- generate/route.ts
- orchestration-generator.ts
- catalog-source-registry.test.ts
- selftest.sh
- catalog-service.ts
- sources/route.ts
- autoprefixer@^10.4.20
- steps
- next
- @types/pg@^8.11.11
- selftest-pack.test.ts
- audit-bundle.ts
- bench-antigravity.mts
- milestone3-documents-and-profile.test.ts
- scenarios.ts
- content-safety.ts
- ref_node_child_process
- upload-limits.ts
- BenchScenario
- proxy.ts
- @google/genai
- @types/pdf-parse@^1.1.5

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
- `snapshots` --calls--> `extractTarGzTextFilesInMemory()`  [EXTRACTED]
  scripts/build-selection-fixtures.mts → src/modules/catalog/tar-extractor.ts
- `bench()` --calls--> `buildBenchScenarios()`  [EXTRACTED]
  tests/bench.test.ts → src/modules/bench/scenarios.ts
- `adapterWithClient()` --calls--> `GeminiLLMAdapter`  [EXTRACTED]
  tests/llm-limits.test.ts → src/modules/llm-gateway/gemini-adapter.ts
- `profileFromSpec()` --calls--> `extractHeuristicProjectProfile()`  [EXTRACTED]
  tests/harness-pertinence.test.ts → src/modules/project-profile/heuristic-extractor.ts
- `profileOf()` --calls--> `extractHeuristicProjectProfile()`  [EXTRACTED]
  tests/multi-source-slots.test.ts → src/modules/project-profile/heuristic-extractor.ts

## Import Cycles
- None detected.

## Communities (54 total, 9 thin omitted)

### Community 0 - "getDb"
Cohesion: 0.19
Nodes (14): main(), POST(), GET(), POST(), POST(), GET(), POST(), DELETE() (+6 more)

### Community 1 - "catalog-fixture.ts"
Cohesion: 0.06
Nodes (53): catalog, components, file, full, golden, keep, reloaded, DEFAULT_CATALOG_SOURCES (+45 more)

### Community 2 - "runner.ts"
Cohesion: 0.21
Nodes (16): AgyResult, changedFiles(), copyProject(), durationToMs(), executeBench(), flattenNumbers(), fmt(), IGNORED_TOP_DIRS (+8 more)

### Community 3 - "catalog/page.tsx"
Cohesion: 0.07
Nodes (36): lucide-react, react, AnalysisSummary(), callApi(), CatalogAdminPage(), formatDate(), ROLE_LABELS, SourceRow (+28 more)

### Community 4 - "antigravity-adapter/schema.ts"
Cohesion: 0.09
Nodes (32): ALLOWED_TOOLS_SET, ModelTranslationResult, ToolTranslationResult, ANTIGRAVITY_ALLOWED_SUBAGENT_TOOLS, ANTIGRAVITY_MUTATION_TOOLS, AntigravityRuleFrontmatter, AntigravityRuleFrontmatterSchema, AntigravitySkillFrontmatter (+24 more)

### Community 5 - "app"
Cohesion: 0.06
Nodes (34): name, name, build, container_name, depends_on, environment, healthcheck, ports (+26 more)

### Community 6 - "catalog-sources.ts"
Cohesion: 0.13
Nodes (27): adaptSourceContent(), buildModuleIndex(), buildMultiSourceCatalog(), findModule(), issue(), MultiSourceCatalog, SourceBuildReport, SourceSnapshot (+19 more)

### Community 7 - "component-classifier.ts"
Cohesion: 0.07
Nodes (34): CatalogComponentMeta, CURATED_SOURCE_PRIORITY, UNKNOWN_SOURCE_PRIORITY, assessPlatformFit(), BACKEND_TECH, buildProjectContext(), ClassifiableComponent, classifyComponent() (+26 more)

### Community 8 - "test"
Cohesion: 0.06
Nodes (31): DATABASE_URL, GITHUB_TOKEN, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, RUN_LIVE_GITHUB_TESTS, jobs, test (+23 more)

### Community 9 - "builder.ts"
Cohesion: 0.17
Nodes (19): HarnessBuilderOptions, ALWAYS_ON_BUDGET_BYTES, AlwaysOnBudgetResult, clip(), convertGlobRulesToModelDecision(), enforceAlwaysOnBudget(), GLOB_DESCRIPTION_MAX, isProtected() (+11 more)

### Community 10 - "exporter.ts"
Cohesion: 0.19
Nodes (23): resolveFileValidationTier(), validatePackagePathSafety(), GENERATOR_REPOSITORY_URL, buildDeterministicHarnessPackage(), DETERMINISTIC_ZIP_MTIME, verifyGeneratedZipIntegrity(), DeterministicPackageInput, renderSlashCommandBullets() (+15 more)

### Community 11 - "project-profile/schema.ts"
Cohesion: 0.06
Nodes (47): zod, POST(), AntigravitySurface, GeminiLLMAdapter, normalizeProfileJson(), estimateTokens(), LlmLimits, positiveInt() (+39 more)

### Community 12 - "selection-engine/schema.ts"
Cohesion: 0.11
Nodes (20): getComponentDescription(), StepSelectionPage(), AntigravitySurfaceSchema, ReasoningEffortTierSchema, RecommendedModelTierSchema, CURATED_SOURCE_ID, ComponentKindSchema, ComponentOrigin (+12 more)

### Community 13 - "indexer.ts"
Cohesion: 0.13
Nodes (26): adaptAgentMarkdown(), sanitizeClaudeSpecificReferences(), serializeAntigravitySkill(), serializeAntigravitySubagent(), splitMarkdownFrontmatter(), translateModelToAntigravity(), translateToolsToAntigravity(), ANTIGRAVITY_LIMITS (+18 more)

### Community 14 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+18 more)

### Community 15 - "source-registry.ts"
Cohesion: 0.19
Nodes (19): GET(), ActionSchema, DELETE(), PATCH(), CatalogSourceCategory, CatalogSourceRole, activeCatalogKeys(), activeSourceConfigs() (+11 more)

### Community 16 - "package-exporter/schema.ts"
Cohesion: 0.11
Nodes (17): ComponentOriginStatusSchema, CatalogReference, CatalogReferenceSchema, CatalogSourceReferenceSchema, DeterministicPackageInputSchema, HarnessManifestSchema, InputDocumentDigestSchema, LEGACY_ORIGIN_STATUS (+9 more)

### Community 17 - "milestone2-catalog.test.ts"
Cohesion: 0.21
Nodes (5): POST(), adminAction(), sanitizeErrorMessage(), CatalogFetcher, CatalogService

### Community 18 - "auth-hardening.test.ts"
Cohesion: 0.18
Nodes (8): dynamic, GET(), POST(), Entry, LoginThrottle, loginThrottle, ThrottleOptions, isRegistrationAllowed()

### Community 19 - "vitest"
Cohesion: 0.21
Nodes (9): vitest, HarnessBuilderService, CatalogCandidateInput, SelectionEngine, CRUD_SIMPLE_PROFILE, HIGH_SECURITY_INJECTION_PROFILE, INCOMPLETE_CONTRADICTORY_PROFILE, RICH_DESIGN_SYSTEM_PROFILE (+1 more)

### Community 20 - "engine.ts"
Cohesion: 0.14
Nodes (18): ComponentClassification, Methodology, SlotTier, unmetRequirement(), CANONICAL_LANG_MAP, CLASSIFIED_CAPS, containsWord(), escapeRegExp() (+10 more)

### Community 21 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, drizzle-orm@^0.45.4, fflate@^0.8.2, isomorphic-dompurify@^2.21.0, js-yaml@^4.1.0, lucide-react@^1.64.0, mammoth@^1.9.0, next@^16.4.5 (+11 more)

### Community 22 - "postgres"
Cohesion: 0.11
Nodes (18): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test, timeout, container_name (+10 more)

### Community 23 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, drizzle-kit@^0.31.11, esbuild@^0.28.2, postcss@^8.5.3, tailwindcss@^3.4.17, @types/js-yaml@^4.0.9, @types/node@^22.13.0, typescript@^5.8.2 (+8 more)

### Community 24 - "db/index.ts"
Cohesion: 0.18
Nodes (9): drizzle-orm, askHidden(), readPassword(), GET(), closeDbPool(), getDatabaseUrl(), getDbPool(), runMigrations() (+1 more)

### Community 25 - "ProjectProfile"
Cohesion: 0.26
Nodes (7): AuditBundleIngestion, BuiltHarnessPackage, ProjectProfile, SelectionResult, EvaluationAxisResult, GoldenDatasetEvaluationReport, GoldenDatasetEvaluator

### Community 26 - "package.json"
Cohesion: 0.15
Nodes (12): description, tsx@^4.19.3, @types/react@^19.0.10, @types/react-dom@^19.0.4, engines, node, name, private (+4 more)

### Community 27 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, admin:user, build, db:generate, db:migrate, dev, fixtures:selection, start (+3 more)

### Community 28 - "download/route.ts"
Cohesion: 0.11
Nodes (28): fflate, GET(), GET(), generatedArtifacts, harnessGenerations, buildInstallZip(), createInstallLink(), hashToken() (+20 more)

### Community 29 - "generate/route.ts"
Cohesion: 0.25
Nodes (9): POST(), catalogComponents, catalogSyncs, installLinks, projectProfiles, sessions, ensureDocumentDigests(), HarnessManifest (+1 more)

### Community 30 - "orchestration-generator.ts"
Cohesion: 0.20
Nodes (14): inferRecommendedModelEffortPair(), serializeAntigravityRule(), ReasoningEffortTier, RecommendedModelTier, generateOrchestrationPlan(), OrchestrationPlanOptions, formatModelEffortCouple(), renderModelEffortGovernanceRuleBody() (+6 more)

### Community 31 - "catalog-source-registry.test.ts"
Cohesion: 0.36
Nodes (5): catalogSources, parseGitHubRepository(), downloadRepositoryTarball(), skill(), buildSyntheticTarGz()

### Community 32 - "selftest.sh"
Cohesion: 0.62
Nodes (6): do_install(), do_remove(), do_status(), is_allowed(), selftest.sh script, write_file()

### Community 33 - "catalog-service.ts"
Cohesion: 0.24
Nodes (9): snapshots, CatalogComponentRecord, CatalogSyncRecord, SearchCatalogOptions, getBuiltinCuratedExcellenceComponents(), extractTarGzTextFilesInMemory(), isRelevantCatalogPath(), parsePaxPathRecord() (+1 more)

### Community 34 - "sources/route.ts"
Cohesion: 0.29
Nodes (5): NewSourceSchema, POST(), GitHubCatalogFetcher, addCatalogSource(), sourceIdFor()

### Community 37 - "steps"
Cohesion: 0.12
Nodes (16): jobs, update-graph, name, on, push, permissions, contents, branches (+8 more)

### Community 38 - "next"
Cohesion: 0.21
Nodes (9): nextConfig, next, POST(), POST(), projects, UserSession, clientIp(), ingestAuditBundle() (+1 more)

### Community 42 - "selftest-pack.test.ts"
Cohesion: 0.17
Nodes (13): randomNonce(), renderSelfTestGuide(), renderSelfTestScript(), SELFTEST_ALLOWED_PATH, SELFTEST_NONCE_PATTERN, SelfTestFile, SelfTestPack, SelfTestProbe (+5 more)

### Community 43 - "audit-bundle.ts"
Cohesion: 0.21
Nodes (5): AppDatabase, sourceDocuments, SourceDocumentRow, StoragePort, AntigravityAuditReport

### Community 44 - "bench-antigravity.mts"
Cohesion: 0.12
Nodes (13): agy, jsonl, outDir, printTimeout, probeDir, project, runs, scenarios (+5 more)

### Community 45 - "milestone3-documents-and-profile.test.ts"
Cohesion: 0.26
Nodes (6): POST(), extractDocumentText(), ExtractedDocumentResult, sanitizeTextForPromptSafety(), validateAndDetectMimeType(), LocalDiskStorage

### Community 46 - "scenarios.ts"
Cohesion: 0.24
Nodes (12): appendToAgents(), BENCH_PLANTED_FILE, BenchRunContext, buildBenchScenarios(), containsToken(), findWait(), onDemandSection(), SETTING_WORD (+4 more)

### Community 47 - "content-safety.ts"
Cohesion: 0.25
Nodes (7): CLAUDE_SPECIFIC_PATTERNS, CLAUDE_SPECIFIC_THRESHOLD, ContentSafetyVerdict, META_TOOLING_SLUGS, PlatformFitVerdict, SECRET_EXFILTRATION, ZERO_WIDTH_BLOCK_THRESHOLD

### Community 48 - "ref_node_child_process"
Cohesion: 0.33
Nodes (4): compiledPath, fs, path, { spawnSync }

### Community 49 - "upload-limits.ts"
Cohesion: 0.53
Nodes (4): checkUploadLimits(), positiveInt(), readUploadLimits(), UploadLimits

## Knowledge Gaps
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `catalog-fixture.ts`, `runner.ts`, `catalog-sources.ts`, `selftest-pack.test.ts`, `project-profile/schema.ts`, `audit-bundle.ts`, `indexer.ts`, `milestone3-documents-and-profile.test.ts`, `exporter.ts`, `milestone2-catalog.test.ts`, `auth-hardening.test.ts`, `upload-limits.ts`, `devDependencies`, `db/index.ts`, `package.json`, `download/route.ts`, `catalog-source-registry.test.ts`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `catalog-fixture.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05721153846153846 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `getDb`, `sources/route.ts`, `catalog/page.tsx`, `project-profile/schema.ts`, `selection-engine/schema.ts`, `milestone3-documents-and-profile.test.ts`, `source-registry.ts`, `milestone2-catalog.test.ts`, `auth-hardening.test.ts`, `proxy.ts`, `dependencies`, `db/index.ts`, `package.json`, `download/route.ts`, `generate/route.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `catalog/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07474600870827286 - nodes in this community are weakly interconnected._
- **Why does `ProjectProfile` connect `ProjectProfile` to `getDb`, `catalog-fixture.ts`, `catalog/page.tsx`, `component-classifier.ts`, `builder.ts`, `audit-bundle.ts`, `project-profile/schema.ts`, `vitest`, `engine.ts`, `generate/route.ts`, `orchestration-generator.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `antigravity-adapter/schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08739495798319327 - nodes in this community are weakly interconnected._
- **Should `app` be split into smaller, more focused modules?**
  _Cohesion score 0.06386554621848739 - nodes in this community are weakly interconnected._