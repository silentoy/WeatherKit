import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import * as flatbuffers from "flatbuffers";
import WeatherKit2 from "../src/class/WeatherKit2.mjs";
import WeatherKit2Patcher from "../src/class/WeatherKit2Patcher.mjs";

const fixture = new URL("../scratch/original_chengdu.base64", import.meta.url);

async function originalBytes() {
    return new Uint8Array(Buffer.from((await readFile(fixture, "utf8")).trim(), "base64"));
}

function decode(bytes) {
    return WeatherKit2.decode(new flatbuffers.ByteBuffer(bytes), "all");
}

test("patches visible v3 values without rebuilding Apple payload", async () => {
    const bytes = await originalBytes();
    const before = decode(bytes);
    const replacement = structuredClone(before);
    replacement.currentWeather.temperature = 31.25;
    replacement.currentWeather.temperatureApparent = 32.5;
    replacement.currentWeather.conditionCode = "RAIN";
    replacement.forecastDaily.days[0].temperatureMax = 35.5;
    replacement.forecastDaily.days[0].temperatureMin = 24.5;
    replacement.forecastDaily.days[0].conditionCode = "RAIN";
    replacement.forecastHourly.hours[0].temperature = 30.75;
    replacement.forecastHourly.hours[0].conditionCode = "RAIN";

    const result = WeatherKit2Patcher.patch(bytes, replacement, ["currentWeather", "forecastDaily", "forecastHourly"]);
    const after = decode(result.bytes);

    assert.equal(result.bytes.length, bytes.length);
    assert.ok(result.writes >= 8);
    assert.equal(after.currentWeather.temperature, 31.25);
    assert.equal(after.currentWeather.temperatureApparent, 32.5);
    assert.equal(after.currentWeather.conditionCode, "RAIN");
    assert.equal(after.forecastDaily.days[0].temperatureMax, 35.5);
    assert.equal(after.forecastDaily.days[0].temperatureMin, 24.5);
    assert.equal(after.forecastDaily.days[0].conditionCode, "RAIN");
    assert.equal(after.forecastHourly.hours[0].temperature, 30.75);
    assert.equal(after.forecastHourly.hours[0].conditionCode, "RAIN");
    assert.deepEqual(after.currentWeather.metadata, before.currentWeather.metadata);
    assert.deepEqual(after.forecastDaily.metadata, before.forecastDaily.metadata);
    assert.deepEqual(after.forecastHourly.metadata, before.forecastHourly.metadata);
});

test("returns byte-identical payload when no supported dataset is requested", async () => {
    const bytes = await originalBytes();
    const result = WeatherKit2Patcher.patch(bytes, decode(bytes), []);
    assert.equal(result.writes, 0);
    assert.deepEqual(result.bytes, bytes);
});
