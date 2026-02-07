import { describe, it, expect } from "vitest";
import { OT, GOSPELS, NT_REST } from "../src/bible-data.js";
import { totalChapters } from "../src/chapter-math.js";

describe("Bible Data (direct import)", () => {
  it("should have correct OT chapter count (929)", () => {
    expect(totalChapters(OT)).toBe(929);
  });

  it("should have correct Gospels chapter count (89)", () => {
    expect(totalChapters(GOSPELS)).toBe(89);
  });

  it("should have correct NT Rest chapter count (171)", () => {
    expect(totalChapters(NT_REST)).toBe(171);
  });

  it("should have 39 OT books", () => {
    expect(OT.length).toBe(39);
  });

  it("should have 4 Gospel books", () => {
    expect(GOSPELS.length).toBe(4);
  });

  it("should have 23 NT Rest books", () => {
    expect(NT_REST.length).toBe(23);
  });

  it("should have total 66 books in the Bible", () => {
    expect(OT.length + GOSPELS.length + NT_REST.length).toBe(66);
  });

  it("should have total 1189 chapters in the Bible", () => {
    expect(totalChapters(OT) + totalChapters(GOSPELS) + totalChapters(NT_REST)).toBe(1189);
  });
});
