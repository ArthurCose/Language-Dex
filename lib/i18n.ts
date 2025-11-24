import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import { logError } from "./log";

import enUS from "@/locales/en-US.json";

i18n
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    lng: getLocales()[0]?.languageCode ?? undefined,
    fallbackLng: "en-US",
    debug: false,

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },

    resources: {
      "en-US": { translation: flattenTranslations(enUS) },
    },
  })
  .catch(logError);

i18n.on("missingKey", (lng, namespace, key, fallbackValue) => {
  logError("i18n missing key: " + key);
});

type OrganizedTranslation = { [key: string]: OrganizedTranslation | string };

function flattenTranslations(translation: OrganizedTranslation) {
  const out: { [key: string]: string } = {};

  const tasks = [translation];

  while (tasks.length > 0) {
    const obj = tasks[0];
    tasks[0] = tasks[tasks.length - 1];
    tasks.pop();

    for (const key in obj) {
      const value = obj[key];

      if (typeof value == "object") {
        tasks.push(value);
        continue;
      }

      out[key] = value;
    }
  }

  return out;
}

export default i18n;
