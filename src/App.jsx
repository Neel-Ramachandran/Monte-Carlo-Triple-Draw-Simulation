import React, { useState } from "react";

// =====================================================================
//  2-7 Triple Draw Lab
//  Monte Carlo draw-equity simulator with a pat-vs-break comparison.
//
//  In 2-7 (deuce-to-seven) lowball the BEST hand is 7-5-4-3-2.
//  Aces are always high (bad). Straights and flushes count AGAINST you.
//  So a "clean low" (no pair, no straight, no flush) with a low top card
//  is what you are chasing.
// =====================================================================

// ---------- card model ----------
// A card is an int 0..51.  rank = card % 13,  suit = floor(card / 13)
// rank index 0='2' ... 5='7' ... 8='T', 9='J', 10='Q', 11='K', 12='A'
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const SUITS = ["\u2660", "\u2665", "\u2666", "\u2663"]; // s h d c
const SUIT_CHARS = ["s", "h", "d", "c"];
const rankOf = (c) => c % 13;
const suitOf = (c) => Math.floor(c / 13);
const label = (c) => RANKS[rankOf(c)] + SUITS[suitOf(c)];

// ---------- 2-7 evaluator : LOWER score = BETTER hand ----------
// category (best -> worst): 0 clean low, 1 pair, 2 two pair, 3 trips,
// 4 straight, 5 flush, 6 full house, 7 quads, 8 straight flush
function evaluate(cards) {
  const ranks = cards.map(rankOf).sort((a, b) => b - a); // desc
  const suits = cards.map(suitOf);
  const isFlush = suits.every((s) => s === suits[0]);

  const cnt = {};
  ranks.forEach((r) => (cnt[r] = (cnt[r] || 0) + 1));
  const counts = Object.values(cnt).sort((a, b) => b - a);
  const distinct = Object.keys(cnt).length;

  // straight: 5 distinct ranks spanning exactly 4 (A is high only, no wheel)
  let isStraight = false;
  if (distinct === 5 && ranks[0] - ranks[4] === 4) isStraight = true;

  let cat;
  if (isFlush && isStraight) cat = 8;
  else if (counts[0] === 4) cat = 7;
  else if (counts[0] === 3 && counts[1] === 2) cat = 6;
  else if (isFlush) cat = 5;
  else if (isStraight) cat = 4;
  else if (counts[0] === 3) cat = 3;
  else if (counts[0] === 2 && counts[1] === 2) cat = 2;
  else if (counts[0] === 2) cat = 1;
  else cat = 0;

  // tiebreak inside a category: rank vector read high-to-low, lower is better
  let tb = 0;
  for (const r of ranks) tb = tb * 13 + r;

  return { cat, score: cat * 1e10 + tb, high: ranks[0], ranks };
}

// ---------- buckets for the distribution ----------
// clean lows are labelled by their top card; everything else is "Pair+"
const BUCKETS = [
  "7-low", "8-low", "9-low", "T-low",
  "J-low", "Q-low", "K-low", "A-low", "Pair+",
];
function bucketOf(ev) {
  if (ev.cat > 0) return "Pair+";
  return RANKS[ev.high] + "-low";
}
// smaller = better, used to compare pat vs break outcomes
const bucketRank = (b) => BUCKETS.indexOf(b);

