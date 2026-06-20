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
const WHY_SPLIT_REGEX =
  /\n(?=(?:[A-Z][a-z]+(?:[ -][a-z]+)* - )|(?:[BP]o|Bod|Pos|(?:Body|Post)(?: -?)?)\.\.\.)/;

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

export type IndexRange = {
  start: number;
  end: number;
};
export class HighlightedText {
  /** The raw text */
  text: string;
  /** Sorted list of non-overlapping ranges that are highlighted */
  highlights: IndexRange[];

  constructor(text: string) {
    this.text = text;
    this.highlights = [];
  }

  /**
   * Highlights the given range
   * @param highlight the range to add
   */
  addHighlight(highlight: IndexRange) {
    if (highlight.end == highlight.start) return;
    else if (highlight.end < highlight.start)
      throw Error(`Invalid range ${this}`);
    for (let i = 0; i < this.highlights.length; i++) {
      const existing = this.highlights[i]!;
      if (highlight.end < existing.start) {
        // We don't overlap, so this is where to insert.
        this.highlights.splice(i, 0, { ...highlight });
        return;
      } else if (highlight.start <= existing.end) {
        // We overlap, so merge
        existing.start = Math.min(existing.start, highlight.start);
        if (highlight.end > existing.end) {
          existing.end = highlight.end;

          // Delete the ones we overlap entirely
          let delCount = 0;
          for (
            let j = i + 1;
            j < this.highlights.length &&
            existing.end >= this.highlights[j]!.end;
            j++
          ) {
            delCount++;
          }
          if (delCount) {
            this.highlights.splice(i + 1, delCount);
          }

          // If there's now one we overlap partially, merge with it
          const other = this.highlights[i + 1];
          if (other !== undefined) {
            if (existing.end >= other.start) {
              existing.end = other.end;
              this.highlights.splice(i + 1, 1);
            }
          }
        }
        return;
      }
    }
    // We found nowhere to insert or merge, so add to the end.
    this.highlights.push({ ...highlight });
  }

  /**
   * Returns if a given index is highlighted
   * @param index the character index in the raw text
   * @returns true if that index is part of a highlighted range
   */
  isHighlighted(index: number): boolean {
    for (const highlight of this.highlights) {
      if (index < highlight.start) {
        return false;
      } else if (index < highlight.end) {
        return true;
      }
    }
    return false;
  }

  /**
   * Prepares the text for inserting in a <pre>, highlighted with <span>s
   * @param spanClass the class attribute for the highlighted <span>s
   * @returns the HTML text
   */
  getPreText(spanClass: string): string {
    let result = "";
    let pos = 0;
    for (const highlight of this.highlights) {
      result += escapeForPre(this.text.slice(pos, highlight.start));
      result += `<span class="${spanClass}">`;
      result += escapeForPre(this.text.slice(highlight.start, highlight.end));
      result += "</span>";
      pos = highlight.end;
    }
    result += escapeForPre(this.text.slice(pos));
    return result;
  }
}
