/**
 * Chapter calculation functions — totalChapters, flatIndexToRef, pickChapters, formatSegments.
 */

import { type Book } from "./bible-data.js";

export type ChapterRef = Readonly<{
  book: string;
  chapter: number;
}>;

/**
 * Calculate the total number of chapters in a corpus.
 */
export function totalChapters(corpus: readonly Book[]): number {
  let sum = 0;
  for (const b of corpus) sum += b.chapters;
  return sum;
}

/**
 * Convert a flat index (0-based) to a book/chapter reference.
 * @throws Error if index is out of range
 */
export function flatIndexToRef(corpus: readonly Book[], flatIndexZeroBased: number): ChapterRef {
  let idx = flatIndexZeroBased;
  for (const b of corpus) {
    if (idx < b.chapters) {
      return { book: b.name, chapter: idx + 1 };
    }
    idx -= b.chapters;
  }
  throw new Error("Internal error: flatIndex out of range.");
}

/**
 * Pick a sequence of chapters from a corpus, wrapping around if necessary.
 */
export function pickChapters(corpus: readonly Book[], startFlatIndexZeroBased: number, count: number): ChapterRef[] {
  if (count <= 0) return [];
  const total = totalChapters(corpus);
  if (total <= 0) throw new Error("Internal error: corpus has no chapters.");
  const refs: ChapterRef[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (startFlatIndexZeroBased + i) % total;
    refs.push(flatIndexToRef(corpus, idx));
  }
  return refs;
}

/**
 * Format chapter references into human-readable segments (e.g., "Genesis 1-3").
 */
export function formatSegments(refs: readonly ChapterRef[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < refs.length) {
    const start = refs[i]!;
    let end = start;
    let j = i;
    while (j + 1 < refs.length) {
      const cur = refs[j]!;
      const nxt = refs[j + 1]!;
      if (nxt.book === cur.book && nxt.chapter === cur.chapter + 1) {
        end = nxt;
        j++;
      } else break;
    }
    if (start.book === end.book && start.chapter === end.chapter) {
      out.push(`${start.book} ${start.chapter}`);
    } else {
      out.push(`${start.book} ${start.chapter}-${end.chapter}`);
    }
    i = j + 1;
  }
  return out;
}
