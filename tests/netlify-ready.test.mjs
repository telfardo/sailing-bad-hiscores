import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("build output contains the Sailing Bad application", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  assert.match(html, /Sailing Bad Hiscores/);
  assert.match(html, /src="\/assets\/[^"]+\.js"/);
});

test("Netlify configuration publishes the Vite output and function", async () => {
  const [config, fn] = await Promise.all([
    readFile(new URL("../netlify.toml", import.meta.url), "utf8"),
    readFile(new URL("../netlify/functions/hiscores.mts", import.meta.url), "utf8"),
  ]);
  assert.match(config, /publish = "dist"/);
  assert.match(config, /functions = "netlify\/functions"/);
  assert.match(fn, /path: "\/api\/hiscores"/);
  assert.match(fn, /lookup\(body\.player, true\)/);
  assert.match(fn, /getLeaderboard\(category\)/);
});
