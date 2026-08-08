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

const dependenciesRequiringInternet = [
  "react-native-google-mobile-ads",
  "react-native-iap",
];

module.exports = ({ config }: { config: ExpoConfig }) => {
  const isDevBuild = process.env.APP_VARIANT == "development";

  if (isDevBuild) {
    // allow dev builds to be installed with release builds
    config.ios!.bundleIdentifier += ".dev";
    config.android!.package += ".dev";
  } else {
    // remove permissions that aren't necessary in release
    if (!config.android!.blockedPermissions) {
      config.android!.blockedPermissions = [];
    }
    config.android!.blockedPermissions.push(
      "android.permission.SYSTEM_ALERT_WINDOW",
    );

    const requiresInternet = dependenciesRequiringInternet.some((name) =>
      fs.existsSync(path.join("node_modules", name)),
    );

    if (!requiresInternet) {
      config.android!.blockedPermissions.push(
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
      );
    }
  }

  // apply config for optional plugins if they're installed
  if (!config.plugins) {
    config.plugins = [];
  }

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
