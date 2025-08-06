import React from "react";
import { SectionList, StyleSheet } from "react-native";
import {
  styles as attributionStyles,
  AttributionRow,
  NamespacePackages,
} from "@/lib/components/attribution";
import SubMenuTopNav, {
  SubMenuBackButton,
  SubMenuTitle,
} from "@/lib/components/sub-menu-top-nav";
import { useTranslation } from "react-i18next";
import RouteRoot from "@/lib/components/route-root";
import { useTheme } from "@/lib/contexts/theme";

import data from "../../-licenses.json";
import { Span } from "@/lib/components/text";
import { NavigationBarSpacer } from "@/lib/components/system-bar-spacers";

function keyExtractor(_: NamespacePackages, i: number) {
  return i.toString();
}

function renderItem({
  section,
  item,
}: {
  section: { title: string };
  item: NamespacePackages;
}) {
  return <AttributionRow section={section.title} packageList={item} />;
}

export default function () {
  const theme = useTheme();
  const [t] = useTranslation();

  return (
    <RouteRoot allowNavigationInset>
      <SubMenuTopNav>
        <SubMenuBackButton />
        <SubMenuTitle>{t("Third_Party_Licenses")}</SubMenuTitle>
      </SubMenuTopNav>

      <SectionList
        ListFooterComponent={NavigationBarSpacer}
        renderSectionHeader={({ section }) => (
          <Span style={[styles.sectionHeader, theme.styles.poppingText]}>
            {t("third_party_" + section.title)}
          </Span>
        )}
        style={attributionStyles.listStyles}
        sections={data.sections.map((name) => ({
          title: name,
          data: data[name as "npm"],
        }))}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
      />
    </RouteRoot>
  );
}

const styles = StyleSheet.create({
  // copied from settings
  sectionHeader: {
    marginBottom: 2,
    marginLeft: 16,
  },
});
