/* eslint-disable no-unused-labels */
import {
  getMetasmokePageNodes,
  getPostFromMetasmokePage,
  getReasonPositions,
  Highlighter,
  isBlacklistReason,
  parseReason,
  POST_FIELDS,
  type PostField,
} from ".";

/**
 * Reads the post from the Metasmoke page,
 * and adds highlights to the body, title, and username.
 * Won't run a second time if the highlights have already been added.
 */
function addHighlights() {
  if (!location.pathname.startsWith("/post/")) {
    DEV: console.log(
      `not adding highlights; not a post path: ${location.pathname}`,
    );
    return;
  }
  DEV: setDebugColor("green", "start addHighlights()");
  const pageNodes = getMetasmokePageNodes(document);
  if (pageNodes.body.dataset.highlightsAdded) {
    DEV: setDebugColor("blue", "already there, no need to run again");
    return;
  }
  const post = getPostFromMetasmokePage(pageNodes);

  const highlighters: Record<PostField, Highlighter> = {
    body: new Highlighter(post.body),
    title: new Highlighter(post.title),
    username: new Highlighter(post.username),
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
    node.innerHTML = highlighters[field].getPreText("highlighted");
    node.dataset.highlightsAdded = "true";
  }
  DEV: setDebugColor("orange", "finished addHighlights()");
}

function setDebugColor(color: string, message?: unknown) {
  if (message) console.log(message);
  document.body.style.border = `thick solid ${color}`;
}

DEV: setDebugColor("black", "userscript starting");

addEventListener("load", addHighlights);
// Metasmoke uses Turbolinks, so we must register for its page loads
addEventListener("turbolinks:load", addHighlights);
if (document.readyState !== "loading") {
  // In case we missed the first events
  addHighlights();
}

const highlightCSS = `<style>
  .highlighted {
    background-color: #f80;
  }
</style>`;

document.head.insertAdjacentHTML("beforeend", highlightCSS);
