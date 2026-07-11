import { defineConfig } from "@rspack/cli";
import rspack from "@rspack/core";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
    entry: {
        request: "./src/request.js",
        response: "./src/response.js",
    },
    output: {
        chunkFormat: false,
        filename: "[name].bundle.js",
        library: {
            type: "module",
        },
    },
    plugins: [
        new NodePolyfillPlugin({
            //additionalAliases: ['console'],
        }),
        new rspack.BannerPlugin({
            banner: `console.log('Modified: ${new Date().toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" })} +08:00');`,
            raw: true,
        }),
        new rspack.BannerPlugin({
            banner: `console.log('Version: ${pkg.version}');`,
            raw: true,
        }),
        new rspack.BannerPlugin({
            banner: "console.log('[file]');",
            raw: true,
        }),
        new rspack.BannerPlugin({
            banner: `console.log('${pkg.displayName}');`,
            raw: true,
        }),
        new rspack.BannerPlugin({
            banner: pkg.homepage,
        }),
    ],
    devtool: false,
    performance: false,
});
