import { getStore } from "@netlify/blobs";

export type SkillSnapshot = { name: string; level: number; xp: number; rank: number };
export type StoredPlayer = {
  normalized_name: string;
  display_name: string;
  total_level: number;
  total_xp: number;
  sailing_level: number;
  sailing_xp: number;
  skills_json: string;
  updated_at: number;
};

const STORE_NAME = "sailing-bad-players";
const PLAYER_PREFIX = "players/";

function getPlayerStore() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

function playerKey(normalizedName: string) {
  return `${PLAYER_PREFIX}${encodeURIComponent(normalizedName)}`;
}

export async function findPlayer(normalizedName: string) {
  return getPlayerStore().get(playerKey(normalizedName), { type: "json" }) as Promise<StoredPlayer | null>;
}

export async function savePlayer(player: StoredPlayer) {
  await getPlayerStore().setJSON(playerKey(player.normalized_name), player);
}

async function getAllPlayers() {
  const store = getPlayerStore();
  const { blobs } = await store.list({ prefix: PLAYER_PREFIX });
  const players = await Promise.all(
    blobs.map((blob) => store.get(blob.key, { type: "json" }) as Promise<StoredPlayer | null>),
  );
  return players.filter((player): player is StoredPlayer => player !== null);
}

function byLegacyTotal(a: StoredPlayer, b: StoredPlayer) {
  return b.total_level - a.total_level || b.total_xp - a.total_xp || a.normalized_name.localeCompare(b.normalized_name);
}

function leaderboardValues(player: StoredPlayer, category: string) {
  if (category === "Overall") return { level: player.total_level, xp: player.total_xp };
  const skillName = category === "Runecraft" ? "Runecrafting" : category;
  const skills = JSON.parse(player.skills_json) as SkillSnapshot[];
  const skill = skills.find((entry) => entry.name === skillName);
  return { level: skill?.level ?? 1, xp: skill?.xp ?? 0 };
}

export async function getLegacyRank(totalLevel: number, totalXp: number) {
  const players = await getAllPlayers();
  return players.filter((player) => player.total_level > totalLevel || (player.total_level === totalLevel && player.total_xp > totalXp)).length + 1;
}

export async function getLeaderboard(category = "Overall") {
  const players = await getAllPlayers();
  const ranked = category === "Overall"
    ? players.sort(byLegacyTotal).map((player) => ({ player, ...leaderboardValues(player, category) }))
    : players
        .map((player) => ({ player, ...leaderboardValues(player, category) }))
        .sort((a, b) => b.level - a.level || b.xp - a.xp || a.player.normalized_name.localeCompare(b.player.normalized_name));
  return {
    trackedCount: players.length,
    category,
    leaderboard: ranked.slice(0, 50).map(({ player, level, xp }, index) => ({
      rank: index + 1,
      name: player.display_name,
      totalLevel: level,
      totalXp: xp,
      updatedAt: new Date(player.updated_at).toISOString(),
    })),
  };
}
