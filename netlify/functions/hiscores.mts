import { findPlayer, getLeaderboard, getLegacyRank, savePlayer, type SkillSnapshot, type StoredPlayer } from "../lib/hiscores";
import { parseJagexHiscores, validatePlayerName } from "../lib/legacy-hiscores";

const CACHE_MS = 15 * 60 * 1000;
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-sailing-bad-api": "netlify-function-v2",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
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
  if (response.status === 429) return json({ error: "The official HiScores are busy. Please wait before trying again." }, 503, { "retry-after": "60" });
  if (!response.ok) return json({ error: "The official HiScores are unavailable right now." }, 502);

  try {
    return parseJagexHiscores(await response.text(), requestedName);
  } catch {
    return json({ error: "Jagex returned an unfamiliar HiScores format." }, 502);
  }
}

async function lookup(requestedName: string, optIn: boolean, category = "Overall") {
  const validation = validatePlayerName(requestedName);
  if (!validation.valid) return json({ error: validation.error }, 400);
  const { name } = validation;

  const stored = await findPlayer(name.toLowerCase());
  if (stored && Date.now() - stored.updated_at < CACHE_MS) {
    const [legacyRank, board] = await Promise.all([getLegacyRank(stored.total_level, stored.total_xp), getLeaderboard(category)]);
    return json({ player: publicPlayer(stored, legacyRank, true, true), ...board });
  }

  const fetched = await fetchJagexPlayer(name);
  if (fetched instanceof Response) return fetched;

  const tracked = optIn || stored !== null;
  if (tracked) {
    // Jagex's index_lite rows carry no canonical spelling, so display_name is
    // only ever the name somebody typed. A visitor searching an existing player
    // must not restyle them, so a refresh keeps the name already on the board;
    // only the opt-in, which comes from the player's own client, can set it.
    await savePlayer(stored && !optIn ? { ...fetched, display_name: stored.display_name } : fetched);
  }
  const [legacyRank, board] = await Promise.all([getLegacyRank(fetched.total_level, fetched.total_xp), getLeaderboard(category)]);
  return json({ player: publicPlayer(fetched, legacyRank, false, tracked), ...board });
}

async function handleRequest(request: Request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: JSON_HEADERS });

  if (request.method === "GET") {
    const url = new URL(request.url);
    const requestedName = url.searchParams.get("player") ?? "";
    const category = url.searchParams.get("category") ?? "Overall";
    return requestedName ? lookup(requestedName, false, category) : json(await getLeaderboard(category));
  }

  if (request.method === "POST") {
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      return json({ error: "Content-Type must be application/json." }, 415);
    }
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 1_024) {
      return json({ error: "Request body is too large." }, 413);
    }

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

  return json({ error: "Method not allowed." }, 405, { allow: "GET, POST, OPTIONS" });
}

export default async (request: Request) => {
  try {
    return await handleRequest(request);
  } catch (error) {
    console.error("HiScores function failed", error);
    return json({ error: "The HiScores service is temporarily unavailable. Please try again shortly." }, 503);
  }
};

export const config = {
  path: "/api/hiscores",
  rateLimit: {
    action: "rate_limit",
    aggregateBy: ["ip"],
    windowLimit: 60,
    windowSize: 60,
  },
};
