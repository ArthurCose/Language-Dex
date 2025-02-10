import fs from "node:fs";
import packageMeta from "../package.json";

const gradleBuildFile = "./android/app/build.gradle";
let data = fs.readFileSync(gradleBuildFile, "utf8");

function patch(name: string, value: string) {
  const start = data.indexOf(name);
  const end = data.indexOf("\n", start);
  data = data.slice(0, start) + name + " " + value + data.slice(end);
}

patch("versionCode", JSON.stringify(packageMeta.versionCode));
patch("versionName", JSON.stringify(packageMeta.version));

fs.writeFileSync(gradleBuildFile, data);
