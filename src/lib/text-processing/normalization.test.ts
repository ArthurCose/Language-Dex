import { expect, test } from "@jest/globals";
import { normalize } from "./normalization";

test("normalize", () => {
  expect(normalize("Amaré")).toBe("amare");
});
