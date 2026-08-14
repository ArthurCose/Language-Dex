import fs from "node:fs";

const replacements: [string, string][] = [
  [
    `
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`,
    `
            signingConfig signingConfigs.release`,
  ],
  [
    `
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`,
    `
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (System.getenv("UPLOAD_STORE_FILE") != null) {
                storeFile file(System.getenv("UPLOAD_STORE_FILE"))
                storePassword System.getenv("UPLOAD_STORE_PASSWORD")
                keyAlias System.getenv("UPLOAD_KEY_ALIAS")
                keyPassword System.getenv("UPLOAD_KEY_PASSWORD")
            }
        }
    }`,
  ],
];

const filePath = "android/app/build.gradle";
let contents: string = fs.readFileSync(filePath, "utf8");

for (const [searchValue, replaceValue] of replacements) {
  contents = contents.replace(searchValue, replaceValue);
}

fs.writeFileSync(filePath, contents);