// ---------- draw heuristic used for draws 2 and 3 ----------
// Keep the lowest unique cards (2 through 8), discard pairs and 9+.
// KNOWN LIMITATION: this does not dodge straights. Improving it means
// encoding real 2-7 logic and is the most instructive thing to extend.
function autoKeep(cards) {
  const seen = new Set();
  const keep = [];
  const asc = [...cards].sort((a, b) => rankOf(a) - rankOf(b));
  for (const c of asc) {
    const r = rankOf(c);
    if (!seen.has(r) && r <= 6) {
      seen.add(r);
      keep.push(c);
    }
  }
  return keep;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// simulate ONE hand: apply the first-draw keep mask, then draws 2 and 3
function simulateTrial(startCards, keepMask) {
  const deck = [];
  for (let c = 0; c < 52; c++) if (!startCards.includes(c)) deck.push(c);
  shuffle(deck);

  let hand = startCards.filter((_, i) => keepMask[i]);
  while (hand.length < 5) hand.push(deck.pop());

  for (let d = 0; d < 2; d++) {
    const keep = autoKeep(hand);
    if (keep.length === 5) break; // pat, stop drawing
    hand = keep.slice();
    while (hand.length < 5) hand.push(deck.pop());
  }
  return evaluate(hand);
}

function runMonteCarlo(startCards, keepMask, trials) {
  const tally = {};
  BUCKETS.forEach((b) => (tally[b] = 0));
  for (let t = 0; t < trials; t++) {
    tally[bucketOf(simulateTrial(startCards, keepMask))]++;
  }
  return tally;
}

// ---------- parse text like "9s 6h 4d 3c 2s" into 5 cards ----------
function parseHand(text) {
  const toks = text.trim().split(/\s+/);
  if (toks.length !== 5) return null;
  const cards = [];
  for (const t of toks) {
    if (t.length !== 2) return null;
    const r = RANKS.indexOf(t[0].toUpperCase());
    const s = SUIT_CHARS.indexOf(t[1].toLowerCase());
    if (r < 0 || s < 0) return null;
    const c = s * 13 + r;
    if (cards.includes(c)) return null; // duplicate
    cards.push(c);
  }
  return cards;
}

const COLORS = { s: "#e0e0e0", h: "#ff5b6a", d: "#5b9bff", c: "#3ddc84" };

export default function App() {
  const [text, setText] = useState("9s 6h 4d 3c 2s");
  const [trials, setTrials] = useState(30000);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  function run() {
    const cards = parseHand(text);
    if (!cards) {
      setError("Enter 5 distinct cards, e.g. 9s 6h 4d 3c 2s");
      setResult(null);
      return;
    }
    setError("");

    // sort so the highest card is last (that is the one break discards)
    const sorted = [...cards].sort((a, b) => rankOf(a) - rankOf(b));

    // PAT: keep all 5 (deterministic, no draw)
    const patEv = evaluate(sorted);
    const patBucket = bucketOf(patEv);

    // BREAK: discard the single highest card, draw one
    const breakMask = sorted.map((_, i) => i !== sorted.length - 1);
    const breakTally = runMonteCarlo(sorted, breakMask, trials);

    // how often does breaking beat / tie / lose to standing pat?
    let better = 0, same = 0, worse = 0;
    const patQ = bucketRank(patBucket);
    for (const b of BUCKETS) {
      const q = bucketRank(b);
      if (q < patQ) better += breakTally[b];
      else if (q === patQ) same += breakTally[b];
      else worse += breakTally[b];
    }

    setResult({
      cards: sorted,
      patBucket,
      breakTally,
      pct: {
        better: (100 * better / trials),
        same: (100 * same / trials),
        worse: (100 * worse / trials),
      },
    });
  }

  function dealRandom() {
    const deck = shuffle([...Array(52).keys()]).slice(0, 5);
    setText(deck.map((c) => RANKS[rankOf(c)] + SUIT_CHARS[suitOf(c)]).join(" "));
  }

  const maxCount = result
    ? Math.max(...BUCKETS.map((b) => result.breakTally[b]))
    : 1;

  return (
    <div style={S.page}>
      <div style={S.shell}>
        <h1 style={S.h1}>2-7 Triple Draw Lab</h1>
        <p style={S.sub}>
          Monte Carlo draw equity + pat-vs-break. Best hand is 7-5-4-3-2;
          straights and flushes hurt.
        </p>

        <div style={S.card}>
          <div style={S.row}>
            <input
              style={S.input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="9s 6h 4d 3c 2s"
            />
            <button style={S.btnGhost} onClick={dealRandom}>Deal random</button>
            <button style={S.btn} onClick={run}>Run</button>
          </div>
          <div style={S.rowSmall}>
            <label style={S.label}>Trials</label>
            <input
              type="number"
              style={S.num}
              value={trials}
              min={1000}
              step={1000}
              onChange={(e) => setTrials(Math.max(1000, +e.target.value || 1000))}
            />
            <div style={S.cardsPreview}>
              {(parseHand(text) || []).map((c, i) => (
                <span key={i} style={{ ...S.pip, color: COLORS[SUIT_CHARS[suitOf(c)]] }}>
                  {label(c)}
                </span>
              ))}
            </div>
          </div>
          {error && <div style={S.err}>{error}</div>}
        </div>

        {result && (
          <>
            <div style={S.card}>
              <div style={S.secTitle}>Pat vs break</div>
              <p style={S.pText}>
                Stand pat and you hold a <b>{result.patBucket}</b> every time.
                Break the top card and draw one, over {trials.toLocaleString()} trials:
              </p>
              <div style={S.pvb}>
                <Stat label="Better than pat" val={result.pct.better} color="#3ddc84" />
                <Stat label="Ties pat" val={result.pct.same} color="#5b9bff" />
                <Stat label="Worse than pat" val={result.pct.worse} color="#ff5b6a" />
              </div>
              <p style={S.hint}>
                Rule of thumb: break only when "better" clearly outweighs "worse"
                for the low you are chasing.
              </p>
            </div>

            <div style={S.card}>
              <div style={S.secTitle}>Break outcome distribution</div>
              {BUCKETS.map((b) => {
                const n = result.breakTally[b];
                const pct = (100 * n / trials).toFixed(1);
                return (
                  <div key={b} style={S.barRow}>
                    <span style={S.barLabel}>{b}</span>
                    <div style={S.barTrack}>
                      <div
                        style={{
                          ...S.barFill,
                          width: `${(n / maxCount) * 100}%`,
                          background: b === "Pair+" ? "#ff5b6a" : "#5b9bff",
                        }}
                      />
                    </div>
                    <span style={S.barPct}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, val, color }) {
  return (
    <div style={S.stat}>
      <div style={{ ...S.statVal, color }}>{val.toFixed(1)}%</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", background: "#0f1419", color: "#e0e0e0",
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
    padding: "2rem 1rem" },
  shell: { maxWidth: 720, margin: "0 auto" },
  h1: { fontSize: "1.4rem", fontWeight: 700, marginBottom: 4 },
  sub: { fontSize: ".82rem", color: "#7a8aa0", marginBottom: "1.2rem" },
  card: { background: "#1a2230", border: "1px solid #2a3a4a", borderRadius: 12,
    padding: "1.1rem", marginBottom: "1rem" },
  row: { display: "flex", gap: 8, flexWrap: "wrap" },
  rowSmall: { display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" },
  input: { flex: 1, minWidth: 180, background: "#0f1419", border: "1px solid #2a3a4a",
    color: "#e0e0e0", borderRadius: 8, padding: "9px 12px", fontSize: ".9rem" },
  num: { width: 90, background: "#0f1419", border: "1px solid #2a3a4a",
    color: "#e0e0e0", borderRadius: 8, padding: "7px 10px", fontSize: ".85rem" },
  btn: { background: "#2563eb", color: "#fff", border: "none", borderRadius: 8,
    padding: "9px 18px", fontWeight: 600, cursor: "pointer", fontSize: ".9rem" },
  btnGhost: { background: "transparent", color: "#a0b0c0", border: "1px solid #3a4a5a",
    borderRadius: 8, padding: "9px 14px", cursor: "pointer", fontSize: ".85rem" },
  label: { fontSize: ".8rem", color: "#7a8aa0" },
  cardsPreview: { display: "flex", gap: 8, marginLeft: "auto" },
  pip: { fontSize: "1rem", fontWeight: 700 },
  err: { color: "#ff5b6a", fontSize: ".8rem", marginTop: 8 },
  secTitle: { fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: ".06em", color: "#7a8aa0", marginBottom: ".7rem" },
  pText: { fontSize: ".85rem", color: "#c0cad6", marginBottom: ".9rem", lineHeight: 1.5 },
  pvb: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 },
  stat: { background: "#0f1419", borderRadius: 8, padding: "12px", textAlign: "center" },
  statVal: { fontSize: "1.5rem", fontWeight: 700 },
  statLabel: { fontSize: ".7rem", color: "#7a8aa0", marginTop: 4 },
  hint: { fontSize: ".72rem", color: "#6a7a8a", marginTop: ".8rem" },
  barRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 },
  barLabel: { width: 54, fontSize: ".78rem", color: "#a0b0c0" },
  barTrack: { flex: 1, height: 16, background: "#0f1419", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4, transition: "width .3s" },
  barPct: { width: 46, textAlign: "right", fontSize: ".76rem", color: "#7a8aa0" },
};
