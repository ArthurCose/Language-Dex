import React from "react";
import { FlatList, Linking, StyleSheet, View, ScrollView } from "react-native";
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
import { useTranslation } from "react-i18next";
import { SubMenuIconButton } from "@/lib/components/icon-button";
import { LinkIcon } from "@/lib/components/icons";
import { logError } from "@/lib/log";
import RouteRoot from "@/lib/components/route-root";
import { NavigationBarSpacer } from "@/lib/components/system-bar-spacers";

import data from "@/-licenses.json";

type Package = NamespacePackages[0] & { homepage?: string };

function keyExtractor(_: Package, i: number) {
  return i.toString();
}

function renderItem({ item, section }: { item: Package; section: string }) {
  return <AttributionRow section={section} packageList={[item]} />;
}

export default function () {
  const params = useLocalSearchParams<{ key: string; section: string }>();
  const theme = useTheme();
  const [t] = useTranslation();

  const sectionKey = params.section as "npm" | "icons";
  const isNamespace = params.key.endsWith("/");

  const name = params.key.slice(0, params.key.lastIndexOf("@"));
  const version = params.key.slice(params.key.lastIndexOf("@") + 1);

  const sectionList = data[sectionKey];
  const packageList = isNamespace
    ? sectionList.find((list) => list[0].name.startsWith(params.key))!
    : sectionList.find((list) =>
        list.some((p) => p.name == name && p.version == version)
      )!;

  const item: Package =
    packageList.length == 1
      ? packageList[0]
      : packageList.find((p) => p.name == name && p.version == version)!;

  return (
    <RouteRoot allowNavigationInset>
      <SubMenuTopNav>
        <SubMenuBackButton />

        {isNamespace ? (
          <SubMenuTitle>{params.key}*</SubMenuTitle>
        ) : (
          <SubMenuActions>
            <SubMenuIconButton
              icon={LinkIcon}
              onPress={() => {
                const url =
                  item.homepage ?? "https://www.npmjs.com/package/" + name;
                Linking.openURL(url).catch(logError);
              }}
            />
          </SubMenuActions>
        )}
      </SubMenuTopNav>

      {isNamespace ? (
        <FlatList
          ListFooterComponent={NavigationBarSpacer}
          style={attributionStyles.listStyles}
          data={packageList}
          keyExtractor={keyExtractor}
          renderItem={({ item }) =>
            renderItem({ item, section: params.section })
          }
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

            <NavigationBarSpacer />
          </ScrollView>
        </>
      )}
    </RouteRoot>
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
