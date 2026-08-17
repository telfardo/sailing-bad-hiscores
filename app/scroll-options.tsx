const scrolls = [
  ["osrs", "1", "OSRS quest parchment", "Flat, faded and closest to the old quest interface."],
  ["classic", "2", "Classic rolled scroll", "Large parchment rolls across the top and bottom."],
  ["tattered", "3", "Tattered quest scroll", "Ripped corners and an irregular, heavily aged outline."],
  ["map", "4", "Treasure map", "Fold marks, stains and one tightly curled corner."],
  ["decree", "5", "Royal decree", "Formal vellum finished with a dark red wax seal."],
  ["dowels", "6", "Wooden dowel scroll", "Heavy wooden rods with handles at both ends."],
  ["burnt", "7", "Burnt ancient vellum", "Scorched edges surrounding a warm readable centre."],
  ["runebound", "8", "Rune-bound scroll", "Dark metal bands with a cold magical glow."],
  ["hanging", "9", "Loose hanging scroll", "Suspended from cord with a soft, uneven lower edge."],
  ["ledger", "10", "Medieval ledger", "Ruled parchment built for names, levels and XP."],
];

export default function ScrollOptions() {
  return (
    <main className="showroom-shell">
      <header className="showroom-header">
        <div>
          <span>Design workshop</span>
          <h1>Sailing Bad scroll options</h1>
          <p>All ten use RuneScape UF. Pick the parchment shape you want for the hiscores.</p>
        </div>
        <a href="/">Back to hiscores</a>
      </header>

      <div className="scroll-grid">
        {scrolls.map(([style, number, name, description]) => (
          <article className="scroll-option" key={style}>
            <div className={`scroll-preview scroll-${style}`}>
              <span className="showroom-rope rope-left" />
              <span className="showroom-rope rope-right" />
              <div className="scroll-copy">
                <small>OPTION {number}</small>
                <h2>Legacy Overall Hiscores</h2>
                <p>0 opted-in players</p>
                <div className="mini-rule" />
                <div className="mini-rank"><b>Rank</b><b>Name</b><b>Level</b><b>XP</b></div>
              </div>
              {style === "decree" && <span className="wax-seal">SB</span>}
            </div>
            <h3>{number}. {name}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
