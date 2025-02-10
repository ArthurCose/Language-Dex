import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import { logError } from "./log";

i18n
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    lng: getLocales()[0]?.languageCode ?? undefined,
    fallbackLng: "en",
    debug: false,

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },

    resources: {
      en: {
        translation: {
          default_dictionary_name: "My Dictionary",

          label: "{{label}}:",

          // bottom nav
          Dictionary: "Dictionary",
          Read: "Read",
          Statistics: "Statistics",

          // dictionary
          New_Dictionary: "New Dictionary",

          // search
          search_placeholder: "Search",

          // order options
          alphabetical: "alphabetical",
          latest: "latest",
          confidence: "confidence",
          longest: "longest",

          // word filters
          all: "all",
          part_of_speech: "part of speech",

          // scan
          scan_placeholder: "Enter text",
          Add_Word: "Add Word",
          Add_Definition: "Add Definition",
          Copy: "Copy",

          // games
          Match: "Match",
          Match_Requirements: "Requires at least three word definitions.",
          Unscramble: "Unscramble",
          Unscramble_Requirements:
            "Requires at least three words longer than one letter.",
          Guess: "Guess",
          Guess_Requirements: "Requires at least ten unique words.",
          Crossword: "Crossword",
          Crossword_Requirements:
            "Requires at least twenty unique words longer than two letters.",

          Locked: "Locked",

          mode_endless: "Endless",
          mode_timed: "Timed",
          mode_rush: "Rush",

          Guess_Here: "Guess Here",

          Results: "Results",
          Top_Score: "Top Score",
          Total_Time: "Total Time",
          Score: "Score",
          Guesses: "Guesses",
          Replay: "Replay",
          Quit: "Quit",

          // statistics
          Overall: "Overall",
          Longest_Word: "Longest_Word",
          Total_Definitions: "Total Definitions",
          Words_Read: "Words Read",
          Excerpts_Read: "Excerpts Read",
          Words_Matched: "Words Matched",
          Words_Unscrambled: "Words Unscrambled",
          Words_Guessed: "Words Guessed",

          NA: "N/A",

          // definition editor
          Word: "Word",
          Part_of_Speech: "Part of Speech",
          Add_Part_of_Speech: "Add Part of Speech",
          unknown: "unknown",
          Definition: "Definition",
          Example: "Example",
          Notes: "Notes",

          New: "New",

          // dialogs
          Cancel: "Cancel",
          Confirm: "Confirm",
          Close: "Close",
          Discard: "Discard",
          Save_Changes: "Save Changes",
          Delete: "Delete",
          Delete_Title: "Delete {{name}}?",
          An_error_occurred: "An error occurred!",
          Success_exclamation: "Success!",

          Discard_Changes: "Discard Changes",
          Discard_Changes_Desc: "You have pending changes, discard?",

          Delete_Part_of_Speech_Desc:
            "This will reset Part of Speech for matching definitions to unknown.",
          Delete_Word_Desc:
            "This will permanently delete all definitions and statistics associated with this word.",
          Delete_Definition_Desc:
            "This will permanently delete this definition.",
          Delete_Dictionary_Desc:
            "This will permanently delete all words and statistics associated with this dictionary.",

          point_one: "point",
          point_other: "points",

          // settings
          Settings: "Settings",
          Default_View: "Default View",
          Default_Order: "Default Order",
          Theme: "Theme",
          System: "System",
          Light: "Light",
          Dark: "Dark",
          Import_Dictionaries: "Import Dictionaries",
          Importing: "Importing",
          Export_Dictionaries: "Export Dictionaries",
          Exporting: "Exporting",
          All: "All",

          Dictionaries: "Dictionaries",
          Development: "Development",

          // logs
          View_Logs: "View Logs",
          Logs: "Logs",

          // attribution
          Third_Party_Licenses: "Third-party Licenses",
          version: "version",
        },
      },
    },
  })
  .catch(logError);

i18n.on("missingKey", (lng, namespace, key, fallbackValue) => {
  logError("i18n missing key: " + key);
});

export default i18n;
