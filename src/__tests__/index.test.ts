/**
 * @jest-environment jsdom
 */
/* eslint-disable unicorn/max-nested-calls */
/* eslint-disable unicorn/numeric-separators-style */

import { jest, test, expect, describe } from "@jest/globals";
import {
  escapeForPre,
  getReasonPositions,
  Highlighter,
  isBlacklistReason,
  parseReason,
  splitWhy,
  type IndexRange,
  type PostField,
} from "..";
import fc from "fast-check";

function expectToBeDefined<T>(actual: T | undefined): asserts actual is T {
  expect(actual).toBeDefined();
}

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

function cleanWords(s: string): string {
  return s.replaceAll(/\s+/g, " ").trim();
}

function arbRange(length: number): fc.Arbitrary<IndexRange> {
  return fc
    .tuple(fc.nat(length - 1), fc.nat(length - 1))
    .chain((indices) =>
      fc.constant({ start: Math.min(...indices), end: Math.max(...indices) }),
    );
}

function expectHighlighterInValidState(highlighter: Highlighter) {
  let previous;
  for (const r of highlighter.highlights) {
    expect(Number.isSafeInteger(r.start)).toBeTruthy();
    expect(Number.isSafeInteger(r.end)).toBeTruthy();
    expect(r.end).toBeGreaterThan(r.start);
    expect(r.end).toBeLessThanOrEqual(highlighter.text.length);
    if (previous !== undefined) {
      expect(r.start).toBeGreaterThan(previous.end);
    }
    previous = r;
  }
}

function ignoreRangeWarnings() {
  return jest
    .spyOn(globalThis.console, "warn")
    .mockImplementation((message: string) => {
      if (!message.startsWith("Highlight range out of bounds:")) {
        globalThis.console.warn(message);
      }
    });
}

describe("Highlighter", () => {
  describe("getPreText", () => {
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

    for (const textSeparatedByHighlights of [
      [""],
      ["simple nothing highlighted"],
      ["with a ", "single highlight"],
      ["", "many", " different ", "highlights here", " etc"],
      ["with a <faketag></faketag>"],
      ["with ", "a <faketag></faketag>"],
      ["with a <faketag>", "</faketag>"],
    ]) {
      const rawText = textSeparatedByHighlights.join("");
      const highlighter = new Highlighter(rawText);
      let position = 0;
      let shouldHighlight = false;
      for (const chunk of textSeparatedByHighlights) {
        if (shouldHighlight) {
          highlighter.addHighlight({
            start: position,
            end: position + chunk.length,
          });
        }
        position += chunk.length;
        shouldHighlight = !shouldHighlight;
      }
      const preNode = document.createElement("pre");
      const className = "any";
      preNode.innerHTML = highlighter.getPreText(className);

      test(`passes through to textContent: ${JSON.stringify(textSeparatedByHighlights)}`, () => {
        expect(cleanWords(preNode.textContent)).toBe(cleanWords(rawText));
      });

      test(`spans contain proper text and class: ${JSON.stringify(textSeparatedByHighlights)}`, () => {
        const highlightedText = textSeparatedByHighlights.filter(
          (_value, index) => index % 2,
        );
        const highlightedTextContent = Array.from(
          preNode.querySelectorAll(`span.${className}`),
          (span) => span.textContent,
        );
        expect(
          highlightedTextContent.map((text) => cleanWords(text)),
        ).toStrictEqual(highlightedText.map((text) => cleanWords(text)));
      });
    }

    test("textContent matches text down to whitespace differences", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1 })
            .chain((text) =>
              fc.tuple(fc.constant(text), fc.array(arbRange(text.length))),
            ),
          ([text, highlights]) => {
            const highlighter = new Highlighter(text);
            for (const h of highlights) {
              highlighter.addHighlight(h);
            }
            const preNode = document.createElement("pre");
            preNode.innerHTML = highlighter.getPreText("testing");
            expect(preNode.textContent.replaceAll(/\s+/g, "")).toBe(
              text.replaceAll(/\s+/g, ""),
            );
          },
        ),
      );
    });
  });

  describe("isHighlighted", () => {
    test("new object never highlighted", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (text) => {
          const highlighter = new Highlighter(text);
          for (let charIdx = 0; charIdx < text.length; charIdx++) {
            expect(highlighter.isHighlighted(charIdx)).toBeFalsy();
          }
        }),
      );
    });

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
            for (let charIdx = 0; charIdx < text.length; charIdx++) {
              expect(highlighter.isHighlighted(charIdx)).toBe(
                highlight.start <= charIdx && charIdx < highlight.end,
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
            for (let charIdx = 0; charIdx < text.length; charIdx++) {
              let isExpected = false;
              for (const h of highlights) {
                isExpected ||= h.start <= charIdx && charIdx < h.end;
              }
              try {
                expect(highlighter.isHighlighted(charIdx)).toBe(isExpected);
              } catch {
                expect(highlighter.isHighlighted(charIdx)).toBe({
                  isExpected,
                  highlighter,
                  i: charIdx,
                });
              }
            }
          },
        ),
      );
    });
  });

  describe("addHighlight", () => {
    test("errors iff invalid integer range", () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.record({ start: fc.integer(), end: fc.integer() }),
          (text, highlight) => {
            const highlighter = new Highlighter(text);
            if (0 <= highlight.start && highlight.start <= highlight.end) {
              ignoreRangeWarnings();
              highlighter.addHighlight(highlight);
            } else {
              expect(() => highlighter.addHighlight(highlight)).toThrow(
                RangeError,
              );
            }
          },
        ),
      );
    });
  });

  describe("addHighlight", () => {
    test("errors if invalid numbers in range", () => {
      const arbNumber = fc.oneof(fc.nat(10), fc.double());
      fc.assert(
        fc.property(
          fc.string(),
          fc
            .record({ start: arbNumber, end: arbNumber })
            .filter(
              ({ start, end }) =>
                !Number.isSafeInteger(start) || !Number.isSafeInteger(end),
            ),
          (text, highlight) => {
            const highlighter = new Highlighter(text);
            expect(() => highlighter.addHighlight(highlight)).toThrow(
              RangeError,
            );
          },
        ),
      );
    });
  });

  test("remains in valid state for valid inputs", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1 })
          .chain((text) =>
            fc.tuple(fc.constant(text), fc.array(arbRange(text.length))),
          ),
        ([text, highlights]) => {
          const highlighter = new Highlighter(text);
          expectHighlighterInValidState(highlighter);
          for (const h of highlights) {
            highlighter.addHighlight(h);
            expectHighlighterInValidState(highlighter);
          }
        },
      ),
    );
  });

  test("remains in valid state for valid inputs", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1 })
          .chain((text) =>
            fc.tuple(fc.constant(text), fc.array(arbRange(text.length))),
          ),
        ([text, highlights]) => {
          const highlighter = new Highlighter(text);
          expectHighlighterInValidState(highlighter);
          for (const h of highlights) {
            highlighter.addHighlight(h);
            expectHighlighterInValidState(highlighter);
          }
        },
      ),
    );
  });

  test("remains in valid state for all inputs", () => {
    const arbNumber = (text: string) =>
      fc.oneof(fc.nat(text.length), fc.double());
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1 })
          .chain((text) =>
            fc.tuple(
              fc.constant(text),
              fc.array(
                fc.record({ start: arbNumber(text), end: arbNumber(text) }),
              ),
            ),
          ),
        ([text, highlights]) => {
          ignoreRangeWarnings();
          const highlighter = new Highlighter(text);
          expectHighlighterInValidState(highlighter);
          for (const h of highlights) {
            try {
              highlighter.addHighlight(h);
            } catch (error) {
              if (!(error instanceof RangeError)) throw error;
            }
            expectHighlighterInValidState(highlighter);
          }
        },
      ),
    );
  });
});

