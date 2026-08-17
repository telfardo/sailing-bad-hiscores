import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ORIGINAL_SKILLS, parseJagexHiscores, validatePlayerName } from "../netlify/lib/legacy-hiscores.ts";

test("build output contains the Sailing Bad application", async () => {
  const [html, font] = await Promise.all([
    readFile(new URL("../dist/index.html", import.meta.url), "utf8"),
    readFile(new URL("../dist/fonts/runescape-uf.ttf", import.meta.url)),
  ]);
  assert.match(html, /Sailing Bad HiScores/);
  assert.ok(font.byteLength > 10_000);
  assert.match(html, /src="\/assets\/[^"]+\.js"/);
});

test("Netlify configuration publishes the Vite output and function", async () => {
  const [config, fn] = await Promise.all([
    readFile(new URL("../netlify.toml", import.meta.url), "utf8"),
    readFile(new URL("../netlify/functions/hiscores.mts", import.meta.url), "utf8"),
  ]);
  assert.match(config, /\[build\][\s\S]*command = "npm run build"/);
  assert.match(config, /publish = "dist"/);
  assert.match(config, /functions = "netlify\/functions"/);
  assert.match(fn, /path: "\/api\/hiscores"/);
  assert.match(fn, /rateLimit:/);
  assert.match(fn, /x-sailing-bad-api/);
  assert.match(fn, /lookup\(body\.player, true\)/);
  assert.match(fn, /getLeaderboard\(category\)/);
});

test("player names follow the RuneScape API contract", () => {
  assert.deepEqual(validatePlayerName("  Rune Name  "), { valid: true, name: "Rune Name" });
  assert.equal(validatePlayerName("Rune-Name").valid, true);
  assert.equal(validatePlayerName("Rune_Name").valid, false);
  assert.equal(validatePlayerName("").valid, false);
  assert.equal(validatePlayerName("1234567890123").valid, false);
});

test("legacy totals use exactly the original 23 skills and ignore Overall and Sailing", () => {
  assert.equal(ORIGINAL_SKILLS.length, 23);
  assert.equal(ORIGINAL_SKILLS.includes("Sailing"), false);

  const originalRows = ORIGINAL_SKILLS.map((_, index) => `${index + 1},${index + 2},${(index + 1) * 1_000}`);
  const parsed = parseJagexHiscores([
    "1,9999,999999999",
    ...originalRows,
    "1,88,88888888",
  ].join("\n"), "Rune Name");

  assert.equal(parsed.total_level, originalRows.reduce((sum, _, index) => sum + index + 2, 0));
  assert.equal(parsed.total_xp, originalRows.reduce((sum, _, index) => sum + ((index + 1) * 1_000), 0));
  assert.equal(parsed.sailing_level, 88);
  assert.equal(JSON.parse(parsed.skills_json).length, 23);
});
