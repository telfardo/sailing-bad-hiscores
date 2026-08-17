import { findPlayer, getLeaderboard, getLegacyRank, savePlayer, type SkillSnapshot, type StoredPlayer } from "../lib/hiscores";

const SKILLS = [
  "Attack", "Defence", "Strength", "Hitpoints", "Ranged", "Prayer", "Magic", "Cooking",
  "Woodcutting", "Fletching", "Fishing", "Firemaking", "Crafting", "Smithing", "Mining",
  "Herblore", "Agility", "Thieving", "Slayer", "Farming", "Runecrafting", "Hunter", "Construction",
];
const CACHE_MS = 15 * 60 * 1000;
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function normalizePlayerName(value: string) {
  return value.replace(/[\u00a0_]+/g, " ").replace(/\s+/g, " ").trim();
}

function parseSkill(line: string, name: string): SkillSnapshot {
  const [rankValue, levelValue, xpValue] = line.split(",").map(Number);
  return {
    name,
    rank: Number.isFinite(rankValue) ? rankValue : -1,
    level: Number.isFinite(levelValue) && levelValue > 0 ? levelValue : 1,
    xp: Number.isFinite(xpValue) && xpValue > 0 ? xpValue : 0,
  };
}

function publicPlayer(player: StoredPlayer, rank: number, cached: boolean, tracked: boolean) {
  return {
    name: player.display_name,
    legacyRank: rank,
    totalLevel: player.total_level,
    totalXp: player.total_xp,
    sailingLevel: player.sailing_level,
    sailingXp: player.sailing_xp,
    skills: JSON.parse(player.skills_json) as SkillSnapshot[],
    updatedAt: new Date(player.updated_at).toISOString(),
    cached,
    tracked,
  };
}

async function fetchJagexPlayer(requestedName: string): Promise<StoredPlayer | Response> {
  let response: Response;
  try {
    response = await fetch(`https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws?player=${encodeURIComponent(requestedName)}`, {
      headers: { accept: "text/plain", "user-agent": "Sailing-Bad-Hiscores/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return json({ error: "Jagex HiScores did not answer. Try again in a moment." }, 502);
  }

  if (response.status === 404) return json({ error: "That player was not found on the official HiScores." }, 404);
  if (response.status === 429) return json({ error: "The official HiScores are busy. Please wait before trying again." }, 429);
  if (!response.ok) return json({ error: "The official HiScores are unavailable right now." }, 502);

  const lines = (await response.text()).trim().split(/\r?\n/);
  if (lines.length < 25) return json({ error: "Jagex returned an unfamiliar HiScores format." }, 502);

  const skills = SKILLS.map((name, index) => parseSkill(lines[index + 1], name));
  const sailing = parseSkill(lines[24], "Sailing");
  return {
    normalized_name: requestedName.toLowerCase(),
    display_name: requestedName,
    total_level: skills.reduce((sum, skill) => sum + skill.level, 0),
    total_xp: skills.reduce((sum, skill) => sum + skill.xp, 0),
    sailing_level: sailing.level,
    sailing_xp: sailing.xp,
    skills_json: JSON.stringify(skills),
    updated_at: Date.now(),
  };
}

async function lookup(requestedName: string, optIn: boolean, category = "Overall") {
  const name = normalizePlayerName(requestedName);
  if (name.length === 0 || name.length > 12 || !/^[a-zA-Z0-9 -]+$/.test(name)) {
    return json({ error: "Enter a valid RuneScape name of up to 12 characters." }, 400);
  }

  const stored = await findPlayer(name.toLowerCase());
  if (stored && Date.now() - stored.updated_at < CACHE_MS) {
    const [legacyRank, board] = await Promise.all([getLegacyRank(stored.total_level, stored.total_xp), getLeaderboard(category)]);
    return json({ player: publicPlayer(stored, legacyRank, true, true), ...board });
  }

  const fetched = await fetchJagexPlayer(name);
  if (fetched instanceof Response) return fetched;

  const tracked = optIn || stored !== null;
  if (tracked) await savePlayer(fetched);
  const [legacyRank, board] = await Promise.all([getLegacyRank(fetched.total_level, fetched.total_xp), getLeaderboard(category)]);
  return json({ player: publicPlayer(fetched, legacyRank, false, tracked), ...board });
}

export default async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: JSON_HEADERS });

  if (request.method === "GET") {
    const url = new URL(request.url);
    const requestedName = url.searchParams.get("player") ?? "";
    const category = url.searchParams.get("category") ?? "Overall";
    return requestedName ? lookup(requestedName, false, category) : json(await getLeaderboard(category));
  }

  if (request.method === "POST") {
    let body: { player?: unknown };
    try {
      body = await request.json() as { player?: unknown };
    } catch {
      return json({ error: "Send a player name as JSON." }, 400);
    }
    return typeof body.player === "string"
      ? lookup(body.player, true)
      : json({ error: "A player name is required." }, 400);
  }

  return json({ error: "Method not allowed." }, 405);
};

export const config = { path: "/api/hiscores" };
