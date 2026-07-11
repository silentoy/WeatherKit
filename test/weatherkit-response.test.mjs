import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import * as flatbuffers from "flatbuffers";
import ColorfulClouds from "../src/class/ColorfulClouds.mjs";
import WeatherKit2 from "../src/class/WeatherKit2.mjs";
import { Response } from "../src/process/Response.mjs";

globalThis.require = createRequire(import.meta.url);
const fixture = new URL("../scratch/original_chengdu.base64", import.meta.url);

function decode(bytes) {
    return WeatherKit2.decode(new flatbuffers.ByteBuffer(bytes), "all");
}

test("v3 response falls back to body datasets, isolates failures, and preserves Apple metadata", async t => {
    const bytes = new Uint8Array(Buffer.from((await readFile(fixture, "utf8")).trim(), "base64"));
    const before = decode(bytes);
    const diagnostics = new Map();
    globalThis.$argument = {
        Storage: "Argument",
        LogLevel: "OFF",
        Weather: { Provider: "ColorfulClouds", Replace: ["CN"] },
        NextHour: { Provider: "WeatherKit" },
    };
    globalThis.$persistentStore = {
        read: () => null,
        write: (value, key) => (diagnostics.set(key, value), true),
    };

    const originals = {
        CurrentWeather: ColorfulClouds.prototype.CurrentWeather,
        Daily: ColorfulClouds.prototype.Daily,
        ForecastHourly: ColorfulClouds.prototype.ForecastHourly,
    };
    t.after(() => Object.assign(ColorfulClouds.prototype, originals));
    ColorfulClouds.prototype.CurrentWeather = async () => {
        throw new Error("current unavailable");
    };
    ColorfulClouds.prototype.Daily = async () => ({
        metadata: { providerName: "ColorfulClouds" },
        days: before.forecastDaily.days.map((day, index) => ({ ...day, temperatureMax: index ? day.temperatureMax : 36.5, temperatureMin: index ? day.temperatureMin : 25.5 })),
    });
    ColorfulClouds.prototype.ForecastHourly = async () => ({
        metadata: { providerName: "ColorfulClouds" },
        hours: before.forecastHourly.hours.map((hour, index) => ({ ...hour, temperature: index ? hour.temperature : 33.25 })),
    });

    const response = await Response(
        { url: "https://weatherkit.apple.com/api/v3/weather/zh-Hans-CN/49.26/-123.11", headers: {} },
        { headers: { "Content-Type": "application/vnd.apple.flatbuffer;messageType=WK2.Weather", "Content-Length": String(bytes.length) }, bodyBytes: bytes },
    );
    const after = decode(response.body);
    const result = JSON.parse(diagnostics.get("iRingo.WeatherKit.Diagnostics"));

    assert.equal(response.body.length, bytes.length);
    assert.equal(after.currentWeather.temperature, before.currentWeather.temperature);
    assert.equal(after.forecastDaily.days[0].temperatureMax, 36.5);
    assert.equal(after.forecastDaily.days[0].temperatureMin, 25.5);
    assert.equal(after.forecastHourly.hours[0].temperature, 33.25);
    assert.deepEqual(after.currentWeather.metadata, before.currentWeather.metadata);
    assert.deepEqual(after.forecastDaily.metadata, before.forecastDaily.metadata);
    assert.deepEqual(after.forecastHourly.metadata, before.forecastHourly.metadata);
    assert.deepEqual(result.injected.sort(), ["forecastDaily", "forecastHourly"]);
    assert.match(result.errors.currentWeather, /current unavailable/);
    assert.equal(result.country, "CN");
    assert.equal(result.version, "v3");
});

test("v3 fixed temperature changes only current values", async () => {
    const bytes = new Uint8Array(Buffer.from((await readFile(fixture, "utf8")).trim(), "base64"));
    const before = decode(bytes);
    const diagnostics = new Map();
    globalThis.$argument = {
        Storage: "Argument",
        LogLevel: "OFF",
        Weather: { Provider: "WeatherKit", Replace: ["CN"] },
        NextHour: { Provider: "WeatherKit" },
        Debug: { FixedTemperature: 2 },
    };
    globalThis.$persistentStore = {
        read: () => null,
        write: (value, key) => (diagnostics.set(key, value), true),
    };

    const response = await Response(
        { url: "https://weatherkit.apple.com/api/v3/weather/zh-Hans-CN/49.26/-123.11", headers: {} },
        { headers: { "Content-Type": "application/vnd.apple.flatbuffer;messageType=WK2.Weather" }, bodyBytes: bytes },
    );
    const after = decode(response.body ?? new Uint8Array(response.bodyBytes));
    const result = JSON.parse(diagnostics.get("iRingo.WeatherKit.Diagnostics"));

    assert.equal(after.currentWeather.temperature, 2);
    assert.equal(after.currentWeather.temperatureApparent, 2);
    assert.equal(after.forecastDaily.days[0].temperatureMax, before.forecastDaily.days[0].temperatureMax);
    assert.equal(after.forecastHourly.hours[0].temperature, before.forecastHourly.hours[0].temperature);
    assert.deepEqual(after.currentWeather.metadata, before.currentWeather.metadata);
    assert.equal((response.body ?? response.bodyBytes).length, bytes.length);
    assert.deepEqual(result.injected, ["currentWeather"]);
});
