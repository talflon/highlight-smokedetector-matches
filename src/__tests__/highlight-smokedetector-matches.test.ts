import { test, expect } from "@jest/globals";
import { splitWhy } from "../highlight-smokedetector-matches";

test.each([
  [[]],
  [["Something something - blah"]],
  [["anything"]],
  [["One reason - this", "Another reason - that"]],
  [["This reason has a linebreak - and here\nit is"]],
  [["This reason has a linebreak - and here\nit is", "Next reason - x"]],
  [["Lots - of\nline\nbreaks", "Post - sus"]],
  [["Post - 1", "Body - 2", "Title - 3"]],
  [
    [
      "Post manually reported by user *test* in room *Charcoal HQ*.",
      "Potentially bad keyword in body - ...",
    ],
  ],
  [["First - x", "Pattern-matching product name in body - y"]],
  [
    [
      "One - x",
      "Two - blah</p>\n<p>Blah - not a reason</p>\n<p>etc...",
      "Three - y",
    ],
  ],
])("splits correctly after joining: %s", (reasons, expected = undefined) => {
  expect(splitWhy(reasons.join("\n"))).toEqual(expected ?? reasons);
});
