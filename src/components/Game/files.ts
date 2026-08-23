import Papa from "papaparse";
import { CardData } from "types";

/** A path inside `public/`, resolved against whatever base the app is served from. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

/**
 * The card catalogue. Boolean-looking cells become real booleans; everything
 * else stays a string, since a template can print any column as text.
 */
export function parseCards(text: string, onCards: (cards: CardData[]) => void) {
  Papa.parse<CardData>(text, {
    header: true,
    skipEmptyLines: true,
    transform: (value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      return value;
    },
    complete: (results) => onCards(results.data),
    error: (error: Error) => console.error("Error parsing cards CSV:", error),
  });
}

/** Optional shipped data: a project may not include a scenario or templates. */
export function fetchOptionalJson<T>(path: string): Promise<T | null> {
  return fetch(asset(path))
    .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
    .catch(() => null);
}

/**
 * Reads the picked file as text, then clears the input so choosing the same
 * file twice in a row still fires a change event.
 */
function readFile(input: HTMLInputElement | null, onText: (text: string) => void) {
  const file = input?.files?.[0];
  if (!file || !input) return;
  const reader = new FileReader();
  reader.onload = (e) => onText(String(e.target?.result ?? ""));
  reader.readAsText(file);
  input.value = "";
}

export function readJson<T>(
  input: HTMLInputElement | null,
  label: string,
  onParsed: (value: T) => void
) {
  readFile(input, (text) => {
    try {
      onParsed(JSON.parse(text) as T);
    } catch (err) {
      console.error(`Invalid ${label} JSON:`, err);
    }
  });
}

export function readCards(input: HTMLInputElement | null, onCards: (cards: CardData[]) => void) {
  readFile(input, (text) => parseCards(text, onCards));
}

/** A temporary anchor is the only way for a page to name the file it hands over. */
function saveAs(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadUrl(url: string, filename: string) {
  saveAs(url, filename);
}

export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })
  );
  saveAs(url, filename);
  URL.revokeObjectURL(url);
}
