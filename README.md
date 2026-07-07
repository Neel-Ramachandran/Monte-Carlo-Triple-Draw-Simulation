# 2-7 Triple Draw Lab

A Monte Carlo draw-equity simulator for No-Limit 2-7 Triple Draw, with a
pat-vs-break comparison panel.

In 2-7 (deuce-to-seven) lowball the best hand is 7-5-4-3-2. Aces are always
high, and straights and flushes count against you. So you're chasing a clean
low with the lowest possible top card.

## Run

```
npm install
npm run dev
```

Then open the local URL it prints (usually http://localhost:5173).

## What it does

- Enter a 5-card hand (e.g. `9s 6h 4d 3c 2s`) or deal a random one
- Runs 30,000 trials drawing over three draw rounds
- Shows the final hand distribution bucketed from 7-low through Pair+
- Pat-vs-break panel: quantifies how often breaking the top card and drawing
  ends up better than, tied with, or worse than standing pat

## Known limitation

The draw heuristic keeps the lowest unique cards but does not actively dodge
straights. Fixing that means encoding real 2-7 draw logic and is the most
useful thing to extend.
