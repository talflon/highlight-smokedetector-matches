import { MS_API_KEY } from "./config.js";

const MS_BASE_URL = "https://metasmoke.erwaysoftware.com";
const POST_FILTER = "MLIKLGJGLHIGHHHKKIKKMMMONHGILIH";

type ResponsePost = {
  id: number | null;
  title: string | null;
  body: string | null;
  username: string | null;
  why: string | null;
};

type Response<T> = {
  items: T[];
  has_more: boolean;
};

export type Post = {
  title: string;
  body: string;
  username: string;
  why: string[];
};

export async function fetchPost(id: number): Promise<Post | undefined> {
  const response = await fetch(
    `${MS_BASE_URL}/api/v2.0/posts/${id}?key=${MS_API_KEY}&filter=${POST_FILTER}`,
  );
  if (!response.ok) {
    throw new Error(
      `Error fetching post ${id} from ${MS_BASE_URL}: ${response.status} ${response.statusText}`,
    );
  }
  const results: Response<ResponsePost> = await response.json();
  if (results.items[0] === undefined) {
    return undefined;
  }
  const { title, body, username, why } = results.items[0];
  return {
    title: title ?? "",
    body: body ?? "",
    username: username ?? "",
    why: splitWhy(why ?? ""),
  };
}

// Split on newlines, but only when the next line looks like it's a new SmokeDetector reason,
// instead of part of a quotation from the post which included newlines.
const WHY_SPLIT_REGEX = /\n(?=(?:[A-Z][a-z]+(?:[ -][a-z]+)* - ))/;

export function splitWhy(rawWhy: string): string[] {
  /**
   * Splits the "why" field of a post into an array of individual reasons,
   * since it's a line-deliminated string field.
   */
  return rawWhy.split(WHY_SPLIT_REGEX).filter((w) => w.trim()); // remove blank lines
}

export function escapeForPre(html: string): string {
  return html.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
}
