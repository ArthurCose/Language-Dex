import "tsx/cjs";
import { ExpoConfig } from "expo/config";

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
  }

  return config;
};
