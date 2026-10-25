import { describe, expect, it } from "vitest";
import { assertPlausibleLocalDate, dayOfSeason } from "@/lib/dates";
import { safeReturnTo } from "@/lib/google";
import { hit } from "@/lib/rate-limit";
import { seal, unseal } from "@/lib/crypto";

describe("safeReturnTo", () => {
  it.each([
    ["/studio", "/studio"],
    ["/gallery?x=1", "/gallery?x=1"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["/ok\r\nSet-Cookie: x", "/"],
    [null, "/"],
  ])("%s → %s", (input, expected) => expect(safeReturnTo(input)).toBe(expected));
});

describe("dates", () => {
  it("accepts dates within a day of UTC and rejects others", () => {
    const now = new Date("2026-10-25T12:00:00Z");
    expect(assertPlausibleLocalDate("2026-10-24", now)).toBe("2026-10-24");
    expect(assertPlausibleLocalDate("2026-10-26", now)).toBe("2026-10-26");
    expect(() => assertPlausibleLocalDate("2026-10-20", now)).toThrow();
  });
  it("counts days into the meteorological season", () => {
    expect(dayOfSeason("2026-09-01")).toBe(1);
    expect(dayOfSeason("2026-10-24")).toBe(54);
    expect(dayOfSeason("2027-01-01")).toBe(32);
  });
});

describe("rate limiter", () => {
  it("blocks after the limit within a window", () => {
    const policy = { name: "t", limit: 2, windowMs: 1000 };
    expect(hit(policy, "k", 0).allowed).toBe(true);
    expect(hit(policy, "k", 1).allowed).toBe(true);
    expect(hit(policy, "k", 2).allowed).toBe(false);
    expect(hit(policy, "k", 1001).allowed).toBe(true);
  });
});

describe("seal", () => {
  it("round-trips and rejects tampering", async () => {
    const token = await seal({ state: "abc" }, 60);
    expect(await unseal<{ state: string }>(token)).toMatchObject({ state: "abc" });
    expect(await unseal(token.slice(0, -2) + "xx")).toBeNull();
  });
});
