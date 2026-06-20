/**
 * @jest-environment jsdom
 */

import { test, expect, describe } from "@jest/globals";
import {
  escapeForPre,
  Highlighter,
  splitWhy,
  type IndexRange,
} from "../highlight-smokedetector-matches";
import fc from "fast-check";

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

describe("Highlighter", () => {
  describe("getPreText", () => {
    function cleanWords(s: string): string {
      return s.split(/\s+/).join(" ").trim();
    }

    test("without highlights, should be the same as escapeForPre", () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (text, spanClass) => {
          expect(new Highlighter(text).getPreText(spanClass)).toBe(
            escapeForPre(text),
          );
        }),
      );
    });

    test("single span added", () => {
      const text = "highlight the words words in this";
      const toHighlight = "words words";
      const highlighter = new Highlighter(text);
      const start = text.indexOf(toHighlight);
      highlighter.addHighlight({ start, end: start + toHighlight.length });
      expect(highlighter.getPreText("hi")).toBe(
        'highlight the <span class="hi">words words</span> in this',
      );
    });

    test("single span added and < escaped", () => {
      const text = "highlight < the words < words in < this";
      const toHighlight = "words < words";
      const highlighter = new Highlighter(text);
      const start = text.indexOf(toHighlight);
      highlighter.addHighlight({ start, end: start + toHighlight.length });
      expect(highlighter.getPreText("hi")).toBe(
        'highlight &lt; the <span class="hi">words &lt; words</span> in &lt; this',
      );
    });

    [
      "",
      "simple nothing highlighted",
      "with a [single highlight]",
      "[many] different [highlights here] etc",
      "with a <faketag></faketag>",
      "with [a <faketag></faketag>]",
      "with a <faketag>[</faketag>]",
    ].forEach((textWithBracketHighlights) => {
      const rawText = textWithBracketHighlights.replace(/[\[\]]/g, " ");
      const highlighter = new Highlighter(rawText);
      for (const match of textWithBracketHighlights.matchAll(/\[[^\[\]]+\]/g)) {
        highlighter.addHighlight({
          start: match.index,
          end: match.index + match[0].length,
        });
      }
      const preNode = document.createElement("pre");
      const className = "any";
      preNode.innerHTML = highlighter.getPreText(className);

      test(`passes through to textContent: ${textWithBracketHighlights}`, () => {
        expect(cleanWords(preNode.textContent)).toBe(cleanWords(rawText));
      });

      test(`spans contain proper text and class: ${textWithBracketHighlights}`, () => {
        const highlightedText = Array.from(
          textWithBracketHighlights.matchAll(/\[([^\[\]]+)\]/g),
        ).map((m) => m[1]!);
        const highlightedTextContent = Array.from(
          preNode.getElementsByClassName(className),
        ).map((el) => el.textContent);
        expect(highlightedTextContent.map(cleanWords)).toStrictEqual(
          highlightedText.map(cleanWords),
        );
      });
    });
  });

  describe("isHighlighted", () => {
    test("new object never highlighted", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (text) => {
          const highlighter = new Highlighter(text);
          for (let i = 0; i < text.length; i++) {
            expect(highlighter.isHighlighted(i)).toBeFalsy();
          }
        }),
      );
    });

    function arbRange(length: number): fc.Arbitrary<IndexRange> {
      return fc
        .tuple(
          fc.integer({ min: 0, max: length - 1 }),
          fc.integer({ min: 0, max: length - 1 }),
        )
        .chain(([i, j]) =>
          fc.constant({ start: Math.min(i, j), end: Math.max(i, j) }),
        );
    }

    test("single range", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1 })
            .chain((text) =>
              fc.tuple(fc.constant(text), arbRange(text.length)),
            ),
          ([text, highlight]) => {
            const highlighter = new Highlighter(text);
            highlighter.addHighlight(highlight);
            for (let i = 0; i < text.length; i++) {
              expect(highlighter.isHighlighted(i)).toBe(
                highlight.start <= i && i < highlight.end,
              );
            }
          },
        ),
      );
    });

    test("many ranges", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1 })
            .chain((text) =>
              fc.tuple(
                fc.constant(text),
                fc.array(arbRange(text.length), { minLength: 2 }),
              ),
            ),
          ([text, highlights]) => {
            const highlighter = new Highlighter(text);
            for (const h of highlights) {
              highlighter.addHighlight(h);
            }
            for (let i = 0; i < text.length; i++) {
              let expected = false;
              for (const h of highlights) {
                expected ||= h.start <= i && i < h.end;
              }
              try {
                expect(highlighter.isHighlighted(i)).toBe(expected);
              } catch (_) {
                expect(highlighter.isHighlighted(i)).toBe({
                  expected,
                  highlighter,
                  i,
                });
              }
            }
          },
        ),
      );
    });
  });
});
