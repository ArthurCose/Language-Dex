import { StyleSheet } from "react-native";
import { useUserDataSignal } from "@/lib/contexts/user-data";
import { useSignalLens } from "../hooks/use-signal";
import NavRow from "./nav-row";
import DictionaryDropdown from "./dictionary-dropdown";
import IconButton from "./icon-button";
import { SettingsIcon } from "./icons";
import { router } from "expo-router";

export default function () {
  const userDataSignal = useUserDataSignal();
  const activeDictionary = useSignalLens(
    userDataSignal,
    (data) => data.activeDictionary
  );

  return (
    <NavRow
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
      }}
    >
      <DictionaryDropdown
        style={styles.languageOptionContainer}
        labelStyle={styles.languageText}
        value={activeDictionary}
        onChange={(v) => {
          const updatedData = { ...userDataSignal.get() };
          updatedData.activeDictionary = v;
          userDataSignal.set(updatedData);
        }}
      />

      <IconButton
        icon={SettingsIcon}
        onPress={() => router.navigate("/settings")}
      />
    </NavRow>
  );
}

const styles = StyleSheet.create({
  row: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  languageOptionContainer: {
    padding: 8,
  },
  languageText: {
    // fontWeight: "400",
    fontSize: 20,
  },
});
