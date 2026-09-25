import db from "./db";
import { logError } from "../log";

export function explainQueryPlan(queryString: string) {
  db.getAllAsync("EXPLAIN QUERY PLAN " + queryString)
    .then((results) => {
      console.log(
        queryString,
        "\n  ",
        results.map((value) => JSON.stringify(value)).join("\n   "),
      );
    })
    .catch(logError);
}
