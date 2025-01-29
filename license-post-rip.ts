import fs from "node:fs";
import { OutputCompressed, ResolvedPackageCompressed } from "license-ripper";

const path = "./-licenses.json";
const rawData = fs.readFileSync(path, "utf-8");
const input = <OutputCompressed>JSON.parse(rawData);

const flatList = input.packages;
const mergedList = [];
const namespaceMap: { [key: string]: ResolvedPackageCompressed[] | undefined } =
  {};

for (const p of flatList) {
  if (p.name[0] == "@") {
    const namespace = p.name.slice(0, p.name.indexOf("/"));
    const existing = namespaceMap[namespace];

    if (existing) {
      existing.push(p);
    } else {
      const list = [p];
      namespaceMap[namespace] = list;
      mergedList.push(list);
    }
  } else {
    mergedList.push([p]);
  }
}

const output = {
  namespaces: mergedList,
  licenseText: input.licenseText,
};

fs.writeFileSync(path, JSON.stringify(output));
