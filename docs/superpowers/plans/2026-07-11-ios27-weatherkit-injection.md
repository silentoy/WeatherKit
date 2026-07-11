# iOS 27 WeatherKit Injection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve iOS 27 WeatherKit v3 payload structure while making ColorfulClouds current, daily, and hourly values visible, then publish a cache-busted Surge module.

**Architecture:** Parse request context without destructive filtering, fetch each requested provider dataset independently, and patch only existing scalar slots in v3 FlatBuffers. Keep the existing v2/full-rebuild path for compatibility and use the captured WeatherKit response as the byte-level acceptance fixture.

**Tech Stack:** JavaScript ES modules, FlatBuffers JavaScript runtime, Node.js built-in test runner, Rspack, Surge modules.

## Global Constraints

- Keep Apple metadata, strings, vector lengths, unknown v3 fields, and original byte length unchanged for v3 current/daily/hourly injection.
- Keep minute-only and v2 behavior compatible.
- Do not add dependencies or speculative abstractions.
- Do not commit `scratch/`; use its captured response only as local acceptance evidence.
- Publish from `silentoy/WeatherKit` `main` only after fresh tests, build, diff review, and URL checks pass.

---

### Task 1: Request context and dataset fallback

**Files:**
- Modify: `src/function/parseWeatherKitURL.mjs`
- Modify: `src/process/Request.mjs`
- Test: `test/weatherkit-context.test.mjs`

**Interfaces:**
- Consumes: a WeatherKit URL and decoded response object.
- Produces: `parseWeatherKitURL(url)` with `version`, full `locale`, primary `language`, locale `region`, query `country`, coordinates, and query datasets; request processing removes conditional cache headers without deleting unknown datasets.

- [ ] Write tests for `zh-CN`, `zh-Hans-CN`, explicit country precedence, absent `dataSets`, and preservation of unknown datasets.
- [ ] Run `node --test test/weatherkit-context.test.mjs`; expect failures against the greedy parser/filtering behavior.
- [ ] Implement the minimal path-segment parser and remove only the destructive dataset filter.
- [ ] Re-run the test; expect all cases to pass.

### Task 2: v3 in-place scalar patching and isolated injection

**Files:**
- Create: `src/class/WeatherKit2Patcher.mjs`
- Modify: `src/process/Response.mjs`
- Test: `test/weatherkit-v3-patcher.test.mjs`
- Test: `test/weatherkit-response.test.mjs`

**Interfaces:**
- Consumes: original `Uint8Array`, decoded Apple weather, and independently merged replacement datasets.
- Produces: `{ bytes, writes, skipped }` where existing current/daily/hourly numeric or enum scalar slots are updated without changing buffer length or metadata bytes.

- [ ] Write fixture tests proving current/daily/hourly values change while byte length and Apple metadata remain unchanged; cover missing/default slots and no-op byte identity.
- [ ] Run the focused tests; expect failure because the patcher and per-dataset transaction do not exist.
- [ ] Implement table-slot writes using the vendored generated FlatBuffer readers and enum mappings; skip absent slots safely.
- [ ] Refactor the v3 response path to resolve country/datasets from query/body, isolate provider errors, use the in-place patcher, and write compact diagnostics.
- [ ] Keep v2 on validated rebuild and only remove length/encoding headers after a real modification.
- [ ] Re-run focused tests; expect all cases to pass.

### Task 3: Publication and acceptance

**Files:**
- Modify: `rspack.config.mjs`
- Modify: `modules/iRingo.WeatherKit.Surge.iOS27.sgmodule`
- Modify: `modules/iRingo.WeatherKit.iOS27.sgmodule`
- Modify: `dist/request.bundle.js`
- Modify: `dist/response.bundle.js`
- Test: `test/weatherkit-publication.test.mjs`

**Interfaces:**
- Consumes: built request/response bundles and canonical raw GitHub paths.
- Produces: canonical and compatibility Surge modules with semantic version, modification time, request and response hooks, and versioned raw bundle URLs.

- [ ] Write publication tests for header timestamp/version, both fork-hosted bundles, cache-busting query strings, request hook, and absence of the broken upstream `v4.3.0` URLs.
- [ ] Run the publication test; expect failure against current modules.
- [ ] Build bundles with a deterministic visible modification marker and update both module files to the same canonical URLs.
- [ ] Run `node --test test/*.test.mjs`, `npm run build`, syntax checks, and captured-response acceptance.
- [ ] Review `git diff --check`, tracked-file scope, and generated/source marker consistency.
- [ ] Commit only intended files, push `main`, then verify all three raw GitHub URLs return HTTP 200 and contain the pushed marker.
