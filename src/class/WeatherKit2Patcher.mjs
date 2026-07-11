import * as flatbuffers from "flatbuffers";
import * as WK2 from "../proto/apple/wk2.js";

const weatherCondition = value => WK2.WeatherCondition[value];
const precipitationType = value => WK2.PrecipitationType[value];
const pressureTrend = value => WK2.PressureTrend[value];
const moonPhase = value => WK2.MoonPhase[value];

const currentFields = {
    cloudCover: [8, "Int8"],
    cloudCoverLowAltPct: [10, "Int8"],
    cloudCoverMidAltPct: [12, "Int8"],
    cloudCoverHighAltPct: [14, "Int8"],
    conditionCode: [16, "Int8", weatherCondition],
    daylight: [18, "Int8", Number],
    humidity: [20, "Int8"],
    perceivedPrecipitationIntensity: [22, "Float32"],
    precipitationIntensity: [48, "Float32"],
    pressure: [50, "Float32"],
    pressureTrend: [52, "Int8", pressureTrend],
    snowfallAmount1h: [54, "Float32"],
    snowfallAmount6h: [56, "Float32"],
    snowfallAmount24h: [58, "Float32"],
    snowfallAmountNext1h: [60, "Float32"],
    snowfallAmountNext6h: [62, "Float32"],
    snowfallAmountNext24h: [64, "Float32"],
    temperature: [66, "Float32"],
    temperatureApparent: [68, "Float32"],
    temperatureDewPoint: [72, "Float32"],
    uvIndex: [74, "Int8"],
    visibility: [76, "Float32"],
    windDirection: [78, "Int16"],
    windGust: [80, "Float32"],
    windSpeed: [82, "Float32"],
};

const dayFields = {
    conditionCode: [8, "Int8", weatherCondition],
    humidityMax: [10, "Int8"],
    humidityMin: [12, "Int8"],
    maxUvIndex: [14, "Int8"],
    moonPhase: [16, "Int8", moonPhase],
    precipitationAmount: [22, "Float32"],
    precipitationChance: [26, "Int8"],
    precipitationType: [28, "Int8", precipitationType],
    snowfallAmount: [30, "Float32"],
    temperatureMax: [52, "Float32"],
    temperatureMin: [56, "Float32"],
    windGustSpeedMax: [60, "Float32"],
    windSpeedAvg: [62, "Float32"],
    windSpeedMax: [64, "Float32"],
    visibilityMax: [66, "Float32"],
    visibilityMin: [68, "Float32"],
};

const dayPartFields = {
    cloudCover: [8, "Int8"],
    cloudCoverLowAltPct: [10, "Int8"],
    cloudCoverMidAltPct: [12, "Int8"],
    cloudCoverHighAltPct: [14, "Int8"],
    conditionCode: [16, "Int8", weatherCondition],
    humidity: [18, "Int8"],
    humidityMax: [20, "Int8"],
    humidityMin: [22, "Int8"],
    precipitationAmount: [24, "Float32"],
    precipitationChance: [28, "Int8"],
    precipitationType: [30, "Int8", precipitationType],
    snowfallAmount: [32, "Float32"],
    temperatureMax: [34, "Float32"],
    temperatureMin: [36, "Float32"],
    visibilityMax: [38, "Float32"],
    visibilityMin: [40, "Float32"],
    windDirection: [42, "Int16"],
    windGustSpeedMax: [44, "Float32"],
    windSpeed: [46, "Float32"],
    windSpeedMax: [48, "Float32"],
    precipitationIntensityMax: [50, "Float32"],
    perceivedPrecipitationIntensityMax: [52, "Float32"],
    uvIndexMin: [54, "Int8"],
    uvIndexMax: [56, "Int8"],
    temperatureApparentMin: [58, "Float32"],
    temperatureApparentMax: [60, "Float32"],
    daylight: [62, "Int8", Number],
};

const hourFields = {
    cloudCover: [6, "Int8"],
    cloudCoverLowAltPct: [8, "Int8"],
    cloudCoverMidAltPct: [10, "Int8"],
    cloudCoverHighAltPct: [12, "Int8"],
    conditionCode: [14, "Int8", weatherCondition],
    daylight: [16, "Int8", Number],
    humidity: [18, "Int8"],
    perceivedPrecipitationIntensity: [20, "Float32"],
    precipitationAmount: [22, "Float32"],
    precipitationIntensity: [24, "Float32"],
    precipitationChance: [26, "Int8"],
    precipitationType: [28, "Int8", precipitationType],
    pressure: [30, "Float32"],
    pressureTrend: [32, "Int8", pressureTrend],
    snowfallAmount: [34, "Float32"],
    snowfallIntensity: [36, "Float32"],
    temperature: [38, "Float32"],
    temperatureApparent: [40, "Float32"],
    temperatureDewPoint: [44, "Float32"],
    uvIndex: [46, "Int8"],
    visibility: [48, "Float32"],
    windDirection: [50, "Int16"],
    windGust: [52, "Float32"],
    windSpeed: [54, "Float32"],
};

function patchTable(table, replacement, fields, stats) {
    if (!table || !replacement) return;
    for (const [name, [vtableOffset, type, convert]] of Object.entries(fields)) {
        let value = replacement[name];
        if (value === undefined || value === null) continue;
        if (convert) value = convert(value);
        if (!Number.isFinite(value)) {
            stats.skipped++;
            continue;
        }
        const offset = table.bb.__offset(table.bb_pos, vtableOffset);
        if (!offset) {
            stats.skipped++;
            continue;
        }
        const position = table.bb_pos + offset;
        if (table.bb[`read${type}`](position) === value) continue;
        table.bb[`write${type}`](position, value);
        stats.writes++;
    }
}

function replacementsByStart(items = []) {
    return new Map(items.map(item => [item?.forecastStart, item]));
}

export default class WeatherKit2Patcher {
    static patch(source, replacement, dataSets = []) {
        const requested = new Set(dataSets);
        if (!["currentWeather", "forecastDaily", "forecastHourly"].some(dataSet => requested.has(dataSet))) return { bytes: source, writes: 0, skipped: 0 };

        const bytes = new Uint8Array(source);
        const root = WK2.Weather.getRootAsWeather(new flatbuffers.ByteBuffer(bytes));
        const stats = { writes: 0, skipped: 0 };

        if (requested.has("currentWeather")) patchTable(root.currentWeather(), replacement?.currentWeather, currentFields, stats);

        if (requested.has("forecastDaily")) {
            const daily = root.forecastDaily();
            const replacements = replacementsByStart(replacement?.forecastDaily?.days);
            for (let index = 0; index < (daily?.daysLength() ?? 0); index++) {
                const day = daily.days(index);
                const next = replacements.get(day.forecastStart());
                patchTable(day, next, dayFields, stats);
                patchTable(day.daytimeForecast(), next?.daytimeForecast, dayPartFields, stats);
                patchTable(day.overnightForecast(), next?.overnightForecast, dayPartFields, stats);
                patchTable(day.restOfDayForecast(), next?.restOfDayForecast, dayPartFields, stats);
            }
        }

        if (requested.has("forecastHourly")) {
            const hourly = root.forecastHourly();
            const replacements = replacementsByStart(replacement?.forecastHourly?.hours);
            for (let index = 0; index < (hourly?.hoursLength() ?? 0); index++) {
                const hour = hourly.hours(index);
                patchTable(hour, replacements.get(hour.forecastStart()), hourFields, stats);
            }
        }

        return { bytes, ...stats };
    }
}
