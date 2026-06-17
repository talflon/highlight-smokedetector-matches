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
  [["Body - x", "Bo...abc", "Body - y"]],
  [["Body - x", "Bod...abc", "Body - y"]],
  [["Body - x", "Body...abc", "Body - y"]],
  [["Body - x", "Body ...abc", "Body - y"]],
  [["Body - x", "Body -...abc", "Body - y"]],
  [["Body - x", "Po...abc", "Body - y"]],
  [["Body - x", "Pos...abc", "Body - y"]],
  [["Body - x", "Post...abc", "Body - y"]],
  [["Body - x", "Post ...abc", "Body - y"]],
  [["Body - x", "Post -...abc", "Body - y"]],
  [["Body - x\nNope...abc", "Body - y"]],
])("splits correctly after joining: %s", (reasons, expected = reasons) => {
  expect(splitWhy(reasons.join("\n"))).toEqual(expected);
});
