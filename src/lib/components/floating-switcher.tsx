import { Pressable, StyleProp, View, ViewStyle } from "react-native";
import Animated, { CurvedTransition, Easing } from "react-native-reanimated";
import { useTheme } from "../contexts/theme";
import { Span } from "./text";

const gap = 8;

export default function FloatingSwitcher<T>({
  style,
  selected,
  items: options,
  keyExtractor,
  renderLabel,
  onSelect,
}: {
  style?: StyleProp<ViewStyle>;
  selected: T;
  items: T[];
  keyExtractor: (value: T) => string;
  renderLabel: (value: T) => string;
  onSelect: (value: T) => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        { backgroundColor: theme.colors.switcherBackground },
        styles.rounded,
        style,
      ]}
    >
      <View style={styles.under}>
        <View style={styles.container}>
          {options.map((v) =>
            v == selected ? (
              <Animated.View
                key={"_"}
                layout={CurvedTransition.duration(100).easingY(
                  Easing.steps(1, true),
                )}
                style={[
                  { backgroundColor: theme.colors.primary.default },
                  styles.rounded,
                  styles.item,
                ]}
              />
            ) : (
              <View key={keyExtractor(v)} style={styles.item} />
            ),
          )}
        </View>
      </View>

      <View style={styles.container}>
        {options.map((v) => (
          <Pressable
            style={styles.item}
            key={keyExtractor(v)}
            onPress={() => onSelect(v)}
          >
            <Span style={{ color: theme.colors.primary.contrast }}>
              {renderLabel(v)}
            </Span>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles: { [key: string]: ViewStyle } = {
  root: {
    backgroundColor: "#0003",
  },
  under: {
    height: 0,
  },
  container: {
    flexDirection: "row",
    gap,
    alignItems: "stretch",
  },
  item: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 32,
  },
  rounded: {
    borderRadius: 16,
  },
};
