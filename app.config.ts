import "tsx/cjs";
import fs from "node:fs";
import path from "node:path";
import { ExpoConfig } from "expo/config";

const optionalPlugins: ExpoConfig["plugins"] = [
  [
    "react-native-google-mobile-ads",
    {
      androidAppId: "ca-app-pub-1435328633777702~2026953023",
      iosAppId: "",
      delayAppMeasurementInit: true,
    },
  ],
  "react-native-iap",
];

module.exports = ({ config }: { config: ExpoConfig }) => {
  if (!config.plugins) {
    config.plugins = [];
  }

  // apply config for optional plugins if they're installed
  for (const plugin of optionalPlugins) {
    const name = typeof plugin == "string" ? plugin : plugin[0];

    if (name == undefined) {
      continue;
    }

    if (fs.existsSync(path.join("node_modules", name))) {
      config.plugins.push(plugin);
    }
  }

  return config;
};
