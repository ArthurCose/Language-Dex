import React from "react";
import { FlatList } from "react-native";
import RouteRoot from "@/lib/components/route-root";
import {
  styles as attributionStyles,
  AttributionRow,
  NamespacePackages,
} from "@/lib/components/attribution";
import SubMenuTopNav, {
  SubMenuBackButton,
} from "@/lib/components/sub-menu-top-nav";

import data from "../../-licenses.json";

function keyExtractor(_: NamespacePackages, i: number) {
  return i.toString();
}

function renderItem({ item }: { item: NamespacePackages }) {
  return <AttributionRow packageList={item} />;
}

export default function () {
  return (
    <RouteRoot>
      <SubMenuTopNav>
        <SubMenuBackButton />
      </SubMenuTopNav>

      <FlatList
        contentContainerStyle={attributionStyles.listStyles}
        data={data.namespaces}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
      />
    </RouteRoot>
  );
}
