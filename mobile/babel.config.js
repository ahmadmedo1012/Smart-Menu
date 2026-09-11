module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      // r100c: nativewind 4.2 exports a PRESET-shaped factory ({plugins:[...]}),
      // not a plugin — using it in plugins[] broke babel (".plugins is not a
      // valid Plugin property"). Current nativewind v4 docs: presets[] form.
      "nativewind/babel",
    ],
    plugins: [
      "react-native-reanimated/plugin",
      // r100c: dropped ["module-resolver"] — app.json experiments.tsconfigPaths
      // resolves @/* natively in Metro (SDK 50+ mechanism).
    ],
  };
};
