import {
  fetchPost,
  Highlighter,
  parseReason,
  isBlacklistReason,
  getReasonPositions,
  type PostField,
} from "./highlight-smokedetector-matches.js";

const FIELDS: PostField[] = ["body", "title", "username"];

async function loadPost() {
  const idElement: HTMLInputElement | null = document.querySelector("#post-id");
  if (!idElement) throw new Error("Couldn't find post-id");
  const post = await fetchPost(parseInt(idElement.value));

  for (const field of FIELDS) {
    for (const fieldElement of document.querySelectorAll(`#post-${field}`)) {
      fieldElement.textContent = post?.[field] ?? "";
    }
  }

  const reasons = [];
  if (post?.why) {
    const highlighters: Record<PostField, Highlighter> = {
      body: new Highlighter(post.body),
      title: new Highlighter(post.title),
      username: new Highlighter(post.username),
    };
    for (const why of post.why) {
      const itemElement = document.createElement("li");
      const preElement = document.createElement("pre");
      itemElement.append(preElement);
      preElement.textContent = why;
      reasons.push(itemElement);

      const whyMatch = parseReason(why);
      if (whyMatch && isBlacklistReason(whyMatch)) {
        preElement.classList += "highlighted";
        const highlighter = highlighters[whyMatch.postField];
        for (const range of getReasonPositions(whyMatch)) {
          highlighter.addHighlight(range);
        }
      }
    }
    for (const field of FIELDS) {
      for (const fieldElement of document.querySelectorAll(`#post-${field}`)) {
        fieldElement.innerHTML = highlighters[field].getPreText("highlighted");
      }
    }
  }
  const whyListElement = document.querySelector("#post-why");
  if (!whyListElement) throw new Error("Couldn't find post-why");
  whyListElement.replaceChildren(...reasons);
}

const loadButtonElement = document.querySelector("#load-button");
if (!loadButtonElement) throw new Error("Couldn't find load-button");
loadButtonElement.addEventListener("click", loadPost);
