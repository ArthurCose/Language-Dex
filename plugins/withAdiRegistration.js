// https://support.google.com/googleplay/android-developer/answer/16761053#verifying_private_key_ownership_existing_packages_only

const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withAdiRegistration(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const assetsDir = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/assets",
      );

      // Create assets directory if it doesn't exist
      fs.mkdirSync(assetsDir, { recursive: true });

      // Create verification file
      const filePath = path.join(assetsDir, "adi-registration.properties");

      fs.writeFileSync(filePath, "CC7EK24SP7XUYAAAAAAAAAAAAA");

      return config;
    },
  ]);
};
