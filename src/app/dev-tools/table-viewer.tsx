import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View, VirtualizedList } from "react-native";
import SubMenuTopNav, {
  SubMenuActions,
  SubMenuBackButton,
  SubMenuTitle,
} from "@/src/lib/components/sub-menu-top-nav";
import RouteRoot from "@/src/lib/components/route-root";
import {
  NavigationBarSpacer,
  NavigationBarUnderlay,
} from "@/src/lib/components/system-bar-spacers";
import BottomListPopup from "@/src/lib/components/bottom-list-popup";
import { useTheme } from "@/src/lib/contexts/theme";
import { useSignal, useSignalValue } from "@/src/lib/hooks/use-signal";
import { Span } from "@/src/lib/components/text";
import db from "@/src/lib/db";

type TableMeta = { name: string; sql: string; columns: string[] };
type TableRow = { [key: string]: any };

function Table({ table, visible }: { table: TableMeta; visible: boolean }) {
  const theme = useTheme();

  const exhaustedSignal = useSignal(false);
  const totalRequestedSignal = useSignal(0);
  const rowsSignal = useSignal<TableRow[]>([]);
  const rows = useSignalValue(rowsSignal);

  const requestRows = async () => {
    if (exhaustedSignal.get()) {
      // avoid excessive requests
      return;
    }

    // request data
    const ROWS_PER_PAGE = 30;

    const list = await db.getAllAsync<TableMeta>(
      `SELECT * FROM ${table.name} LIMIT ${ROWS_PER_PAGE} OFFSET ${totalRequestedSignal.get()}`,
    );
    totalRequestedSignal.add(ROWS_PER_PAGE);

    rowsSignal.set([...rowsSignal.get(), ...list]);

    // resolve whether we've read every row
    if (list.length < ROWS_PER_PAGE) {
      exhaustedSignal.set(true);
    }
  };

  useEffect(() => {
    exhaustedSignal.set(false);
    totalRequestedSignal.set(0);
    rowsSignal.set([]);
    requestRows();
  }, [table]);

  return (
    <ScrollView horizontal style={!visible && { display: "none" }}>
      <View>
        <View style={styles.row}>
          {table.columns.map((name) => (
            <Span
              style={[styles.cell, styles.headerCell, theme.styles.borders]}
              key={name}
            >
              {name}
            </Span>
          ))}
        </View>

        <VirtualizedList<TableRow>
          data={rows}
          getItem={(rows, i) => rows[i]}
          getItemCount={(rows) => rows.length}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item: row }) => (
            <View style={styles.row}>
              {table.columns.map((name) => (
                <Span style={[styles.cell, theme.styles.borders]} key={name}>
                  {row[name]}
                </Span>
              ))}
            </View>
          )}
          onEndReached={requestRows}
        />
      </View>
    </ScrollView>
  );
}

export default function () {
  const theme = useTheme();
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [visibleTable, setVisibleTable] = useState<TableMeta | null>(null);

  // resolve tables
  useEffect(() => {
    const asyncScope = async () => {
      const list = await db.getAllAsync<TableMeta>(
        "SELECT name, sql FROM sqlite_schema WHERE type = 'table'",
      );

      for (const table of list) {
        const columnsStartIndex = table.sql.indexOf("(");
        const columnsEndIndex = table.sql.lastIndexOf(")");

        table.columns = table.sql
          .slice(columnsStartIndex + 1, columnsEndIndex)
          .split(",")
          .map((columnSql) => {
            columnSql = columnSql.trimStart();
            return columnSql.slice(0, columnSql.indexOf(" "));
          });
      }

      setTables(list);
      setVisibleTable(list[0]);
    };

    asyncScope();
  }, []);

  return (
    <RouteRoot allowNavigationInset>
      <SubMenuTopNav>
        <SubMenuBackButton />

        <SubMenuTitle>Tables</SubMenuTitle>

        <SubMenuActions></SubMenuActions>
      </SubMenuTopNav>

      {tables.map((table) => (
        <Table key={table.name} table={table} visible={visibleTable == table} />
      ))}

      <BottomListPopup<TableMeta>
        style={[
          theme.styles.searchOption,
          styles.bottomList,
          // styles.dropdown,
        ]}
        label={visibleTable?.name ?? "Tables"}
        items={tables}
        keyExtractor={(table) => table.name}
        mapItem={(table) => table.name}
        onChange={setVisibleTable}
      />

      <NavigationBarSpacer />
      <NavigationBarUnderlay />
    </RouteRoot>
  );
}

const styles = StyleSheet.create({
  bottomList: {
    margin: 8,
    padding: 12,
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: 100,
    padding: 4,
    textAlign: "center",
    borderWidth: 1,
  },
  headerCell: {
    fontWeight: "bold",
  },
});
