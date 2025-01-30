import React from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Span } from "@/lib/components/text";
import SubMenuTopNav, {
  SubMenuActions,
  SubMenuBackButton,
  SubMenuTitle,
} from "@/lib/components/sub-menu-top-nav";
import {
  styles as attributionStyles,
  AttributionRow,
  NamespacePackages,
} from "@/lib/components/attribution";
import { useTheme } from "@/lib/contexts/theme";

import data from "../../-licenses.json";
import { useTranslation } from "react-i18next";
import { SubMenuIconButton } from "@/lib/components/icon-button";
import { LinkIcon } from "@/lib/components/icons";
import { openBrowserAsync } from "expo-web-browser";
import { logError } from "@/lib/log";

type Package = NamespacePackages[0];

function keyExtractor(_: Package, i: number) {
  return i.toString();
}

function renderItem({ item }: { item: Package }) {
  return <AttributionRow packageList={[item]} />;
}

export default function () {
  const params = useLocalSearchParams<{ key: string }>();
  const theme = useTheme();
  const [t] = useTranslation();

  const isNamespace = params.key.endsWith("/");

  const name = params.key.slice(0, params.key.lastIndexOf("@"));
  const version = params.key.slice(params.key.lastIndexOf("@") + 1);

  const packageList = isNamespace
    ? data.namespaces.find((list) => list[0].name.startsWith(params.key))!
    : data.namespaces.find((list) =>
        list.some((p) => p.name == name && p.version == version)
      )!;

  const item =
    packageList.length == 1
      ? packageList[0]
      : packageList.find((p) => p.name == name && p.version == version)!;

  return (
    <>
      <SubMenuTopNav>
        <SubMenuBackButton />

        {isNamespace ? (
          <SubMenuTitle>{params.key}*</SubMenuTitle>
        ) : (
          <SubMenuActions>
            <SubMenuIconButton
              icon={LinkIcon}
              onPress={() => {
                openBrowserAsync("https://www.npmjs.com/package/" + name).catch(
                  logError
                );
              }}
            />
          </SubMenuActions>
        )}
      </SubMenuTopNav>

      {isNamespace ? (
        <FlatList
          contentContainerStyle={attributionStyles.listStyles}
          data={packageList}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
        />
      ) : (
        <>
          <View style={styles.header}>
            <Span>{item.name}</Span>
            <Span>
              {t("label", { label: t("version") })} {item.version}
            </Span>
          </View>

          <View style={theme.styles.separator} />

          <ScrollView contentContainerStyle={styles.license}>
            {item.licenses.map((license, i) => (
              <Span key={i}>{data.licenseText[license.text]}</Span>
            ))}
          </ScrollView>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 8,
  },
  license: {
    padding: 8,
    wordWrap: "none",
  },
});
