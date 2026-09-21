module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // No "react-native-reanimated/plugin" line here on purpose — as of the
    // current babel-preset-expo, Reanimated's Babel plugin is configured
    // automatically once the library is installed. Adding it again by hand
    // risks double-applying it. If you hit a Reanimated-specific error that
    // mentions its Babel plugin, that's the first thing to check.
  };
};