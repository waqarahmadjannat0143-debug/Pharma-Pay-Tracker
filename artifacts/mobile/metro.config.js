const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// pnpm keeps direct dependencies behind workspace symlinks. Explicit aliases
// prevent EAS/Metro from intermittently missing compiler/runtime helpers.
config.resolver.unstable_enableSymlinks = true;
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "../../node_modules"),
];
const pinnedModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: path.resolve(__dirname, "node_modules/react"),
  "react/compiler-runtime": path.resolve(
    __dirname,
    "node_modules/react/compiler-runtime.js",
  ),
  "@babel/runtime": path.resolve(__dirname, "node_modules/@babel/runtime"),
};
config.resolver.extraNodeModules = new Proxy(pinnedModules, {
  get: (target, name) =>
    target[name] || path.resolve(__dirname, "node_modules", name),
});
config.resolver.resolveRequest = (context, moduleName, platform) => {
  try {
    return context.resolveRequest(context, moduleName, platform);
  } catch (error) {
    if (moduleName.startsWith(".") || moduleName.startsWith("@/")) throw error;
    if (moduleName === "expo-file-system/legacy") {
      return {
        filePath: path.resolve(
          path.dirname(
            require.resolve("expo-file-system/package.json", {
              paths: [__dirname],
            }),
          ),
          "legacy.ts",
        ),
        type: "sourceFile",
      };
    }
    return {
      filePath: require.resolve(moduleName, { paths: [__dirname] }),
      type: "sourceFile",
    };
  }
};

module.exports = config;
