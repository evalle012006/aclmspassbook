const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// input path matches global.css sitting at the project root (per your
// current folder structure) — if you move it under app/, update this path
// to match, or NativeWind's styles silently won't apply.
module.exports = withNativeWind(config, { input: "./global.css" });