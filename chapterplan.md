# Chapter Plan — Kickoff Rush "Life Journey"

This document captures the design plan for turning the 3 selectable worlds into a
**3-act "life journey"** of a footballer, reinforcing the KICKOFF theme
("the first step of every journey… and then you kick off again").

> Status: DESIGN FINALIZED. Not yet implemented. Repo freezes July 20, 2026.
> Timeline: ~2 days left — enough for BOTH the feature and the pitch video.

---

## Theme connection

The organizers explicitly allowed a literal football game ("Or, of course, an actual
football game!") but also want creativity. Framing the 3 maps as **levels of a
career** turns a literal sports game into a metaphor for a journey — the same
framing already used on the theme splash and the game-over screen.

> KICKOFF is the first step of every journey. Every player starts somewhere.
> The cards are the lessons. Your run ends not when you lose, but when you're
> sent off — and then you kick off again.

---

## FINALIZED DESIGN: Level-by-level unlocks (chosen approach)

Instead of forcing a mid-run map swap (the old "Chapter Gate" idea), progression is
**unlock-based**: the player runs the endless runner in their current level, and
unlocking the next map is a **celebration that does not interrupt play**.

### The three levels (career order)

| Level | Map | Meaning | Unlock |
|-------|-----|---------|--------|
| 1 | **Beach** | The Roots — where it started, barefoot on sand | Available from start |
| 2 | **Indoor** | The Grind — hard years, fighting to stay in | Unlock by reaching threshold in Level 1 |
| 3 | **World Cup** | The Prime — he made it, bright crowds + floodlights | Unlock by reaching threshold in Level 2 |

Story arc: **Beach (origin) → Indoor (struggle) → World Cup (triumph)**.
Together they form the footballer's life journey.

### In-game flow

1. Player runs the endless runner in their **currently selected unlocked level**.
2. When they cross the unlock threshold (score/distance), show a **toast / banner**
   mid-run — player **keeps running**, no interruption, no bad feel:
   > ⚽ **LEVEL 2 UNLOCKED!**
   > You did so well — kick off your career and step into The Grind.
3. On **death or quit**, the World/Select screen now shows the next level **unlocked**
   (previously locked maps become selectable).
4. Next run, player can pick the newly unlocked map (or replay earlier ones).

### Why unlock-based (not the gate idea)
- **Zero mid-run disruption** — runner stays endless, player never feels punished.
- **Persistent progression** — unlocks survive death (localStorage), feels like real growth.
- **Motivational toasts** ("kick off your career") directly reinforce the KICKOFF theme.
- **Low code, low risk** — threshold check + toast + unlock flag + select-screen lock state.

---

## (ARCHIVED) Old "Chapter Gate" idea — superseded

Earlier plan: pause the run at a gate when player hits a distance milestone AND scores
a Goal, then prompt "Press SHIFT to advance." Rejected in favor of unlock-based
progression because the gate interrupted the endless-run flow. Kept here for record.

---

## Death = restart the journey

On a RED CARD (game over), the run ends. Unlocked levels **persist** (localStorage) —
the journey's progress is kept, only the current run restarts. This keeps the
"kick off again" metaphor true: every run is a new beginning, but the career grows.

---

## Difficulty curve per level

| Level | Speed scaling | Obstacle density | Card rarity (green) | Keeper/rival aggression |
|-------|---------------|-----------------|---------------------|--------------------------|
| 1 Beach | baseline | normal | normal | normal |
| 2 Indoor | +10–15% | higher | lower | cuts across lanes more |
| 3 World Cup | +20–25% | highest | lowest | fastest, widest |

Keep the curve gentle — the runner is normally endless; levels add stage-based ramp,
not a difficulty cliff.

---

## Unlock thresholds (to decide at implementation)
- Level 2 (Indoor) unlocks at, e.g., **1500 pts OR 800 m** in Beach.
- Level 3 (World Cup) unlocks at a similar threshold in Indoor.
- Persist with `localStorage` key e.g. `kickoff_unlocked_level` (1–3).

---

## Select-screen lock state
- Locked maps show 🔒 + "Reach X to unlock".
- Unlocked maps are selectable like today.
- Show a small "NEW!" badge on a freshly unlocked map.

---

## Implementation checklist (rough)

- [ ] Define level order array: `['beach','indoor','worldcup']`.
- [ ] Track `unlockedLevel` in localStorage (default 1).
- [ ] Per-run: check threshold; on cross, fire unlock toast + raise `unlockedLevel`.
- [ ] World/Select screen: render lock state from `unlockedLevel`.
- [ ] Motivational toast text per unlock ("kick off your career…").
- [ ] Per-level difficulty constants (speed mult, spawn gap, card weight).
- [ ] On game over: do NOT reset `unlockedLevel` (persist career progress).

---

## Expected judging impact

| Criteria | Weight | Without feature | With feature (clean) |
|----------|--------|-----------------|----------------------|
| Theme (KICKOFF) | 25% | 23 | 24 |
| Gameplay | 25% | 23 | 23 |
| Design | 25% | 22 | 23 |
| Visual & Audio | 15% | 14 | 14 |
| Video (Pitch) | 10% | 10 | 10 |
| **Total** | **100%** | **92** | **94** |

The level system is a **safe, high-ROI addition**: it strengthens the two
weakest-scoring pillars (theme + design) for relatively little code. It is NOT a
#1 guarantee on its own — the **pitch video** remains the highest-leverage item
(the only score carried to the onsite round).

---

## Priority with ~2 days left (repo freeze July 20)

1. **Pitch video** (highest leverage — only score carried onsite)
2. **Level-unlock feature** (theme + design boost)
3. itch page theme text (already done)

Do not sacrifice the video for the feature. Video > feature for ranking.
