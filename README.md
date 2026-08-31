# 2-7 Triple Draw Simulator

A Monte Carlo simulator for No-Limit 2-7 Triple Draw that I built to study
pat-vs-break spots. You give it a starting five-card hand and it runs thousands
of trials drawing against a random deck, then shows you what your hand actually
turns into and whether standing pat or breaking is the better play.

If you don't play 2-7: it's a lowball game where the best possible hand is
7-5-4-3-2. Aces are always high, and straights and flushes count against you,
so you're trying to make the lowest five unpaired cards you can.

## Running it

```
npm install
npm run dev
```

Then open the local URL it prints, usually http://localhost:5173.

## What it does

- Type in a hand like `9s 6h 4d 3c 2s` or hit "Deal random"
- Runs 30,000 trials by default (adjustable in the UI), drawing over three draw rounds like a real hand
- Shows the final hand distribution bucketed from 7-low all the way down to Pair+
- Pat-vs-break panel that keeps your made hand versus breaking the top card to
  draw one, and tells you how often breaking ends up better, tied, or worse

The point is to put an actual number on a decision that's usually just feel. If
you've got a rough made 9, is it worth breaking to a smoother draw? Run it and
see.

## How the sim works

For each trial it applies your keep decision, deals replacements off the
remaining deck, then does two more draws using a simple heuristic that keeps the
lowest unpaired cards. After three draws it scores the final hand with a 2-7
evaluator where lower is better and straights and flushes get pushed down the
rankings.

## Known limitation

The auto-draw heuristic keeps low unpaired cards but it doesn't actively avoid
drawing into straights, so the numbers are a little rougher than a real solver.
Fixing that means writing proper 2-7 draw logic, which is the next thing I'd
add.

## Built with

- React 18
- Vite
- Plain JavaScript, no other dependencies

## Author

Neel Ramachandran
