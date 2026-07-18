// ==UserScript==
// @name highlight-smokedetector-matches
// @version 0.1.2
// @author Daniel Getz
// @description Highlights the actual SmokeDetector matches in Metasmoke records
// @namespace https://getzit.net
// @downloadURL https://raw.githubusercontent.com/talflon/highlight-smokedetector-matches/main/highlight-smokedetector-matches.user.js
// @supportURL  https://github.com/talflon/highlight-smokedetector-matches/issues
// @match *://metasmoke.erwaysoftware.com/*
// @match *://m.erwaysoftware.com/*
// @noframes
// ==/UserScript==
"use strict";
(() => {
  // src/index.ts
  function getMetasmokePageNodes(domNode) {
    const title = domNode.querySelector(".post-title-bdi");
    if (!title) throw new Error("Couldn't find title");
    const body = domNode.querySelector(
      ":scope #post-body-tab > pre"
    );
    if (!body) throw new Error("Couldn't find body");
    const username = domNode.querySelector(".post-username-link");
    if (!username) throw new Error("Couldn't find username");
    const why = domNode.querySelector(".post-why");
    if (!why) throw new Error("Couldn't find why");
    return { title, body, username, why };
  }
  function getPostFromMetasmokePage(pageNodes) {
    return {
      title: pageNodes.title.textContent,
      body: pageNodes.body.textContent,
      username: pageNodes.username.textContent,
      why: splitWhy(pageNodes.why.textContent)
    };
  }
  function splitWhy(rawWhy) {
    return rawWhy.split(
      // Split on newlines, but only when the next line looks like it's a new SmokeDetector reason,
      // instead of part of a quotation from the post which included newlines.
      /\n(?=[A-Z][a-z]*(?:[ -][a-z]+)* - |[BP]o|Bod|Pos|(?:Body|Post)(?: -?)?\.\.\.)/
    ).filter((w) => w.trim());
  }
  var POST_FIELDS = ["body", "title", "username"];
  function parseReason(whyLine) {
    const reasonMatch = whyLine.match(
      // Match the reason text plus the punctuation between it and the details,
      // but capture only the reason text. Can't be done in one capturing group, so use multiple.
      /^(?:([A-Z][a-z]*(?:[ -][a-z]+)*) - |([BP]o|Bod|Pos)|(Body|Post)(?: -?)?\.\.\.)/
    );
    if (!reasonMatch) {
      return void 0;
    }
    const reason = reasonMatch.find((reason2, index) => index && reason2);
    const details = whyLine.slice(reasonMatch[0].length);
    const postFieldMatch = reason.match(/ in (body|answer|title|username)$/);
    return postFieldMatch ? {
      reason: reason.slice(0, postFieldMatch.index),
      postField: postFieldMatch[1] === "answer" ? "body" : postFieldMatch[1],
      details
    } : { reason, details };
  }
  var BLACKLIST_REASONS = /* @__PURE__ */ new Set([
    "Potentially bad keyword",
    "Bad keyword",
    "Blacklisted website"
  ]);
  function isBlacklistReason(whyMatch) {
    return !!whyMatch.postField && BLACKLIST_REASONS.has(whyMatch.reason);
  }
  function getReasonPositions(whyMatch) {
    const positions = [];
    for (const posListMatch of whyMatch.details.matchAll(
      // The capturing group will be a comma-separated list of position range pairs
      /\bPositions? ((?:0|[1-9][0-9]*)-[1-9][0-9]*(?:, (?:0|[1-9][0-9]*)-[1-9][0-9]*)*)(?:, \+[1-9][0-9]* more)?: .[^,]*/g
    )) {
      for (const posMatch of posListMatch[1].matchAll(
        // Capture each position
        /(0|[1-9][0-9]*)-([1-9][0-9]*)/g
      )) {
        positions.push({ start: Number(posMatch[1]), end: Number(posMatch[2]) });
      }
    }
    return positions;
  }
  var Highlighter = class {
    constructor(text) {
      this.text = text;
      this.charLength = [...text].length;
      this.highlights = [];
    }
    /**
     * Highlights the given range
     * @param highlight the range to add
     */
    addHighlight(highlight) {
      if (highlight.end < highlight.start || highlight.start < 0 || !Number.isSafeInteger(highlight.start) || !Number.isSafeInteger(highlight.end))
        throw new RangeError(
          `Invalid range ${highlight.start}, ${highlight.end}`
        );
      if (highlight.end > this.charLength) {
        console.warn(
          `Highlight range out of bounds: ${highlight.start}, ${highlight.end} for ${this.charLength} chars`
        );
        if (highlight.start >= this.charLength) return;
        highlight = { start: highlight.start, end: this.charLength };
      }
      if (highlight.end == highlight.start) return;
      for (let insertIdx = 0; insertIdx < this.highlights.length; insertIdx++) {
        const existing = this.highlights[insertIdx];
        if (highlight.end < existing.start) {
          this.highlights.splice(insertIdx, 0, { ...highlight });
          return;
        }
        if (highlight.start <= existing.end) {
          existing.start = Math.min(existing.start, highlight.start);
          if (highlight.end > existing.end) {
            existing.end = highlight.end;
            let delCount = 0;
            for (let delIdx = insertIdx + 1; delIdx < this.highlights.length && existing.end >= this.highlights[delIdx].end; delIdx++) {
              delCount++;
            }
            if (delCount) {
              this.highlights.splice(insertIdx + 1, delCount);
            }
            const other = this.highlights[insertIdx + 1];
            if (other !== void 0 && existing.end >= other.start) {
              existing.end = other.end;
              this.highlights.splice(insertIdx + 1, 1);
            }
          }
          return;
        }
      }
      this.highlights.push({ ...highlight });
    }
    /**
     * Returns if a given index is highlighted
     * @param index the character index in the raw text
     * @returns true if that index is part of a highlighted range
     */
    isHighlighted(index) {
      for (const highlight of this.highlights) {
        if (index < highlight.start) {
          return false;
        }
        if (index < highlight.end) {
          return true;
        }
      }
      return false;
    }
    /**
     * Replaces the children of an element with the text highlighted with <span>s
     * @param spanClass the class attribute for the highlighted <span>s
     */
    setToHighlightedText(element, spanClass) {
      let pos = 0;
      const chars = [...this.text];
      element.replaceChildren();
      for (const highlight of this.highlights) {
        const spanElement = document.createElement("span");
        spanElement.className = spanClass;
        spanElement.textContent = chars.slice(highlight.start, highlight.end).join("");
        element.append(chars.slice(pos, highlight.start).join(""), spanElement);
        pos = highlight.end;
      }
      element.append(chars.slice(pos).join(""));
    }
  };

  // src/userscript.ts
  function addHighlights() {
    if (!location.pathname.startsWith("/post/")) {
      return;
    }
    const pageNodes = getMetasmokePageNodes(document);
    if (pageNodes.body.dataset.highlightsAdded) {
      return;
    }
    const post = getPostFromMetasmokePage(pageNodes);
    const highlighters = {
      body: new Highlighter(post.body),
      title: new Highlighter(post.title),
      username: new Highlighter(post.username)
    };
    for (const why of post.why) {
      const whyMatch = parseReason(why);
      if (whyMatch && isBlacklistReason(whyMatch)) {
        const highlighter = highlighters[whyMatch.postField];
        for (const range of getReasonPositions(whyMatch)) {
          highlighter.addHighlight(range);
        }
      }
    }
    for (const field of POST_FIELDS) {
      const node = pageNodes[field];
      highlighters[field].setToHighlightedText(node, "highlighted");
      node.dataset.highlightsAdded = "true";
    }
  }
  addEventListener("load", addHighlights);
  addEventListener("turbolinks:load", addHighlights);
  if (document.readyState !== "loading") {
    addHighlights();
  }
  var highlightCSS = `<style>
  .highlighted {
    background-color: #f80;
  }
</style>`;
  document.head.insertAdjacentHTML("beforeend", highlightCSS);
})();
