import { Console } from "@nsnanocat/util";

export default function parseWeatherKitURL(url = new URL($request.url)) {
    Console.info("☑️ parseWeatherKitURL");
    const [, api, version, endpoint, locale, latitude, longitude] = url?.pathname?.split("/") ?? [];
    const localeParts = locale?.split("-") ?? [];
    const region = localeParts.findLast(part => /^[A-Z]{2}$/i.test(part))?.toUpperCase();
    const validPath = api === "api" && /^(v1|v2|v3)$/i.test(version) && /^(availability|weather)$/i.test(endpoint);
    const result = {
        version: validPath ? version : undefined,
        locale: validPath ? locale : undefined,
        language: validPath ? localeParts[0] : undefined,
        region: validPath ? region : undefined,
        latitude: validPath ? latitude : undefined,
        longitude: validPath ? longitude : undefined,
        country: url?.searchParams?.get("country") || undefined,
        dataSets: url?.searchParams?.get("dataSets")?.split(",") || [],
    };
    Console.info("✅ parseWeatherKitURL", `🟧version: ${result.version} 🟧language: ${result.language} 🟧country: ${result.country}`, `🟧latitude: ${result.latitude} 🟧longitude: ${result.longitude}`);
    return result;
}
