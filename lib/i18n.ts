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
          Practice: "Practice",
          Definition_Match: "Definition Match",
          Definition_Match_Requirements:
            "Requires at least three definitions below max confidence.",
          Unscramble: "Unscramble",
          Unscramble_Requirements:
            "Requires at least five words longer than one character and below max confidence.",
          Guess_the_Word: "Guess the Word",
          Guess_the_Word_Requirements:
            "Requires at least ten unique words below max confidence.",
          Crossword: "Crossword",
          Crossword_Requirements:
            "Requires at least ten unique words longer than four characters and below max confidence.",
          Short_Answer: "Short Answer",
          Short_Answer_Requirements:
            "Requires at least five definitions below max confidence.",
          Use_in_a_Sentence: "Use in a Sentence",
          Use_in_a_Sentence_Requirements:
            "Requires at least five definitions below max confidence.",
          Pronunciation_Requirements:
            "Requires at least five definitions below max confidence.",

          Locked: "Locked",

          mode_endless: "Endless",
          mode_timed: "Timed",
          mode_rush: "Rush",

          Enter_Guess: "Enter Guess",
          Enter_Word: "Enter Word",
          Missing_Definition_brack: "[ Missing Definition ]",
          skip_question: "Skip",

          short_answer_mystery: "????",
          use_in_a_sentence_placeholder: "Write a sentence",

          Results: "Results",
          Top_Score: "Top Score",
          Total_Time: "Total Time",
          Score: "Score",
          Guesses: "Guesses",
          Hints_Used: "Hints Used",
          Incorrect_Submissions: "Incorrect Submissions",
          Replay: "Replay",
          Quit: "Quit",

          // statistics
          Overall: "Overall",
          Longest_Word: "Longest_Word",
          Total_Definitions: "Total Definitions",
          Total_Pronounced: "Total Pronunciations",
          Words_Read: "Words Read",
          Excerpts_Read: "Excerpts Read",
          Words_Matched: "Words Matched",
          Words_Unscrambled: "Words Unscrambled",
          Words_Guessed: "Words Guessed",
          Crosswords_Completed: "Crosswords Completed",
          Sentences_Constructed: "Sentences Constructed",
          Total_Pats: "Total Pats",

          NA: "N/A",

          // definition editor
          Pronunciation: "Pronunciation",
          Saved_Pronunciation: "Saved Pronunciation",
          Recording_number: "Recording {{count}}",
          Confidence_paren: "(Confidence)",
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
          None: "None",
          Save_Changes: "Save Changes",
          Delete: "Delete",
          Delete_Title: "Delete {{name}}?",
          An_error_occurred: "An error occurred!",
          Success_exclamation: "Success!",

          Save_Pronunciation: "Save Pronunciation",
          Save_Pronunciation_Desc:
            "Save this recording as the pronunciation for this definition?",

          Save_Sentence_as_Example: "Save as Example",
          Save_Sentence_as_Example_Desc:
            "Save this sentence as the example for {{word}}?",

          Discard: "Discard",
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
          Dictionary_Import: "Dictionary Import",
          importing_metadata_stage: "Initializing...",
          importing_words_stage: "Importing Words...",
          importing_definitions_stage: "Importing Definitions...",
          Export_Dictionaries: "Export Dictionaries",
          Dictionary_Export: "Dictionary Export",
          exporting_metadata_stage: "Initializing...",
          exporting_words_stage: "Exporting Words...",
          exporting_definitions_stage: "Exporting Definitions...",
          Remove_Ads: "Remove Ads",
          Removed_Ads: "Removed Ads",
          Show_Privacy_Options: "Show Privacy Options",
          All: "All",

          Ads: "Ads",
          Dictionaries: "Dictionaries",
          Development: "Development",

          // logs
          View_Logs: "View Logs",
          Logs: "Logs",

          // attribution
          Third_Party_Licenses: "Third-party Licenses",
          third_party_icons: "Icons",
          third_party_npm: "npm",
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
