import { describe, it, expect } from "vitest";
import { totalChapters, flatIndexToRef, pickChapters, formatSegments, type ChapterRef } from "../src/chapter-math.js";
import { type Book } from "../src/bible-data.js";

describe("totalChapters (direct import)", () => {
  it("should return 0 for empty corpus", () => {
    expect(totalChapters([])).toBe(0);
  });

  it("should sum chapters correctly", () => {
    const corpus: Book[] = [
      { name: "Book1", chapters: 10 },
      { name: "Book2", chapters: 5 },
    ];
    expect(totalChapters(corpus)).toBe(15);
  });
});

describe("flatIndexToRef (direct import)", () => {
  const testCorpus: Book[] = [
    { name: "Genesis", chapters: 3 },
    { name: "Exodus", chapters: 2 },
  ];

  it("should return first chapter of first book for index 0", () => {
    expect(flatIndexToRef(testCorpus, 0)).toEqual({ book: "Genesis", chapter: 1 });
  });

  it("should throw for out of range index", () => {
    expect(() => flatIndexToRef(testCorpus, 5)).toThrow("out of range");
  });
});

describe("pickChapters (direct import)", () => {
  const testCorpus: Book[] = [
    { name: "Genesis", chapters: 3 },
    { name: "Exodus", chapters: 2 },
  ];

  it("should return empty array for count 0", () => {
    expect(pickChapters(testCorpus, 0, 0)).toEqual([]);
  });

  it("should wrap around corpus", () => {
    expect(pickChapters(testCorpus, 4, 2)).toEqual([
      { book: "Exodus", chapter: 2 },
      { book: "Genesis", chapter: 1 },
    ]);
  });
});

describe("formatSegments (direct import)", () => {
  it("should format consecutive chapters as range", () => {
    const refs: ChapterRef[] = [
      { book: "Genesis", chapter: 1 },
      { book: "Genesis", chapter: 2 },
      { book: "Genesis", chapter: 3 },
    ];
    expect(formatSegments(refs)).toEqual(["Genesis 1-3"]);
  });

  it("should separate chapters from different books", () => {
    const refs: ChapterRef[] = [
      { book: "Genesis", chapter: 50 },
      { book: "Exodus", chapter: 1 },
    ];
    expect(formatSegments(refs)).toEqual(["Genesis 50", "Exodus 1"]);
  });
});
