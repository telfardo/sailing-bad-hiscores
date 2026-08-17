import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Skill = { name: string; level: number; xp: number; rank: number };
type PlayerResult = {
  name: string;
  legacyRank: number;
  totalLevel: number;
  totalXp: number;
  sailingLevel: number;
  sailingXp: number;
  skills: Skill[];
  updatedAt: string;
  cached: boolean;
  tracked: boolean;
};
type LeaderboardRow = { rank: number; name: string; totalLevel: number; totalXp: number; updatedAt: string };

const number = new Intl.NumberFormat("en-US");
const pluginUrl = "https://github.com/YonwiPlugins/sailing-bad";
const pluginOwnerUrl = "https://github.com/YonwiPlugins";
const pluginSuggestionsUrl = "https://github.com/YonwiPlugins/sailing-bad/issues";
const categories = [
  "Overall", "Attack", "Defence", "Strength", "Hitpoints", "Ranged", "Prayer", "Magic",
  "Cooking", "Woodcutting", "Fletching", "Fishing", "Firemaking", "Crafting", "Smithing",
  "Mining", "Herblore", "Agility", "Thieving", "Slayer", "Farming", "Runecraft", "Hunter", "Construction",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [player, setPlayer] = useState<PlayerResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [trackedCount, setTrackedCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("Overall");
  const [loading, setLoading] = useState(false);
  const [boardLoading, setBoardLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLeaderboard(category: string) {
    setBoardLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/hiscores?category=${encodeURIComponent(category)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The record book could not be opened just now.");
      setLeaderboard(data.leaderboard ?? []);
      setTrackedCount(data.trackedCount ?? 0);
      setSelectedCategory(category);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The record book could not be opened just now.");
    } finally {
      setBoardLoading(false);
    }
  }

  useEffect(() => {
    const requestedPlayer = new URLSearchParams(window.location.search).get("player")?.trim() ?? "";
    const endpoint = requestedPlayer
      ? `/api/hiscores?player=${encodeURIComponent(requestedPlayer)}&category=Overall`
      : "/api/hiscores?category=Overall";

    fetch(endpoint)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "The record book could not be opened just now.");
        return data;
      })
      .then((data) => {
        setLeaderboard(data.leaderboard ?? []);
        setTrackedCount(data.trackedCount ?? 0);
        if (data.player) {
          setPlayer(data.player);
          setQuery(data.player.name);
          window.setTimeout(() => document.getElementById("player-result")?.scrollIntoView({ behavior: "smooth", block: "center" }), 40);
        }
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "The record book could not be opened just now."))
      .finally(() => setBoardLoading(false));
  }, []);

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = query.trim();
    if (!name) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/hiscores?player=${encodeURIComponent(name)}&category=${encodeURIComponent(selectedCategory)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "That player could not be found.");
      setPlayer(data.player);
      setLeaderboard(data.leaderboard ?? []);
      setTrackedCount(data.trackedCount ?? 0);
      window.setTimeout(() => document.getElementById("player-result")?.scrollIntoView({ behavior: "smooth", block: "center" }), 40);
    } catch (reason) {
      setPlayer(null);
      setError(reason instanceof Error ? reason.message : "That lookup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell" id="top">
      <div className="site-frame">
        <div className="login-strip">Unofficial Old School community project</div>

        <header className="stone-header">
          <div className="title-plaque">
            <strong>Sailing Bad HiScores</strong>
            <span>Old School totals without Sailing</span>
          </div>
        </header>

        <nav className="tab-nav" aria-label="Main navigation">
          <a className="active" href="#hiscores">HiScores</a>
          <a href="#lookup">Player Search</a>
          <a href="#about">About</a>
          <a href={pluginUrl} target="_blank" rel="noreferrer">Get Sailing Bad Plugin</a>
        </nav>

        <div className="hiscores-layout">
          <aside className="category-panel" aria-label="Skill categories">
            <div className="category-banner">Category</div>
            <div className="category-list">
              {categories.map((category) => (
                <button
                  className={selectedCategory === category ? "selected" : ""}
                  key={category}
                  type="button"
                  aria-pressed={selectedCategory === category}
                  onClick={() => void loadLeaderboard(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </aside>

          <section className="parchment" id="hiscores">
            <div className="parchment-heading">
              <h1>{selectedCategory === "Overall" ? "Legacy Overall HiScores" : `${selectedCategory} HiScores`}</h1>
              <p>{number.format(trackedCount)} opted-in player{trackedCount === 1 ? "" : "s"}</p>
            </div>

            <form className="player-search" id="lookup" onSubmit={lookup}>
              <label htmlFor="player">Search by name</label>
              <div>
                <input
                  id="player"
                  name="player"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  maxLength={12}
                  autoComplete="off"
                  placeholder="Player name"
                />
                <button type="submit" disabled={loading}>{loading ? "Checking…" : "Search"}</button>
              </div>
              <small>Looking someone up does not add them to the board.</small>
            </form>

            {error && <p className="error-message" role="alert">{error}</p>}

            {player && (
              <section className="player-result" id="player-result" aria-live="polite">
                <div className="result-title">
                  <h2>{player.name}</h2>
                  <span>{player.tracked ? "Tracked" : "Projected"} rank #{number.format(player.legacyRank)}</span>
                </div>
                <dl>
                  <div><dt>Level</dt><dd>{number.format(player.totalLevel)}</dd></div>
                  <div><dt>XP</dt><dd>{number.format(player.totalXp)}</dd></div>
                  <div><dt>Sailing removed</dt><dd>{number.format(player.sailingLevel)}</dd></div>
                </dl>
                <p>
                  {player.tracked
                    ? "Opted in through the Sailing Bad Plugin."
                    : <>Not tracked. <a className="text-link" href={pluginUrl} target="_blank" rel="noreferrer">Get the Sailing Bad Plugin</a> to join the board.</>}
                </p>
                <details>
                  <summary>View skill breakdown</summary>
                  <div className="skill-grid">
                    {player.skills.map((skill) => (
                      <div key={skill.name}><span>{skill.name}</span><strong>{skill.level}</strong><small>{number.format(skill.xp)} XP</small></div>
                    ))}
                  </div>
                </details>
              </section>
            )}

            <div className="table-wrap">
              <table aria-label={`${selectedCategory} HiScores`}>
                <thead><tr><th aria-label="Opted in" /><th>Rank</th><th>Name</th><th>Level</th><th>XP</th></tr></thead>
                <tbody>
                  {leaderboard.map((row) => (
                    <tr key={row.name}>
                      <td className="trophy" aria-label="Opted in">♜</td>
                      <td>{number.format(row.rank)}</td>
                      <td>{row.name}</td>
                      <td>{number.format(row.totalLevel)}</td>
                      <td>{number.format(row.totalXp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!boardLoading && leaderboard.length === 0 && (
                <div className="empty-board">
                  <strong>No players tracked yet.</strong>
                  <span>Opt in through the Sailing Bad Plugin to claim rank 1.</span>
                  <a className="plugin-cta" href={pluginUrl} target="_blank" rel="noreferrer">Get Sailing Bad Plugin</a>
                </div>
              )}
              {boardLoading && <div className="empty-board"><span>Loading HiScores…</span></div>}
            </div>
          </section>
        </div>

        <section className="about-box" id="about">
          <h2>About Sailing Bad HiScores</h2>
          <p>Stats come from the public Jagex HiScores. The Sailing Bad RuneLite Plugin only submits a player after they explicitly enable the HiScores option.</p>
          <a className="about-plugin-link" href={pluginUrl} target="_blank" rel="noreferrer">View the Sailing Bad RuneLite Plugin</a>
        </section>

        <footer>
          <strong>Sailing Bad HiScores</strong>
          <p>Unofficial fan site. Not affiliated with or endorsed by Jagex Ltd.</p>
          <p className="plugin-credit">
            <a href={pluginUrl} target="_blank" rel="noreferrer">Sailing Bad RuneLite Plugin</a>
            {" by "}
            <a href={pluginOwnerUrl} target="_blank" rel="noreferrer">YonwiPlugins</a>
            <span aria-hidden="true"> · </span>
            <a href={pluginSuggestionsUrl} target="_blank" rel="noreferrer">Suggestions welcome</a>
          </p>
          <p className="site-credit">Built by <a href="https://telfardo.com" target="_blank" rel="noreferrer">Telfardo</a></p>
        </footer>
      </div>
    </main>
  );
}
