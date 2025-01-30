import React from "react";
import { FlatList } from "react-native";
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

import data from "../../-licenses.json";

function keyExtractor(_: NamespacePackages, i: number) {
  return i.toString();
}

function renderItem({ item }: { item: NamespacePackages }) {
  return <AttributionRow packageList={item} />;
}

export default function () {
  const [t] = useTranslation();

  return (
    <>
      <SubMenuTopNav>
        <SubMenuBackButton />
        <SubMenuTitle>{t("Third_Party_Licenses")}</SubMenuTitle>
      </SubMenuTopNav>

      <FlatList
        contentContainerStyle={attributionStyles.listStyles}
        data={data.namespaces}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
      />
    </>
  );
}
