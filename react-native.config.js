// necessary for linking optional dependencies
// https://github.com/react-native-community/cli/blob/main/docs/autolinking.md#how-can-i-autolink-a-local-library

const fs = require("node:fs");
const path = require("node:path");

const dependencyNames = ["react-native-google-mobile-ads", "react-native-iap"];

const dependencies = {};

for (const name of dependencyNames) {
  const depPath = path.join(__dirname, "node_modules", name);

  if (!fs.existsSync(depPath)) {
    continue;
  }

  dependencies[name] = {
    root: depPath,
  };
}

module.exports = {
  dependencies,
};
