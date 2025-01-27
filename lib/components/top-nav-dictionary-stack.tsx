import { StyleSheet } from "react-native";
import { useUserDataContext } from "@/lib/contexts/user-data";
import NavRow from "./nav-row";
import DictionaryDropdown from "./dictionary-dropdown";

export default function () {
  const [userData, setUserData] = useUserDataContext();

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
        value={userData.activeDictionary}
        onChange={(v) => {
          const updatedData = { ...userData };
          updatedData.activeDictionary = v;
          setUserData(updatedData);
        }}
      />
    </NavRow>
  );
}

const styles = StyleSheet.create({
  languageOptionContainer: {
    padding: 8,
  },
  languageText: {
    // fontWeight: "400",
    fontSize: 20,
  },
});
