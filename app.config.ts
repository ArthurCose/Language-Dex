import "tsx/cjs";
import { ExpoConfig } from "expo/config";

module.exports = ({ config }: { config: ExpoConfig }) => {
  const isDevBuild = process.env.APP_VARIANT == "development";

  const ios = config.ios!;
  const android = config.android!;

  if (isDevBuild) {
    // allow dev builds to be installed with release builds
    ios.bundleIdentifier += ".dev";
    android.package += ".dev";
    config.name += " Dev";
  } else {
    // remove permissions that aren't necessary in release
    if (!android.blockedPermissions) {
      android.blockedPermissions = [];
    }
    android.blockedPermissions.push("android.permission.SYSTEM_ALERT_WINDOW");
    // expo-file-system uses this permission for downloading files, but we don't use this feature
    android.blockedPermissions.push("android.permission.INTERNET");
  }

  return config;
};
