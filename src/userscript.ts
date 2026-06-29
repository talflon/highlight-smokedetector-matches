import { type Post, splitWhy } from ".";

const post: Post = {
  title: document.querySelector(".post-title-bdi")?.textContent ?? "",
  body: document.querySelector("#post-body-tab > pre")?.textContent ?? "",
  username: document.querySelector(".post-username-link")?.textContent ?? "",
  why: splitWhy(document.querySelector(".post-why")?.textContent ?? ""),
};

console.log(post);
