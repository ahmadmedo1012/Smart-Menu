const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts = [...config.resolver.sourceExts, "ts", "tsx", "js", "jsx", "json"];

module.exports = withNativeWind(config, { input: "./global.css" });