describe("WhyMatch", () => {
  test.each(["", "Some other reason"])(
    "Not a blacklist reason: %s",
    (whyLine) => {
      const whyMatch = parseReason(whyLine);
      expect(whyMatch && isBlacklistReason(whyMatch)).toBeFalsy();
    },
  );

  test.each<[string, PostField, [number, number][]]>([
    ["Potentially bad keyword in body - Position 1-5: what", "body", [[1, 5]]],
    [
      "Potentially bad keyword in answer - Position 558-572: bademail 12, Position 576-591: G M A I L C O M",
      "body",
      [
        [558, 572],
        [576, 591],
      ],
    ],
    [
      "Bad keyword in title - Positions 10-15, 19-23: whatEver",
      "title",
      [
        [10, 15],
        [19, 23],
      ],
    ],
    [
      "Potentially bad keyword in username - Position 0-9: sus",
      "username",
      [[0, 9]],
    ],
    [
      "Blacklisted website in body - Position 12883-12901: evil.site",
      "body",
      [[12883, 12901]],
    ],
    ["Potentially bad keyword in body - potentially bad keyword", "body", []],
    ["Bad keyword in title - Position 2-10: 3-4", "title", [[2, 10]]],
    ["Potentially bad keyword in username - Simon says 5-8", "username", []],
    [
      "Bad keyword in body - Positions 10-15, 19-23: one, Position 50-66: Two, Positions 0-1, 100-101, 200-300: THREE",
      "body",
      [
        [10, 15],
        [19, 23],
        [50, 66],
        [0, 1],
        [100, 101],
        [200, 300],
      ],
    ],
    [
      "Bad keyword in body - Positions 10-15, 19-23, +7 more: one, Position 50-66: Two, Positions 0-1, 100-101, 200-300: THREE",
      "body",
      [
        [10, 15],
        [19, 23],
        [50, 66],
        [0, 1],
        [100, 101],
        [200, 300],
      ],
    ],
    [
      "Bad keyword in body - Positions 10-15, 19-23, +16 more: x",
      "body",
      [
        [10, 15],
        [19, 23],
      ],
    ],
    [
      "Potentially bad keyword in title - Positions 0-5, 10-15: Position 6-5: tricked you!",
      "title",
      [
        [0, 5],
        [10, 15],
      ],
    ],
  ])(
    "Parsing WhyMatch with positions: %s",
    (whyLine, postField, expectedPositions) => {
      const whyMatch = parseReason(whyLine);
      expectToBeDefined(whyMatch);
      expect(whyMatch.postField).toBe(postField);
      expect(isBlacklistReason(whyMatch)).toBeTruthy();
      expect(new Set(getReasonPositions(whyMatch))).toStrictEqual(
        new Set(
          expectedPositions.map(([start, end]) => {
            return { start, end };
          }),
        ),
      );
    },
  );
});
