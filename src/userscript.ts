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

const pageNodes = getMetasmokePageNodes(document);
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
  pageNodes[field].innerHTML = highlighters[field].getPreText("highlighted");
}

const highlightCSS = `<style>
  .highlighted {
    background-color: #f80;
  }
</style>`;

document.head.insertAdjacentHTML("beforeend", highlightCSS);
