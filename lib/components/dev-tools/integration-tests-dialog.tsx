import React, { useState } from "react";
import {
  Pressable,
  PressableAndroidRippleConfig,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  VirtualizedList,
} from "react-native";
import { useTranslation } from "react-i18next";
import Dialog, { DialogTitle } from "@/lib/components/dialog";
import {
  ConfirmationDialogAction,
  ConfirmationDialogActions,
} from "@/lib/components/confirmation-dialog";
import { Span } from "../text";
import { useUserDataSignal } from "@/lib/contexts/user-data";
import { useSignalLens } from "@/lib/hooks/use-signal";
import { deleteDictionary } from "@/lib/data";
import { LabeledTest, TestParams } from "@/lib/integration-tests/util";
import { DEFINITION_TESTS } from "@/lib/integration-tests/definitions";
import { SYNONYM_TESTS } from "@/lib/integration-tests/synonyms";

const TESTS: LabeledTest[] = [...DEFINITION_TESTS, ...SYNONYM_TESTS];

type TestResult = "passed" | "failed";
type TestResults = { [key: string]: TestResult };

type Props = {
  style?: StyleProp<ViewStyle>;
  android_ripple: PressableAndroidRippleConfig;
} & React.PropsWithChildren;

export default function ({ style, android_ripple, children }: Props) {
  const [t] = useTranslation();
  const [open, setOpen] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState<TestResults>({});

  const userDataSignal = useUserDataSignal();
  const testParams: TestParams = useSignalLens(userDataSignal, (userData) => ({
    nextDictionaryId: userData.nextDictionaryId,
  }));

  return (
    <>
      <Pressable
        style={style}
        android_ripple={android_ripple}
        pointerEvents="box-only"
        onPress={async () => {
          setOpen(true);

          const results: TestResults = {};

          for (const [label, test] of TESTS) {
            console.log("Testing " + label + "...");

            try {
              await test(testParams);
              results[label] = "passed";
            } catch (err) {
              console.error(err);
              results[label] = "failed";
            }

            setResults({ ...results });

            // clean up for the next test
            await deleteDictionary(testParams.nextDictionaryId);
          }

          setCompleted(true);
        }}
      >
        {children}
      </Pressable>

      <Dialog
        open={open}
        onClose={() => {
          if (completed) {
            setOpen(false);
          }
        }}
      >
        <DialogTitle>Integration Tests</DialogTitle>

        <VirtualizedList<LabeledTest>
          data={TESTS}
          getItemCount={() => TESTS.length}
          getItem={(data, index) => data[index]}
          keyExtractor={(item) => item[0]}
          style={styles.list}
          renderItem={({ item }) => {
            const result = results[item[0]];
            let resultText = "...";

            if (result == "passed") {
              resultText = "✅";
            } else if (result == "failed") {
              resultText = "❌";
            }

            return (
              <View style={styles.row}>
                <Span>{item[0]}</Span>
                <Span>{resultText}</Span>
              </View>
            );
          }}
        />

        <ConfirmationDialogActions>
          <ConfirmationDialogAction
            disabled={!completed}
            onPress={() => setOpen(false)}
          >
            {t("Close")}
          </ConfirmationDialogAction>
        </ConfirmationDialogActions>
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: 10,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    justifyContent: "space-between",
    flexDirection: "row",
  },
});
