import { StyleSheet, Pressable, View } from "react-native";
import { Span } from "@/lib/components/text";
import { router } from "expo-router";
import { useTheme } from "@/lib/contexts/theme";
import data from "../../-licenses.json";

export type NamespacePackages = (typeof data)["npm"][0];

export function AttributionRow({
  section,
  packageList,
}: {
  section: string;
  packageList: NamespacePackages;
}) {
  const item = packageList[0];
  const theme = useTheme();

  const rowStyles = [styles.row, theme.styles.definitionBackground];

  if (packageList.length > 1) {
    const key = item.name.slice(0, item.name.indexOf("/") + 1);

    return (
      <View style={rowStyles}>
        <Pressable
          style={styles.pressable}
          android_ripple={theme.ripples.transparentButton}
          pointerEvents="box-only"
          onPress={() =>
            router.navigate(
              `/attribution/${section}/${encodeURIComponent(key)}`
            )
          }
        >
          <Span style={styles.name} numberOfLines={1}>
            {key}*
          </Span>
          <Span style={[styles.count, theme.styles.poppingText]}>
            ({packageList.length})
          </Span>
        </Pressable>
      </View>
    );
  } else {
    const key = `${item.name}@${item.version}`;

    return (
      <View style={rowStyles}>
        <Pressable
          style={styles.pressable}
          android_ripple={theme.ripples.transparentButton}
          pointerEvents="box-only"
          onPress={() =>
            router.navigate(
              `/attribution/${section}/${encodeURIComponent(key)}`
            )
          }
        >
          <Span style={styles.name} numberOfLines={1}>
            {item.name}
          </Span>
          {item.version != "" && (
            <Span style={styles.version} numberOfLines={1}>
              @{item.version}
            </Span>
          )}
        </Pressable>
      </View>
    );
  }
}

export const styles = StyleSheet.create({
  listStyles: {
    marginBottom: 4,
  },
  row: {
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 48,
    overflow: "hidden",
  },
  pressable: {
    flexDirection: "row",
    flexWrap: "nowrap",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  name: {
    flexShrink: 1,
  },
  version: {
    marginLeft: "auto",
  },
  count: {
    marginLeft: "auto",
  },
});
