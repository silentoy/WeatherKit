import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const modules = ["iRingo.WeatherKit.Surge.iOS27.sgmodule", "iRingo.WeatherKit.iOS27.sgmodule"];

for (const name of modules) {
    test(`${name} publishes cache-busted fork bundles`, async () => {
        const source = await readFile(new URL(`../modules/${name}`, import.meta.url), "utf8");
        const version = source.match(/^#!version = (.+)$/m)?.[1];
        assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
        assert.match(source, /^#!modified = 2026-07-11 \d{2}:\d{2}:\d{2} \+08:00$/m);
        assert.match(source, /api\.v2\.weather\.request = type=http-request/);
        assert.match(source, /api\.v3\.weather\.request = type=http-request/);
        assert.match(source, new RegExp(`https://raw\\.githubusercontent\\.com/silentoy/WeatherKit/main/dist/request\\.bundle\\.js\\?v=${version.replaceAll(".", "\\.")}`));
        assert.match(source, new RegExp(`https://raw\\.githubusercontent\\.com/silentoy/WeatherKit/main/dist/response\\.bundle\\.js\\?v=${version.replaceAll(".", "\\.")}`));
        assert.doesNotMatch(source, /NSRingo\/WeatherKit\/releases\/download\/v4\.3\.0/);
    });
}

test("bundles expose build version and modification time at the top", async () => {
    const [request, response] = await Promise.all([
        readFile(new URL("../dist/request.bundle.js", import.meta.url), "utf8"),
        readFile(new URL("../dist/response.bundle.js", import.meta.url), "utf8"),
    ]);
    for (const bundle of [request, response]) {
        const top = bundle.split("\n").slice(0, 8).join("\n");
        assert.match(top, /Modified: 2026-07-11/);
        assert.match(top, /Version: \d+\.\d+\.\d+/);
    }
});
