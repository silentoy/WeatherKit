import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import parseWeatherKitURL from "../src/function/parseWeatherKitURL.mjs";
import { Request } from "../src/process/Request.mjs";

globalThis.require = createRequire(import.meta.url);

test("parses full iOS locale and keeps its region", () => {
    const simple = parseWeatherKitURL(new URL("https://weatherkit.apple.com/api/v3/weather/zh-CN/39.9/116.4"));
    assert.deepEqual(simple, {
        version: "v3",
        locale: "zh-CN",
        language: "zh",
        region: "CN",
        latitude: "39.9",
        longitude: "116.4",
        country: undefined,
        dataSets: [],
    });

    const script = parseWeatherKitURL(new URL("https://weatherkit.apple.com/api/v3/weather/zh-Hans-CN/39.9/116.4?country=US&dataSets=currentWeather,forecastHourly"));
    assert.equal(script.locale, "zh-Hans-CN");
    assert.equal(script.language, "zh");
    assert.equal(script.region, "CN");
    assert.equal(script.country, "US");
    assert.deepEqual(script.dataSets, ["currentWeather", "forecastHourly"]);
});

test("request removes conditional headers without filtering iOS 27 datasets", async () => {
    globalThis.$argument = { Storage: "Argument" };
    const { $request } = await Request({
        method: "GET",
        url: "https://weatherkit.apple.com/api/v3/weather/zh-Hans-CN/39.9/116.4?dataSets=currentWeather,forecastHourly,unknownIOS27",
        headers: { "If-None-Match": "cached" },
    });

    assert.equal($request.headers["If-None-Match"], undefined);
    assert.equal(new URL($request.url).searchParams.get("dataSets"), "currentWeather,forecastHourly,unknownIOS27");
});
