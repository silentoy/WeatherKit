# Fixed Temperature Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a temporary `Debug.FixedTemperature:2` Surge option that forces the iOS 27 Weather app's current and apparent temperatures to `2°C` for visual acceptance.

**Architecture:** Read the optional debug value from existing `Settings.Debug` after normal dataset injection and before the existing v3 in-place FlatBuffer patch. Only mark and patch `currentWeather`; preserve daily/hourly data, Apple metadata, and byte length.

**Tech Stack:** JavaScript ES modules, FlatBuffers, Node.js built-in test runner, Rspack, Surge modules.

## Global Constraints

- Only override `currentWeather.temperature` and `currentWeather.temperatureApparent`.
- Do not change hourly or daily temperatures.
- Do not change Apple metadata or FlatBuffer byte length.
- Ignore missing, empty, or non-finite fixed-temperature values.
- Do not add dependencies or abstractions.
- Publish version `4.3.1-ios27.2` with a fresh `#!modified` timestamp and versioned raw bundle URLs.

---

### Task 1: Fixed current-temperature override

**Files:**
- Modify: `test/weatherkit-response.test.mjs`
- Modify: `src/process/Response.mjs`
- Modify: `src/types.d.ts`

**Interfaces:**
- Consumes: `Settings.Debug.FixedTemperature` as a number or numeric string.
- Produces: the existing `Response($request, $response)` result with current and apparent temperatures patched to the requested finite number.

- [ ] **Step 1: Write the failing response test**

Add a fixture-backed test that sets:

```js
globalThis.$argument = {
    Storage: "Argument",
    LogLevel: "OFF",
    Weather: { Provider: "WeatherKit", Replace: ["CN"] },
    NextHour: { Provider: "WeatherKit" },
    Debug: { FixedTemperature: 2 },
};
```

Assert that `currentWeather.temperature` and `temperatureApparent` equal `2`, daily/hourly temperatures and Apple metadata equal the original values, the response byte length is unchanged, and diagnostics report `currentWeather` as injected.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/weatherkit-response.test.mjs`

Expected: FAIL because current temperature remains the original Apple value.

- [ ] **Step 3: Implement the minimal override**

After per-dataset injection and before v3 patching, convert the configured value with `Number(...)`, require a non-empty finite value plus a present/requested `currentWeather`, then set only:

```js
body.currentWeather.temperature = fixedTemperature;
body.currentWeather.temperatureApparent = fixedTemperature;
if (!injected.includes("currentWeather")) injected.push("currentWeather");
```

Add `FixedTemperature?: number | string` beside `VisibleProviderMark` in `src/types.d.ts`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test test/weatherkit-response.test.mjs`

Expected: all response tests PASS.

### Task 2: Publish the 2°C acceptance module

**Files:**
- Modify: `test/weatherkit-publication.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `modules/iRingo.WeatherKit.Surge.iOS27.sgmodule`
- Modify: `modules/iRingo.WeatherKit.iOS27.sgmodule`
- Rebuild: `dist/request.bundle.js`
- Rebuild: `dist/response.bundle.js`

**Interfaces:**
- Consumes: module parameter `Debug.FixedTemperature`.
- Produces: version `4.3.1-ios27.2` modules and cache-busted bundles containing the fixed-temperature implementation.

- [ ] **Step 1: Write the failing publication test**

Require both iOS 27 module files to contain `Debug.FixedTemperature:2`, forward `Debug.FixedTemperature="{{{Debug.FixedTemperature}}}"`, and publish version `4.3.1-ios27.2`.

- [ ] **Step 2: Run the publication test and verify RED**

Run: `node --test test/weatherkit-publication.test.mjs`

Expected: FAIL because the modules still publish `4.3.1-ios27.1` without the fixed-temperature argument.

- [ ] **Step 3: Update publication files**

Set package and lockfile version to `4.3.1-ios27.2`. Add `Debug.FixedTemperature:2` to both module argument headers and explain that it temporarily fixes current/feels-like temperature. Forward the value to both weather response script invocations, update `#!date`/`#!modified`, and replace all cache query versions with `4.3.1-ios27.2`.

- [ ] **Step 4: Build and verify GREEN**

Run:

```bash
npm run build
node --test test/*.test.mjs
node --check src/process/Response.mjs
node --check src/class/WeatherKit2Patcher.mjs
git diff --check
```

Expected: build exits 0, all tests pass, syntax checks exit 0, and diff check is empty.

- [ ] **Step 5: Commit, push, and verify raw publication**

Commit source, tests, modules, plan, and both bundles; do not add `scratch/`. Push `main`, then fetch the canonical module plus both bundle URLs and require HTTP 200, version `4.3.1-ios27.2`, and the fresh modification marker.
