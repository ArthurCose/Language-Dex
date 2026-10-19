import fs from "node:fs";
import { OutputCompressed, ResolvedPackageCompressed } from "license-ripper";

const path = "./-licenses.json";
const rawData = fs.readFileSync(path, "utf-8");
const input = <OutputCompressed>JSON.parse(rawData);

const flatList = input.packages;
const npmList: ResolvedPackageCompressed[][] = [];
const iconsList: ResolvedPackageCompressed[][] = [];
const namespaceMap: { [key: string]: ResolvedPackageCompressed[] | undefined } =
  {};

const icons = ["Pictogrammers", "Material Icons"];

function mergeNamespace(name: string, list: ResolvedPackageCompressed[]) {
  if (icons.includes(name)) {
    iconsList.push(list);
  } else {
    npmList.push(list);
  }
}

for (const p of flatList) {
  if (p.name[0] == "@") {
    const namespace = p.name.slice(0, p.name.indexOf("/"));
    const existing = namespaceMap[namespace];

    if (existing) {
      existing.push(p);
    } else {
      const list = [p];
      namespaceMap[namespace] = list;
      mergeNamespace(namespace, list);
    }
  } else {
    mergeNamespace(p.name, [p]);
  }
}

const output = {
  sections: ["icons", "npm"],
  npm: npmList,
  icons: iconsList,
  licenseText: input.licenseText,
};

fs.writeFileSync(path, JSON.stringify(output));
