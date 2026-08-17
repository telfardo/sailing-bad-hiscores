import type { SkillSnapshot, StoredPlayer } from "./hiscores";

export const ORIGINAL_SKILLS = [
  "Attack", "Defence", "Strength", "Hitpoints", "Ranged", "Prayer", "Magic", "Cooking",
  "Woodcutting", "Fletching", "Fishing", "Firemaking", "Crafting", "Smithing", "Mining",
  "Herblore", "Agility", "Thieving", "Slayer", "Farming", "Runecrafting", "Hunter", "Construction",
] as const;

export function normalizePlayerName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function validatePlayerName(value: unknown) {
  if (typeof value !== "string") {
    return { valid: false as const, error: "A player name is required." };
  }

  const name = normalizePlayerName(value);
  if (name.length < 1 || name.length > 12 || !/^[a-zA-Z0-9 -]+$/.test(name)) {
    return {
      valid: false as const,
      error: "Player names must be 1-12 characters using only letters, numbers, spaces or hyphens.",
    };
  }

  return { valid: true as const, name };
}

function parseSkill(line: string | undefined, name: string): SkillSnapshot {
  if (!line) throw new Error(`Missing ${name} HiScores row.`);

  const values = line.split(",").slice(0, 3).map(Number);
  if (values.length !== 3 || values.some((value) => !Number.isSafeInteger(value))) {
    throw new Error(`Invalid ${name} HiScores row.`);
  }

  const [rank, level, xp] = values;
  return {
    name,
    rank,
    level: Math.max(1, level),
    xp: Math.max(0, xp),
  };
}

export function parseJagexHiscores(text: string, requestedName: string): StoredPlayer {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < ORIGINAL_SKILLS.length + 2) {
    throw new Error("Jagex returned too few HiScores rows.");
  }

  // Row 0 is Jagex's Overall value, which now includes Sailing. Deliberately ignore it.
  const skills = ORIGINAL_SKILLS.map((name, index) => parseSkill(lines[index + 1], name));
  const sailing = parseSkill(lines[ORIGINAL_SKILLS.length + 1], "Sailing");

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
