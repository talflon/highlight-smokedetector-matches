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
    why: (why ?? "").split("\n").filter((r) => r),
  };
}

export function escapeForPre(html: string): string {
  return html.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
}
